import { readdirSync, statfsSync } from 'node:fs'
import { join } from 'node:path'
import nodemailer from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'
import type { AssistModel } from './assist'
import type { SmtpConfig } from './config'

/**
 * 장애 알림: 앱 서버가 5분마다 다른 부분(웹·받아쓰기·말로 고치기 AI·저장 공간·자동 백업)을 확인하고,
 * 문제가 15분(세 번 잇달아) 넘게 이어지면 운영자에게 메일을 보낸다(받는 곳 기본 vmelabs@outlook.com — config.ts).
 * 풀리면 「다시 정상」, 계속되면 6시간마다 다시. 메일 설정(SMTP)이 없으면 앱 기록에만 남긴다.
 * 메일에는 이용자 정보를 넣지 않는다(부분 이름·상태·시각만). PC 나 인터넷이 통째로 멈추면 이 서버도 알릴 수 없으므로
 * 바깥 감시 서비스가 /api/status 를 보게 한다(docs/operations.md 「장애 알림」).
 */
export type CheckId = 'web' | 'asr' | 'assist' | 'disk' | 'backup'
export type CheckResult = { id: CheckId; ok: boolean; detail: string }
export type Mailer = { send(subject: string, text: string): Promise<void> }
export type WatchStatus = { checkedAt: number | null; checks: (CheckResult & { since: number })[] }

export const CHECK_LABELS: Record<CheckId, string> = { web: '웹사이트', asr: '받아쓰기 서버', assist: '말로 고치기 AI', disk: '저장 공간', backup: '자동 백업' }

const FAILURES_BEFORE_ALERT = 3
const REMIND_MS = 6 * 60 * 60 * 1000
const SEOUL = 9 * 60 * 60 * 1000

function seoulTime(ms: number): string {
  const date = new Date(ms + SEOUL)
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
}

function seoulDay(ms: number): string {
  return new Date(ms + SEOUL).toISOString().slice(0, 10)
}

type Entry = CheckResult & { since: number; failures: number; alerted: boolean; lastMail: number }

export function createWatchdog(options: { run: () => Promise<CheckResult[]>; mailer: Mailer | null; now: () => number; log: (line: string) => void; siteOrigin: string | null }) {
  const entries = new Map<CheckId, Entry>()
  let checkedAt: number | null = null

  const notify = async (subject: string, text: string): Promise<boolean> => {
    if (!options.mailer) {
      options.log(`ALERT ${subject}`)
      return true
    }
    try {
      await options.mailer.send(subject, text)
      return true
    } catch (error) {
      options.log(`alert mail failed: ${error instanceof Error ? error.message : String(error)}`)
      return false
    }
  }

  const body = (lead: string, items: Entry[], now: number) =>
    [
      `${lead}(${seoulDay(now)} ${seoulTime(now)} 서울).`,
      '',
      ...items.map((item) => `- ${CHECK_LABELS[item.id]}: ${item.detail} (${seoulTime(item.since)}부터)`),
      '',
      '할 일은 운영 안내(docs/operations.md)의 「장애 알림」을 보세요.',
      ...(options.siteOrigin ? [`관리자 화면: ${options.siteOrigin}/ko/admin`] : []),
    ].join('\n')

  return {
    async tick(): Promise<void> {
      const now = options.now()
      const results = await options.run()
      const problems: Entry[] = []
      const reminders: Entry[] = []
      const recovered: Entry[] = []
      const seen = new Set<CheckId>()
      for (const result of results) {
        seen.add(result.id)
        const previous = entries.get(result.id)
        if (result.ok) {
          const next: Entry = { ...result, since: previous && previous.ok ? previous.since : now, failures: 0, alerted: false, lastMail: 0 }
          if (previous?.alerted) recovered.push(next)
          entries.set(result.id, next)
          continue
        }
        const failures = (previous && !previous.ok ? previous.failures : 0) + 1
        const next: Entry = { ...result, since: previous && !previous.ok ? previous.since : now, failures, alerted: previous?.alerted ?? false, lastMail: previous?.lastMail ?? 0 }
        entries.set(result.id, next)
        if (!next.alerted && failures >= FAILURES_BEFORE_ALERT) problems.push(next)
        else if (next.alerted && now - next.lastMail >= REMIND_MS) reminders.push(next)
      }
      for (const id of entries.keys()) if (!seen.has(id)) entries.delete(id)
      checkedAt = now

      const names = (items: Entry[]) => items.map((item) => CHECK_LABELS[item.id]).join(', ')
      if (problems.length > 0 && (await notify(`[ReelMotion] 문제가 생겼어요: ${names(problems)}`, body('ReelMotion 서버에 문제가 생겼어요', problems, now)))) {
        for (const item of problems) Object.assign(item, { alerted: true, lastMail: now })
      }
      if (reminders.length > 0 && (await notify(`[ReelMotion] 아직 문제가 있어요: ${names(reminders)}`, body('ReelMotion 서버의 문제가 아직 이어지고 있어요', reminders, now)))) {
        for (const item of reminders) item.lastMail = now
      }
      if (recovered.length > 0) await notify(`[ReelMotion] 다시 정상이에요: ${names(recovered)}`, body('ReelMotion 서버의 문제가 풀렸어요', recovered, now))
    },
    status(): WatchStatus {
      return { checkedAt, checks: [...entries.values()].map(({ id, ok, detail, since }) => ({ id, ok, detail, since })) }
    },
  }
}

