import { existsSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { restoreDatabase, runAdmin } from './admin'
import { createApp } from './app'
import type { BillingProvider } from './billing'
import { openDb } from './db'

const ORIGIN = 'https://reelmotion.test'
const NOW = Date.UTC(2026, 10, 15, 3)

function setup(enforcePlans: boolean, billing: BillingProvider | null = null) {
  const db = openDb(':memory:')
  const app = createApp({ db, google: null, config: { siteOrigin: ORIGIN, secureCookies: true, devLogin: true, enforcePlans }, now: () => NOW, billing })
  const post = (path: string, body: unknown, cookie?: string) =>
    app.request(path, { method: 'POST', headers: { origin: ORIGIN, ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) })
  const login = async (email = 'mina@example.com') => (await post('/api/auth/dev', { email })).headers.get('set-cookie')!.split(';')[0]
  return { db, app, post, login }
}

describe('내보내기 허락과 사용량', () => {
  it('베타(한도 꺼짐): 로그인 없이도 되고 워터마크 없음, 로그인했으면 다 만든 것만 센다', async () => {
    const { app, post, login } = setup(false)
    expect(await (await post('/api/usage/export', { duration: 999 })).json()).toEqual({ ok: true, watermark: false, remaining: null })
    expect((await post('/api/usage/export/done', {})).status).toBe(200)
    const cookie = await login()
    // 묻기만 하고(취소·실패) 끝내지 않은 것은 세지 않는다.
    await post('/api/usage/export', { duration: 5 }, cookie)
    await post('/api/usage/export/done', {}, cookie)
    await post('/api/usage/export/done', {}, cookie)
    const me = (await (await app.request('/api/me', { headers: { cookie } })).json()) as { usage: { month: string; exports: number } }
    expect(me.usage).toEqual({ month: '2026-11', exports: 2 })
  })

  it('한도 켜짐: 로그인해야 하고, 무료는 1분·한 달 3번·워터마크', async () => {
    const { post, login } = setup(true)
    expect((await post('/api/usage/export', { duration: 10 })).status).toBe(401)
    const cookie = await login()
    expect((await post('/api/usage/export', { duration: 75 }, cookie)).status).toBe(403)
    // 물어보기만 해서는 줄지 않는다.
    expect(await (await post('/api/usage/export', { duration: 30 }, cookie)).json()).toEqual({ ok: true, watermark: true, remaining: 2 })
    for (const remaining of [2, 1, 0]) {
      expect(await (await post('/api/usage/export', { duration: 30 }, cookie)).json()).toEqual({ ok: true, watermark: true, remaining })
      expect(await (await post('/api/usage/export/done', {}, cookie)).json()).toEqual({ ok: true, exports: 3 - remaining })
    }
    const over = await post('/api/usage/export', { duration: 30 }, cookie)
    expect(over.status).toBe(403)
    expect(await over.json()).toEqual({ error: 'limit' })
  })

  it('관리 명령으로 준 요금제가 바로 적용되고, 기간이 끝나면 무료로', async () => {
    const { db, post, login } = setup(true)
    const cookie = await login()
    expect(runAdmin(db, ['set-plan', 'mina@example.com', 'creator', '30'], NOW)).toBe('mina@example.com: creator until 2026-12-15')
    expect(await (await post('/api/usage/export', { duration: 240 }, cookie)).json()).toEqual({ ok: true, watermark: false, remaining: 29 })
    expect(runAdmin(db, ['set-plan', 'nobody@example.com', 'pro'], NOW)).toBe('no user: nobody@example.com')
    expect(runAdmin(db, ['set-plan', 'mina@example.com', 'gold'], NOW)).toMatch(/plan must be one of/)
  })

  it('길이가 숫자가 아니면 400', async () => {
    expect((await setup(false).post('/api/usage/export', { duration: 'long' })).status).toBe(400)
  })
})

describe('결제 자리', () => {
  it('결제사를 붙이기 전에는 「준비 중」(503), 알림 주소는 없음(404)', async () => {
    const { app, post, login } = setup(false)
    const cookie = await login()
    expect((await post('/api/billing/checkout', { plan: 'creator' }, cookie)).status).toBe(503)
    expect((await post('/api/billing/checkout', { plan: 'free' }, cookie)).status).toBe(400)
    expect((await app.request('/api/billing/webhook', { method: 'POST', body: '{}' })).status).toBe(404)
    expect(((await (await app.request('/api/me')).json()) as { billing: unknown }).billing).toEqual({ enforced: false, connected: false, provider: null })
  })

  it('결제사를 붙이면 결제 화면 주소를 주고, 알림(다른 곳에서 옴)으로 요금제를 바꾼다', async () => {
    const fake: BillingProvider = {
      name: 'TestPay',
      startCheckout: async ({ user, plan, returnUrl }) => ({ url: `https://pay.example/checkout?u=${user.id}&p=${plan}&r=${encodeURIComponent(returnUrl)}` }),
      handleWebhook: async (request, setPlan) => {
        const body = (await request.json()) as { userId: string; plan: 'creator' }
        setPlan(body.userId, body.plan, NOW + 30 * 86_400_000)
        return Response.json({ ok: true })
      },
    }
    const { db, app, post, login } = setup(true, fake)
    const cookie = await login()
    const userId = (db.prepare('select id from users').get() as { id: string }).id
    const checkout = (await (await post('/api/billing/checkout', { plan: 'creator', returnUrl: '/ko/account' }, cookie)).json()) as { url: string }
    expect(checkout.url).toContain('p=creator')
    expect(decodeURIComponent(checkout.url)).toContain('https://reelmotion.test/ko/account')
    const hook = await app.request('/api/billing/webhook', { method: 'POST', headers: { origin: 'https://pay.example' }, body: JSON.stringify({ userId, plan: 'creator' }) })
    expect(hook.status).toBe(200)
    const me = (await (await app.request('/api/me', { headers: { cookie } })).json()) as { user: { plan: string }; billing: { connected: boolean } }
    expect(me.user.plan).toBe('creator')
    expect(me.billing.connected).toBe(true)
  })
})

describe('관리 명령', () => {
  it('사람 목록·사용량·백업', async () => {
    const { db, post, login } = setup(false)
    const cookie = await login()
    await post('/api/usage/export/done', {}, cookie)
    expect(runAdmin(db, ['users'], NOW)).toMatch(/^users: 1\nmina@example.com\tfree/)
    expect(runAdmin(db, ['usage', 'mina@example.com'], NOW)).toContain('2026-11\t1 exports')
    const file = join(mkdtempSync(join(tmpdir(), 'rm-')), 'backup.db')
    expect(runAdmin(db, ['backup', file], NOW)).toBe(`backed up to ${file}`)
    expect(existsSync(file)).toBe(true)
    expect(openDb(file).prepare('select count(*) as n from users').get()).toEqual({ n: 1 })
    expect(runAdmin(db, ['backup', file], NOW)).toBe(`already exists: ${file}`)
    expect(runAdmin(db, ['nope'], NOW)).toMatch(/^commands:/)
  })
})

describe('되살리기', () => {
  const addUser = (db: ReturnType<typeof openDb>, email: string) =>
    db.prepare('insert into users (id, google_sub, email, name, created_at) values (?, null, ?, ?, ?)').run(email, email, email, NOW)
  const users = (path: string) => {
    const db = openDb(path)
    const emails = (db.prepare('select email from users order by email').all() as { email: string }[]).map((row) => row.email)
    db.close()
    return emails
  }

  it('백업을 검사하고, 지금 저장소는 지우지 않고 옆에 남긴 채 백업으로 바꾼다', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rm-restore-'))
    const live = join(dir, 'reelmotion.db')
    const db = openDb(live)
    addUser(db, 'before@example.com')
    expect(runAdmin(db, ['backup', join(dir, 'backup.db')], NOW)).toMatch(/^backed up to/)
    addUser(db, 'after@example.com')
    db.close()

    expect(restoreDatabase(dir, join(dir, 'backup.db'), NOW)).toMatch(/^restored from .*backup\.db \(previous database kept as .*reelmotion\.db\.before-restore-20261115T030000\)$/)
    expect(users(live)).toEqual(['before@example.com'])
    // 바꾸기 전 저장소는 그대로 남아 있다(되돌릴 수 있게).
    expect(users(join(dir, 'reelmotion.db.before-restore-20261115T030000'))).toEqual(['after@example.com', 'before@example.com'])
  })

  it('없거나 망가졌거나 다른 파일이면 손대지 않는다', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rm-restore-'))
    const live = join(dir, 'reelmotion.db')
    const db = openDb(live)
    addUser(db, 'keep@example.com')
    db.close()
    writeFileSync(join(dir, 'junk.db'), 'not a database at all')
    const other = openDb(join(dir, 'other.db'))
    other.exec('drop table users')
    other.close()

    expect(restoreDatabase(dir, undefined, NOW)).toMatch(/^usage: restore/)
    expect(restoreDatabase(dir, join(dir, 'missing.db'), NOW)).toMatch(/^no such file/)
    expect(restoreDatabase(dir, join(dir, 'junk.db'), NOW)).toMatch(/^cannot use .*junk\.db/)
    expect(restoreDatabase(dir, join(dir, 'other.db'), NOW)).toMatch(/^not a ReelMotion backup/)
    expect(users(live)).toEqual(['keep@example.com'])
    expect(readdirSync(dir).some((name) => name.includes('before-restore'))).toBe(false)
  })
})
