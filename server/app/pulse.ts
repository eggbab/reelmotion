import { createHash } from 'node:crypto'
import { PULSE_EVENTS } from '../../src/pulseEvents'
import type { PulseEvent } from '../../src/pulseEvents'
import type { Db } from './db'

/**
 * 운영자가 고장과 쓰임을 보는 두 가지(관리자 화면). 누가 했는지는 남기지 않는다 — IP·계정·브라우저 원문을 넣을 칸이 없다.
 *  - 쓰임 숫자: 서울 날짜 · 사건 이름 · 브라우저 종류(크롬-윈도우 같은 이름)마다 횟수만. 400일 뒤 지운다.
 *  - 브라우저 오류: 편집기가 이용자 브라우저에서 고장 났을 때의 오류 글·쪽 주소(물음표 뒤는 지운다)·브라우저 종류·판 번호.
 *    같은 오류는 한 줄로 모아 횟수만 올린다. 30일 뒤 지우고, 가짓수는 200개까지.
 * 접속 기록을 남기지 않는 설계라 이것이 없으면 「아이폰에서 내보내기가 다 실패한다」 같은 일을 알 길이 없다.
 * 개인정보처리방침에 적었다 — 모으는 것을 바꾸면 src/site/legal/privacy.ts 도 함께 고친다.
 */
export const ERROR_DAYS = 30
export const MAX_ERROR_GROUPS = 200
export const PULSE_DAYS = 400
export const PULSE_PER_MINUTE = 120
export const ERRORS_PER_MINUTE = 10
export const MAX_ERROR_BODY = 16 * 1024

const SEOUL = 9 * 60 * 60 * 1000
const DAY = 86_400_000

/** 서울 날짜(YYYY-MM-DD) */
export function dayKey(now: number): string {
  return new Date(now + SEOUL).toISOString().slice(0, 10)
}

/**
 * 브라우저 종류를 「이름-기기」로 어림한다(chrome-windows · safari-ios · inapp-android …). 원래 글(User-Agent)은 저장하지 않는다.
 * 검색 로봇·자동 프로그램은 bot 으로 따로 세어, 사람의 숫자에 섞이지 않게 한다.
 */
export function agentOf(userAgent: string | undefined): string {
  const ua = userAgent ?? ''
  if (!ua) return 'unknown'
  if (/bot\b|bot\/|crawl|spider|slurp|headless|lighthouse|pagespeed|facebookexternalhit|preview|monitor|uptime/i.test(ua)) return 'bot'
  const os = /iPhone|iPad|iPod/.test(ua)
    ? 'ios'
    : /Android/.test(ua)
      ? 'android'
      : /Windows/.test(ua)
        ? 'windows'
        : /Macintosh|Mac OS X/.test(ua)
          ? 'mac'
          : /CrOS/.test(ua)
            ? 'chromeos'
            : /Linux|X11/.test(ua)
              ? 'linux'
              : 'other'
  // 앱 안 브라우저(카카오톡·인스타그램·네이버·LINE)는 이름에 Chrome·Safari 가 함께 있어 먼저 본다
  const family = /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|FB_IAB|Line\/|; wv\)/i.test(ua)
    ? 'inapp'
    : /Edg(?:e|A|iOS)?\//.test(ua)
      ? 'edge'
      : /SamsungBrowser\//.test(ua)
        ? 'samsung'
        : /OPR\/|Opera/.test(ua)
          ? 'opera'
          : /Whale\//.test(ua)
            ? 'whale'
            : /Firefox\/|FxiOS\//.test(ua)
              ? 'firefox'
              : /Chrome\/|CriOS\//.test(ua)
                ? 'chrome'
                : /Safari\//.test(ua) && /Version\//.test(ua)
                  ? 'safari'
                  : 'other'
  return `${family}-${os}`
}

export type ClientError = { message: string; stack: string; page: string; version: string }

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