const BACKUP_NAME = /^reelmotion-(\d{4})(\d{2})(\d{2})\.db$/

/** 확인 항목. 설정하지 않은 부분(주소가 없는 것)은 빼고 본다. */
export function createChecks(deps: {
  webUrl: string | null
  asrUrl: string | null
  assist: AssistModel | null
  dataDir: string
  backupDays: number
  diskMinBytes: number
  now: () => number
  fetchImpl?: typeof fetch
}): () => Promise<CheckResult[]> {
  const fetchImpl = deps.fetchImpl ?? fetch
  const http = async (id: CheckId, url: string, loading = false): Promise<CheckResult> => {
    try {
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(5000) })
      return { id, ok: response.ok, detail: `HTTP ${response.status}${!response.ok && loading && response.status === 503 ? ' (model loading?)' : ''}` }
    } catch (error) {
      const reason = error instanceof Error ? ((error as Error & { cause?: { code?: string } }).cause?.code ?? error.message) : String(error)
      return { id, ok: false, detail: `no answer (${reason})` }
    }
  }
  return async () => {
    const results: CheckResult[] = []
    if (deps.webUrl) results.push(await http('web', `${deps.webUrl.replace(/\/+$/, '')}/`))
    if (deps.asrUrl) results.push(await http('asr', `${deps.asrUrl.replace(/\/+$/, '')}/api/asr/health`, true))
    if (deps.assist) {
      const ready = await deps.assist.ready().catch(() => false)
      results.push({ id: 'assist', ok: ready, detail: ready ? 'ready' : 'not ready' })
    }
    try {
      const stats = statfsSync(deps.dataDir)
      const free = stats.bavail * stats.bsize
      results.push({ id: 'disk', ok: free >= deps.diskMinBytes, detail: `${(free / 1e9).toFixed(1)} GB free` })
    } catch (error) {
      results.push({ id: 'disk', ok: false, detail: `cannot read (${error instanceof Error ? error.message : String(error)})` })
    }
    if (deps.backupDays > 0) {
      let latest: string | null = null
      try {
        for (const name of readdirSync(join(deps.dataDir, 'backups'))) {
          const match = BACKUP_NAME.exec(name)
          const day = match ? `${match[1]}-${match[2]}-${match[3]}` : null
          if (day && (latest === null || day > latest)) latest = day
        }
      } catch {
        latest = null
      }
      const now = deps.now()
      const fresh = latest !== null && latest >= seoulDay(now - 24 * 60 * 60 * 1000)
      results.push({ id: 'backup', ok: fresh, detail: latest ? `last backup ${latest}` : 'no backup yet' })
    }
    return results
  }
}

/** 설정(config.ts)을 메일 연결 방법으로: 465 는 처음부터 TLS, 나머지는 STARTTLS 를 꼭 쓴다(비밀번호를 그냥 보내지 않게). */
export function smtpTransport(smtp: SmtpConfig): SMTPTransport.Options {
  const secure = smtp.port === 465
  return { host: smtp.host, port: smtp.port, secure, requireTLS: !secure, ...(smtp.user ? { auth: { user: smtp.user, pass: smtp.pass ?? '' } } : {}) }
}

/** 메일 보내기(SMTP). 보내는 계정의 비밀번호는 deploy/.env 에만 둔다(config.ts). */
export function createSmtpMailer(transport: SMTPTransport.Options, from: string, to: string): Mailer {
  const transporter = nodemailer.createTransport(transport)
  return {
    async send(subject, text) {
      await transporter.sendMail({ from, to, subject, text, textEncoding: 'base64' })
    },
  }
}
