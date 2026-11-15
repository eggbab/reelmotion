import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createChecks, createSmtpMailer, createWatchdog, smtpTransport } from './watch'
import type { CheckResult, Mailer } from './watch'

const MIN = 60_000
const T0 = Date.UTC(2026, 10, 15, 9) // 18:00 서울

function fakeMailer() {
  const sent: { subject: string; text: string }[] = []
  let failing = false
  const mailer: Mailer = {
    async send(subject, text) {
      if (failing) throw new Error('smtp down')
      sent.push({ subject, text })
    },
  }
  return { mailer, sent, fail: (value: boolean) => (failing = value) }
}

function setup(mailer: Mailer | null = fakeMailer().mailer) {
  let now = T0
  let results: CheckResult[] = []
  const logs: string[] = []
  const watchdog = createWatchdog({ run: async () => results, mailer, now: () => now, log: (line) => logs.push(line), siteOrigin: 'https://reelmotion.test' })
  const tick = async (next: CheckResult[], minutes = 5) => {
    results = next
    now += minutes * MIN
    await watchdog.tick()
  }
  return { watchdog, tick, logs }
}

const ok = (id: CheckResult['id']): CheckResult => ({ id, ok: true, detail: 'ok' })
const bad = (id: CheckResult['id'], detail = 'no answer'): CheckResult => ({ id, ok: false, detail })

describe('장애 알림', () => {
  it('세 번 잇달아(15분) 문제여야 알리고, 여러 문제는 메일 하나로', async () => {
    const mail = fakeMailer()
    const { tick } = setup(mail.mailer)
    await tick([ok('web'), bad('asr'), ok('disk')])
    await tick([ok('web'), bad('asr'), bad('disk', '1.2 GB free')])
    expect(mail.sent).toHaveLength(0)
    await tick([ok('web'), bad('asr'), bad('disk', '1.2 GB free')])
    expect(mail.sent).toHaveLength(1)
    expect(mail.sent[0].subject).toBe('[ReelMotion] 문제가 생겼어요: 받아쓰기 서버')
    expect(mail.sent[0].text).toContain('받아쓰기 서버: no answer (18:05부터)')
    expect(mail.sent[0].text).toContain('https://reelmotion.test/ko/admin')
    // 저장 공간은 두 번째라 아직
    await tick([ok('web'), bad('asr'), bad('disk', '1.2 GB free')])
    expect(mail.sent).toHaveLength(2)
    expect(mail.sent[1].subject).toBe('[ReelMotion] 문제가 생겼어요: 저장 공간')
  })

  it('한두 번 잠깐 문제였다가 돌아오면 알리지 않는다', async () => {
    const mail = fakeMailer()
    const { tick } = setup(mail.mailer)
    await tick([bad('assist')])
    await tick([bad('assist')])
    await tick([ok('assist')])
    await tick([bad('assist')])
    expect(mail.sent).toHaveLength(0)
  })

  it('계속 문제면 6시간마다 다시 알리고, 풀리면 「다시 정상」', async () => {
    const mail = fakeMailer()
    const { tick, watchdog } = setup(mail.mailer)
    for (let i = 0; i < 3; i++) await tick([bad('backup', 'last backup 2026-11-13')])
    expect(mail.sent.map((item) => item.subject)).toEqual(['[ReelMotion] 문제가 생겼어요: 자동 백업'])
    await tick([bad('backup')], 5 * 60)
    expect(mail.sent).toHaveLength(1)
    await tick([bad('backup')], 60)
    expect(mail.sent.map((item) => item.subject).at(-1)).toBe('[ReelMotion] 아직 문제가 있어요: 자동 백업')
    await tick([ok('backup')])
    expect(mail.sent.map((item) => item.subject).at(-1)).toBe('[ReelMotion] 다시 정상이에요: 자동 백업')
    expect(watchdog.status().checks).toEqual([expect.objectContaining({ id: 'backup', ok: true })])
  })

  it('메일을 못 보내면 다음 확인 때 다시 보낸다(서버는 멈추지 않음)', async () => {
    const mail = fakeMailer()
    const { tick, logs } = setup(mail.mailer)
    mail.fail(true)
    for (let i = 0; i < 3; i++) await tick([bad('web')])
    expect(mail.sent).toHaveLength(0)
    expect(logs.some((line) => line.includes('alert mail failed'))).toBe(true)
    mail.fail(false)
    await tick([bad('web')])
    expect(mail.sent.map((item) => item.subject)).toEqual(['[ReelMotion] 문제가 생겼어요: 웹사이트'])
  })

  it('메일 설정이 없으면 기록에만 남긴다(바뀔 때 한 번)', async () => {
    const { tick, logs } = setup(null)
    for (let i = 0; i < 5; i++) await tick([bad('asr')])
    await tick([ok('asr')])
    expect(logs.filter((line) => line.startsWith('ALERT'))).toEqual(['ALERT [ReelMotion] 문제가 생겼어요: 받아쓰기 서버', 'ALERT [ReelMotion] 다시 정상이에요: 받아쓰기 서버'])
  })

  it('상태: 처음 확인 전에는 비어 있고, 확인한 시각과 항목마다 언제부터인지', async () => {
    const { tick, watchdog } = setup()
    expect(watchdog.status()).toEqual({ checkedAt: null, checks: [] })
    await tick([ok('web'), bad('asr', 'loading')])
    expect(watchdog.status()).toEqual({
      checkedAt: T0 + 5 * MIN,
      checks: [
        { id: 'web', ok: true, detail: 'ok', since: T0 + 5 * MIN },
        { id: 'asr', ok: false, detail: 'loading', since: T0 + 5 * MIN },
      ],
    })
  })
})