/** 화면이 보낸 오류를 저장할 꼴로: 길이를 자르고, 쪽 주소에서 물음표·샵 뒤(작업 번호·대본이 들어 있을 수 있다)를 지운다. 쓸 수 없으면 null */
export function cleanError(body: unknown): ClientError | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null
  const raw = body as Record<string, unknown>
  const message = text(raw.message, 300)
  if (!message) return null
  return { message, stack: text(raw.stack, 1500), page: text(raw.page, 2000).split(/[?#]/)[0].slice(0, 120), version: text(raw.version, 24) }
}

export type PulseSummary = {
  days: string[]
  events: { event: PulseEvent; counts: number[]; total: number }[]
  exports: { agent: string; started: number; done: number; failed: number; unsupported: number }[]
  bots: number
}
export type ErrorGroup = ClientError & { fingerprint: string; agent: string; count: number; firstAt: number; lastAt: number }

export function createPulse({ db, now }: { db: Db; now: () => number }) {
  const bump = db.prepare('insert into pulse_daily (day, event, agent, count) values (?, ?, ?, 1) on conflict (day, event, agent) do update set count = count + 1')
  let swept = ''

  return {
    /** 사건 하나를 센다 */
    count(event: PulseEvent, agent: string): void {
      const day = dayKey(now())
      bump.run(day, event, agent)
      if (day !== swept) {
        swept = day
        db.prepare('delete from pulse_daily where day < ?').run(dayKey(now() - PULSE_DAYS * DAY))
      }
    },

    /** 브라우저 오류 하나를 적는다(같은 오류는 한 줄에 모은다) */
    reportError(error: ClientError, agent: string): void {
      const at = now()
      const frame = error.stack.split('\n').find((line) => /^\s*at\s|@/.test(line)) ?? ''
      const fingerprint = createHash('sha256').update(`${error.message}\n${frame.trim()}\n${error.version}`).digest('hex').slice(0, 32)
      db.prepare('delete from client_errors where last_at <= ?').run(at - ERROR_DAYS * DAY)
      db.prepare(
        `insert into client_errors (fingerprint, message, stack, page, agent, version, count, first_at, last_at) values (?, ?, ?, ?, ?, ?, 1, ?, ?)
         on conflict (fingerprint) do update set count = count + 1, last_at = excluded.last_at, agent = excluded.agent, page = excluded.page`,
      ).run(fingerprint, error.message, error.stack, error.page, agent, error.version, at, at)
      db.prepare('delete from client_errors where fingerprint in (select fingerprint from client_errors order by last_at desc, fingerprint limit -1 offset ?)').run(MAX_ERROR_GROUPS)
    },

    /** 최근 며칠의 날짜별 횟수(자동 프로그램 제외)와 브라우저별 내보내기 */
    summary(days = 7): PulseSummary {
      const today = now()
      const keys = Array.from({ length: days }, (_, i) => dayKey(today - (days - 1 - i) * DAY))
      const rows = db.prepare('select day, event, agent, count from pulse_daily where day >= ? and day <= ?').all(keys[0], keys[keys.length - 1]) as { day: string; event: string; agent: string; count: number }[]
      const people = rows.filter((row) => row.agent !== 'bot')
      const events = PULSE_EVENTS.map((event) => {
        const counts = keys.map((day) => people.filter((row) => row.event === event && row.day === day).reduce((sum, row) => sum + row.count, 0))
        return { event, counts, total: counts.reduce((sum, value) => sum + value, 0) }
      })
      const byAgent = new Map<string, { agent: string; started: number; done: number; failed: number; unsupported: number }>()
      for (const row of people) {
        const key = row.event === 'export_started' ? 'started' : row.event === 'export_done' ? 'done' : row.event === 'export_failed' ? 'failed' : row.event === 'export_unsupported' ? 'unsupported' : null
        if (!key) continue
        const entry = byAgent.get(row.agent) ?? { agent: row.agent, started: 0, done: 0, failed: 0, unsupported: 0 }
        entry[key] += row.count
        byAgent.set(row.agent, entry)
      }
      return {
        days: keys,
        events,
        exports: [...byAgent.values()].sort((a, b) => a.agent.localeCompare(b.agent)),
        bots: rows.filter((row) => row.agent === 'bot').reduce((sum, row) => sum + row.count, 0),
      }
    },

    errors(limit = 50): ErrorGroup[] {
      const rows = db.prepare('select * from client_errors order by last_at desc, fingerprint limit ?').all(limit) as (ClientError & { fingerprint: string; agent: string; count: number; first_at: number; last_at: number })[]
      return rows.map(({ first_at, last_at, ...row }) => ({ ...row, firstAt: first_at, lastAt: last_at }))
    },

    clearErrors(): void {
      db.exec('delete from client_errors')
    },
  }
}

export type Pulse = ReturnType<typeof createPulse>
