import { describe, expect, it } from 'vitest'
import { createApp } from './app'
import { openDb } from './db'
import { ERROR_DAYS, MAX_ERROR_GROUPS, agentOf, createPulse, dayKey } from './pulse'

const ORIGIN = 'https://reelmotion.test'
const CHROME_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
const SAFARI_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
const DAY = 86_400_000

describe('브라우저 종류 어림(이름과 기기만 — 원래 글은 저장하지 않는다)', () => {
  it('크롬·사파리·파이어폭스·엣지·삼성 인터넷을 기기와 함께', () => {
    expect(agentOf(CHROME_WIN)).toBe('chrome-windows')
    expect(agentOf(SAFARI_IOS)).toBe('safari-ios')
    expect(agentOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15')).toBe('safari-mac')
    expect(agentOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0')).toBe('firefox-windows')
    expect(agentOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0')).toBe('edge-windows')
    expect(agentOf('Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36')).toBe('samsung-android')
    expect(agentOf('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36')).toBe('chrome-android')
    // 아이폰의 크롬은 속이 사파리와 같다 — 그래도 이름은 사람이 쓰는 대로
    expect(agentOf('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/142.0.0.0 Mobile/15E148 Safari/604.1')).toBe('chrome-ios')
  })

  it('앱 안 브라우저(카카오톡·인스타그램·네이버·LINE)와 자동 프로그램을 가른다', () => {
    expect(agentOf(`${SAFARI_IOS} KAKAOTALK 11.2.0`)).toBe('inapp-ios')
    expect(agentOf('Mozilla/5.0 (Linux; Android 14; SM-S921N; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/142.0.0.0 Mobile Safari/537.36 Instagram 350.0')).toBe('inapp-android')
    expect(agentOf('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe('bot')
    expect(agentOf('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/142.0.0.0 Safari/537.36')).toBe('bot')
    expect(agentOf(undefined)).toBe('unknown')
    expect(agentOf('curl/8.5.0')).toBe('other-other')
    // 리눅스 컴퓨터와 크롬북(학교에서 흔하다)은 따로
    expect(agentOf('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36')).toBe('chrome-linux')
    expect(agentOf('Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36')).toBe('chrome-chromeos')
  })
})

describe('날짜는 서울 시간으로', () => {
  it('UTC 15시가 서울의 다음 날 0시', () => {
    expect(dayKey(Date.UTC(2026, 10, 15, 14, 59))).toBe('2026-11-15')
    expect(dayKey(Date.UTC(2026, 10, 15, 15, 0))).toBe('2026-11-16')
  })
})

function setup() {
  const db = openDb(':memory:')
  let now = Date.UTC(2026, 10, 15, 3)
  const app = createApp({ db, google: null, config: { siteOrigin: ORIGIN, secureCookies: true, devLogin: true }, now: () => now, admin: { emails: ['boss@example.com'], backupDir: null, alerts: { email: null, mail: false, test: null } } })
  const send = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    app.request(path, { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN, 'user-agent': CHROME_WIN, ...headers }, body: JSON.stringify(body) })
  const login = async (email: string) => {
    const response = await app.request('/api/auth/dev', { method: 'POST', headers: { origin: ORIGIN, 'content-type': 'application/json' }, body: JSON.stringify({ email, name: 'x' }) })
    return response.headers.get('set-cookie')!.split(';')[0]
  }
  const admin = async (path: string, init: RequestInit = {}) => app.request(path, { ...init, headers: { ...(init.headers as Record<string, string> | undefined), cookie: await login('boss@example.com'), origin: ORIGIN } })
  return { db, app, send, login, admin, advance: (ms: number) => (now += ms), pulse: createPulse({ db, now: () => now }) }
}

describe('쓰임 숫자(/api/pulse)', () => {
  it('정해 둔 이름만, 날짜·이름·브라우저 종류마다 횟수로 센다 — 누가 했는지는 어디에도 없다', async () => {
    const { db, send } = setup()
    expect((await send('/api/pulse', { event: 'editor_open' })).status).toBe(204)
    expect((await send('/api/pulse', { event: 'editor_open' })).status).toBe(204)
    expect((await send('/api/pulse', { event: 'export_done' }, { 'user-agent': SAFARI_IOS, 'x-forwarded-for': '203.0.113.5' })).status).toBe(204)
    expect(db.prepare('select day, event, agent, count from pulse_daily order by event').all()).toEqual([
      { day: '2026-11-15', event: 'editor_open', agent: 'chrome-windows', count: 2 },
      { day: '2026-11-15', event: 'export_done', agent: 'safari-ios', count: 1 },
    ])
    // 표에는 날짜·이름·브라우저 종류·횟수 칸뿐이다(IP·계정·브라우저 원문을 넣을 칸이 없다)
    expect((db.prepare("select name from pragma_table_info('pulse_daily')").all() as { name: string }[]).map((row) => row.name)).toEqual(['day', 'event', 'agent', 'count'])
  })

  it('모르는 이름·서버만 세는 이름·틀린 꼴은 받지 않는다', async () => {
    const { db, send } = setup()
    for (const body of [{ event: 'page_view' }, { event: 'chat_edit' }, { event: 42 }, {}, 'editor_open']) expect((await send('/api/pulse', body)).status, JSON.stringify(body)).toBe(400)
    expect(db.prepare('select count(*) as n from pulse_daily').get()).toEqual({ n: 0 })
  })

  it('다른 사이트에서 온 요청은 받지 않고, 한 곳에서 몰아 보내면 막는다', async () => {
    const { send, advance } = setup()
    expect((await send('/api/pulse', { event: 'editor_open' }, { origin: 'https://evil.example' })).status).toBe(403)
    let limited = 0
    for (let i = 0; i < 130; i++) if ((await send('/api/pulse', { event: 'graphics_made' }, { 'x-forwarded-for': '203.0.113.9' })).status === 429) limited += 1
    expect(limited).toBe(10)
    // 다른 곳은 그대로, 1분 뒤에는 다시
    expect((await send('/api/pulse', { event: 'graphics_made' }, { 'x-forwarded-for': '203.0.113.10' })).status).toBe(204)
    advance(61_000)
    expect((await send('/api/pulse', { event: 'graphics_made' }, { 'x-forwarded-for': '203.0.113.9' })).status).toBe(204)
  })

  it('관리자만 본다: 최근 7일의 날짜별 횟수(자동 프로그램은 따로), 브라우저별 내보내기', async () => {
    const { app, send, admin, advance, login } = setup()
    await send('/api/pulse', { event: 'editor_open' })
    await send('/api/pulse', { event: 'export_started' }, { 'user-agent': SAFARI_IOS })
    await send('/api/pulse', { event: 'export_failed' }, { 'user-agent': SAFARI_IOS })
    await send('/api/pulse', { event: 'editor_open' }, { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' })
    advance(DAY)
    await send('/api/pulse', { event: 'editor_open' })
    await send('/api/pulse', { event: 'export_started' })
    await send('/api/pulse', { event: 'export_done' })
    expect((await app.request('/api/admin/pulse')).status).toBe(401)
    expect((await app.request('/api/admin/pulse', { headers: { cookie: await login('member@example.com') } })).status).toBe(403)
    const body = (await (await admin('/api/admin/pulse')).json()) as { days: string[]; events: { event: string; counts: number[]; total: number }[]; exports: Record<string, unknown>[]; bots: number }
    expect(body.days).toHaveLength(7)
    expect(body.days.slice(-2)).toEqual(['2026-11-15', '2026-11-16'])
    const row = (event: string) => body.events.find((item) => item.event === event)!
    expect(row('editor_open')).toMatchObject({ counts: [0, 0, 0, 0, 0, 1, 1], total: 2 })
    expect(row('export_failed')).toMatchObject({ total: 1 })
    expect(row('video_added')).toMatchObject({ total: 0 })
    expect(body.bots).toBe(1)
    expect(body.exports).toEqual([
      { agent: 'chrome-windows', started: 1, done: 1, failed: 0, unsupported: 0 },
      { agent: 'safari-ios', started: 1, done: 0, failed: 1, unsupported: 0 },
    ])
  })

  it('서버가 스스로 세는 것: 말로 고치기·커넥터', () => {
    const { db, pulse } = setup()
    pulse.count('connector_link', 'connector')
    pulse.count('chat_edit', 'chrome-windows')
    expect(db.prepare('select event, agent, count from pulse_daily order by event').all()).toEqual([
      { event: 'chat_edit', agent: 'chrome-windows', count: 1 },
      { event: 'connector_link', agent: 'connector', count: 1 },
    ])
  })
})

describe('브라우저 오류 모으기(/api/client-error)', () => {
  it('같은 오류는 한 줄로 모아 횟수와 마지막 시각을 적는다. 주소의 물음표 뒤(작업 번호·대본)는 지운다', async () => {
    const { send, admin, advance } = setup()
    const error = { message: "Cannot read properties of undefined (reading 'start')", stack: 'TypeError: x\n    at draw (https://reelmotion.test/assets/index-abc.js:12:34)\n    at tick (https://reelmotion.test/assets/index-abc.js:99:1)', page: '/ko/app?project=3f2a&script=secret', version: 'b35e9a56' }
    expect((await send('/api/client-error', error)).status).toBe(204)
    advance(5000)
    expect((await send('/api/client-error', error, { 'user-agent': SAFARI_IOS })).status).toBe(204)
    expect((await send('/api/client-error', { message: 'Another', page: '/app' })).status).toBe(204)
    const { errors } = (await (await admin('/api/admin/errors')).json()) as { errors: Record<string, unknown>[] }
    expect(errors).toHaveLength(2)
    const first = errors.find((item) => String(item.message).startsWith('Cannot read'))!
    expect(first).toMatchObject({ count: 2, page: '/ko/app', version: 'b35e9a56', agent: 'safari-ios', lastAt: Date.UTC(2026, 10, 15, 3) + 5000, firstAt: Date.UTC(2026, 10, 15, 3) })
    expect(String(first.stack)).toContain('at draw')
    expect(JSON.stringify(errors)).not.toContain('secret')
  })

  it('긴 글은 자르고, 빈 글·틀린 꼴·큰 본문은 받지 않는다', async () => {
    const { db, send } = setup()
    expect((await send('/api/client-error', { message: 'x'.repeat(5000), stack: 'y'.repeat(3000), page: `/app/${'z'.repeat(500)}`, version: 'v'.repeat(100) })).status).toBe(204)
    const row = db.prepare('select message, stack, page, version from client_errors').get() as Record<string, string>
    expect([row.message.length, row.stack.length, row.page.length, row.version.length]).toEqual([300, 1500, 120, 24])
    for (const body of [{ message: '   ' }, { message: 5 }, {}, []]) expect((await send('/api/client-error', body)).status).toBe(400)
    expect((await send('/api/client-error', { message: 'big', stack: 'y'.repeat(20_000) })).status).toBe(413)
  })

  it('한 곳에서 1분에 10개까지만, 30일이 지난 것은 지우고, 가짓수는 정한 수까지만 둔다', async () => {
    const { db, send, advance, pulse } = setup()
    let limited = 0
    for (let i = 0; i < 12; i++) if ((await send('/api/client-error', { message: `flood ${i}` }, { 'x-forwarded-for': '203.0.113.7' })).status === 429) limited += 1
    expect(limited).toBe(2)
    advance((ERROR_DAYS + 1) * DAY)
    await send('/api/client-error', { message: 'fresh' })
    expect((db.prepare('select message from client_errors').all() as { message: string }[]).map((row) => row.message)).toEqual(['fresh'])
    for (let i = 0; i < MAX_ERROR_GROUPS + 5; i++) {
      advance(1000)
      pulse.reportError({ message: `kind ${i}`, stack: '', page: '/app', version: '' }, 'chrome-windows')
    }
    expect(db.prepare('select count(*) as n from client_errors').get()).toEqual({ n: MAX_ERROR_GROUPS })
    // 가장 오래된 것부터 빠진다
    expect(db.prepare("select count(*) as n from client_errors where message = 'fresh'").get()).toEqual({ n: 0 })
  })

  it('관리자가 본 뒤 비울 수 있다(관리자만)', async () => {
    const { app, send, admin, login } = setup()
    await send('/api/client-error', { message: 'boom' })
    expect((await app.request('/api/admin/errors', { method: 'DELETE', headers: { origin: ORIGIN, cookie: await login('member@example.com') } })).status).toBe(403)
    expect((await admin('/api/admin/errors', { method: 'DELETE' })).status).toBe(200)
    expect(((await (await admin('/api/admin/errors')).json()) as { errors: unknown[] }).errors).toEqual([])
  })
})