describe('확인 항목', () => {
  const NOW = Date.UTC(2026, 10, 15, 1) // 2026-11-15 10:00 서울
  const fetchFrom = (answers: Record<string, number | Error>) =>
    (async (url: string | URL) => {
      const answer = answers[String(url)]
      if (answer instanceof Error || answer === undefined) throw answer ?? new Error('ECONNREFUSED')
      return new Response('{}', { status: answer })
    }) as typeof fetch

  it('웹·받아쓰기·AI 는 응답으로, 설정하지 않은 것은 빼고 본다', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'rm-check-'))
    const run = createChecks({
      webUrl: 'http://web',
      asrUrl: 'http://asr:8008',
      assist: { ready: async () => false } as never,
      dataDir,
      backupDays: 0,
      diskMinBytes: 0,
      now: () => NOW,
      fetchImpl: fetchFrom({ 'http://web/': 200, 'http://asr:8008/api/asr/health': 503 }),
    })
    expect(await run()).toEqual([
      { id: 'web', ok: true, detail: 'HTTP 200' },
      { id: 'asr', ok: false, detail: 'HTTP 503 (model loading?)' },
      { id: 'assist', ok: false, detail: 'not ready' },
      { id: 'disk', ok: true, detail: expect.stringMatching(/^\d+(\.\d)? GB free$/) },
    ])
    const none = createChecks({ webUrl: null, asrUrl: null, assist: null, dataDir, backupDays: 0, diskMinBytes: 0, now: () => NOW, fetchImpl: fetchFrom({}) })
    expect((await none()).map((item) => item.id)).toEqual(['disk'])
  })

  it('저장 공간이 기준보다 적으면 문제', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'rm-check-'))
    const run = createChecks({ webUrl: null, asrUrl: null, assist: null, dataDir, backupDays: 0, diskMinBytes: Number.MAX_SAFE_INTEGER, now: () => NOW, fetchImpl: fetchFrom({}) })
    expect((await run())[0]).toMatchObject({ id: 'disk', ok: false })
  })

  it('자동 백업은 오늘이나 어제(서울) 것이 있어야 정상', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'rm-check-'))
    const run = createChecks({ webUrl: null, asrUrl: null, assist: null, dataDir, backupDays: 7, diskMinBytes: 0, now: () => NOW, fetchImpl: fetchFrom({}) })
    expect((await run())[1]).toEqual({ id: 'backup', ok: false, detail: 'no backup yet' })
    mkdirSync(join(dataDir, 'backups'))
    writeFileSync(join(dataDir, 'backups', 'reelmotion-20261113.db'), 'x')
    expect((await run())[1]).toEqual({ id: 'backup', ok: false, detail: 'last backup 2026-11-13' })
    writeFileSync(join(dataDir, 'backups', 'reelmotion-20261114.db'), 'x')
    expect((await run())[1]).toEqual({ id: 'backup', ok: true, detail: 'last backup 2026-11-14' })
  })
})

describe('메일 보내기(SMTP)', () => {
  it('587 은 STARTTLS 를 꼭 쓰고(비밀번호를 그냥 보내지 않게), 465 는 처음부터 TLS', () => {
    expect(smtpTransport({ host: 'smtp.gmail.com', port: 587, user: 'me@gmail.com', pass: 'app', from: 'me@gmail.com' })).toEqual({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: 'me@gmail.com', pass: 'app' },
    })
    expect(smtpTransport({ host: 'smtp.example.com', port: 465, user: null, pass: null, from: 'a@example.com' })).toEqual({ host: 'smtp.example.com', port: 465, secure: true, requireTLS: false })
  })

  it('받는 곳으로 제목과 본문을 보낸다', async () => {
    // 아주 작은 가짜 메일 서버: 받은 대화를 그대로 모은다.
    const lines: string[] = []
    const server = createServer((socket) => {
      let data = false
      socket.write('220 test ESMTP\r\n')
      let buffer = ''
      socket.on('data', (chunk) => {
        buffer += chunk.toString('utf8')
        let at: number
        while ((at = buffer.indexOf('\r\n')) >= 0) {
          const line = buffer.slice(0, at)
          buffer = buffer.slice(at + 2)
          lines.push(line)
          if (data) {
            if (line === '.') {
              data = false
              socket.write('250 queued\r\n')
            }
          } else if (/^(EHLO|HELO)/i.test(line)) socket.write('250 test\r\n')
          else if (/^DATA/i.test(line)) {
            data = true
            socket.write('354 go\r\n')
          } else if (/^QUIT/i.test(line)) socket.end('221 bye\r\n')
          else socket.write('250 ok\r\n')
        }
      })
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address() as AddressInfo
    const mailer = createSmtpMailer({ host: '127.0.0.1', port, secure: false, ignoreTLS: true }, 'alerts@example.com', 'vmelabs@outlook.com')
    await mailer.send('[ReelMotion] 시험 메일', '알림이 잘 옵니다. ASCII-MARKER-7')
    server.close()
    const raw = lines.join('\n')
    expect(raw).toContain('MAIL FROM:<alerts@example.com>')
    expect(raw).toContain('RCPT TO:<vmelabs@outlook.com>')
    // 본문(base64)은 머리글 다음 빈 줄부터 끝 표시(.) 앞까지
    const afterHeaders = raw.slice(raw.indexOf('\n\n') + 2)
    const body = Buffer.from(afterHeaders.slice(0, afterHeaders.indexOf('\n.')).replace(/\s/g, ''), 'base64').toString('utf8')
    expect(body).toContain('알림이 잘 옵니다. ASCII-MARKER-7')
    // 제목은 한글이라 =?UTF-8?B?…?= 나 =?UTF-8?Q?…?= 로 바뀌어 있다(여러 줄일 수 있음).
    const header = /^Subject: (.*(?:\n[ \t].*)*)/m.exec(raw)?.[1] ?? ''
    const words = [...header.matchAll(/=\?UTF-8\?([BQ])\?([^?]*)\?=/gi)]
    const decode = ([, kind, text]: RegExpMatchArray) =>
      kind.toUpperCase() === 'B'
        ? Buffer.from(text, 'base64')
        : Buffer.from(text.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16))), 'latin1')
    const subject = words.length > 0 ? Buffer.concat(words.map(decode)).toString('utf8') : header
    expect(subject).toBe('[ReelMotion] 시험 메일')
  })
})
