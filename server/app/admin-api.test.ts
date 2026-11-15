import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createApp } from './app'
import type { AdminDeps } from './app'
import { openDb } from './db'

const ORIGIN = 'https://reelmotion.test'
const NOW = Date.UTC(2026, 10, 15, 3)

function setup(alerts: Partial<AdminDeps['alerts']> = {}) {
  const db = openDb(':memory:')
  const backupDir = mkdtempSync(join(tmpdir(), 'rm-admin-'))
  writeFileSync(join(backupDir, 'reelmotion-20261114.db'), 'older')
  writeFileSync(join(backupDir, 'reelmotion-20261115.db'), 'backup-bytes')
  writeFileSync(join(backupDir, 'notes.txt'), 'not a backup')
  const sent: string[] = []
  let now = NOW
  const app = createApp({
    db,
    google: null,
    config: { siteOrigin: ORIGIN, secureCookies: true, devLogin: true, enforcePlans: false },
    now: () => now,
    watch: { status: () => ({ checkedAt: NOW, checks: [{ id: 'disk', ok: true, detail: '50.0 GB free', since: NOW }] }) },
    admin: {
      emails: ['boss@example.com'],
      backupDir,
      alerts: { email: 'vmelabs@outlook.com', mail: true, test: async () => void sent.push('test'), ...alerts },
    },
  })
  const request = (path: string, init: RequestInit & { cookie?: string } = {}) => {
    const headers = new Headers(init.headers)
    if (init.cookie) headers.set('cookie', init.cookie)
    if (init.method && init.method !== 'GET') headers.set('origin', ORIGIN)
    return app.request(path, { ...init, headers })
  }
  const login = async (email: string) => {
    now += 60_000
    const response = await request('/api/auth/dev', { method: 'POST', body: JSON.stringify({ email, name: email.split('@')[0] }) })
    return response.headers.get('set-cookie')!.split(';')[0]
  }
  return { db, request, login, sent }
}

describe('관리자 화면 API', () => {
  it('로그인하지 않았으면 401, 관리자가 아니면 403 — 모든 관리자 주소에서', async () => {
    const { request, login } = setup()
    expect((await request('/api/admin/overview')).status).toBe(401)
    const user = await login('mina@example.com')
    for (const [path, method] of [
      ['/api/admin/overview', 'GET'],
      ['/api/admin/users?q=mina', 'GET'],
      ['/api/admin/backups/reelmotion-20261115.db', 'GET'],
      ['/api/admin/plan', 'POST'],
      ['/api/admin/test-alert', 'POST'],
    ]) {
      expect((await request(path, { method, cookie: user, body: method === 'POST' ? '{}' : undefined })).status, path).toBe(403)
    }
    expect(((await (await request('/api/me', { cookie: user })).json()) as { admin: boolean }).admin).toBe(false)
  })

  it('관리자(메일 대소문자 무관)는 상태·숫자·최근 가입·백업·알림 설정을 본다', async () => {
    const { request, login } = setup()
    const mina = await login('mina@example.com')
    await login('jun@example.com')
    const boss = await login('Boss@Example.com')
    await request('/api/usage/export/done', { method: 'POST', cookie: mina, body: '{}' })
    await request('/api/usage/export/done', { method: 'POST', cookie: mina, body: '{}' })
    expect(((await (await request('/api/me', { cookie: boss })).json()) as { admin: boolean }).admin).toBe(true)
    const overview = (await (await request('/api/admin/overview', { cookie: boss })).json()) as Record<string, unknown>
    expect(overview.users).toEqual({ total: 3, thisMonth: 3 })
    expect(overview.plans).toEqual({ free: 3, creator: 0, pro: 0 })
    expect(overview.exports).toEqual({ month: '2026-11', total: 2 })
    expect((overview.recent as { email: string; exports: number }[]).map((user) => [user.email, user.exports])).toEqual([
      ['boss@example.com', 0],
      ['jun@example.com', 0],
      ['mina@example.com', 2],
    ])
    expect(overview.backups).toEqual([
      { name: 'reelmotion-20261115.db', bytes: 12 },
      { name: 'reelmotion-20261114.db', bytes: 5 },
    ])
    expect(overview.alerts).toEqual({ email: 'vmelabs@outlook.com', mail: true })
    expect(overview.status).toEqual({ checkedAt: NOW, checks: [{ id: 'disk', ok: true, detail: '50.0 GB free', since: NOW }] })
    expect(overview.settings).toEqual({ enforced: false, billing: false, googleLogin: false })
  })

  it('사람 찾기와 요금제 바꾸기(관리 명령과 같은 규칙)', async () => {
    const { request, login } = setup()
    await login('mina@example.com')
    await login('minho@example.com')
    await login('jun@example.com')
    const boss = await login('boss@example.com')
    const found = (await (await request('/api/admin/users?q=MIN', { cookie: boss })).json()) as { users: { email: string; plan: string; projects: number }[] }
    expect(found.users.map((user) => user.email)).toEqual(['minho@example.com', 'mina@example.com'])
    // 찾는 말 속 % 나 _ 는 글자 그대로
    expect(((await (await request('/api/admin/users?q=%25', { cookie: boss })).json()) as { users: unknown[] }).users).toEqual([])
    const post = (body: unknown) => request('/api/admin/plan', { method: 'POST', cookie: boss, body: JSON.stringify(body) })
    const changed = await post({ email: 'mina@example.com', plan: 'creator', days: 30 })
    expect(changed.status).toBe(200)
    expect(await changed.json()).toMatchObject({ user: { email: 'mina@example.com', plan: 'creator', planUntil: expect.any(Number) } })
    expect((await post({ email: 'mina@example.com', plan: 'gold' })).status).toBe(400)
    expect((await post({ email: 'mina@example.com', plan: 'pro', days: -3 })).status).toBe(400)
    expect((await post({ email: 'nobody@example.com', plan: 'pro' })).status).toBe(404)
    const back = (await (await post({ email: 'mina@example.com', plan: 'free' })).json()) as { user: { plan: string; planUntil: number | null } }
    expect(back.user).toMatchObject({ plan: 'free', planUntil: null })
  })

  it('백업 내려받기는 백업 이름 꼴만(다른 파일·위 폴더는 404)', async () => {
    const { request, login } = setup()
    const boss = await login('boss@example.com')
    const ok = await request('/api/admin/backups/reelmotion-20261115.db', { cookie: boss })
    expect(ok.status).toBe(200)
    expect(ok.headers.get('content-disposition')).toBe('attachment; filename="reelmotion-20261115.db"')
    expect(ok.headers.get('cache-control')).toBe('no-store')
    expect(await ok.text()).toBe('backup-bytes')
    for (const name of ['notes.txt', 'reelmotion-20261116.db', '..%2Freelmotion.db', '%2E%2E', 'reelmotion-2026111.db']) {
      expect((await request(`/api/admin/backups/${name}`, { cookie: boss })).status, name).toBe(404)
    }
  })

  it('시험 메일: 보내는 계정이 있으면 보내고, 없으면 「설정 안 됨」', async () => {
    const withMail = setup()
    const boss = await withMail.login('boss@example.com')
    const sent = await withMail.request('/api/admin/test-alert', { method: 'POST', cookie: boss, body: '{}' })
    expect(sent.status).toBe(200)
    expect(withMail.sent).toEqual(['test'])

    const failing = setup({
      test: async () => {
        throw new Error('535 auth failed')
      },
    })
    const boss2 = await failing.login('boss@example.com')
    const failed = await failing.request('/api/admin/test-alert', { method: 'POST', cookie: boss2, body: '{}' })
    expect(failed.status).toBe(502)
    expect(await failed.json()).toEqual({ error: 'send_failed', message: '535 auth failed' })

    const none = setup({ mail: false, test: null })
    const boss3 = await none.login('boss@example.com')
    expect((await none.request('/api/admin/test-alert', { method: 'POST', cookie: boss3, body: '{}' })).status).toBe(503)
  })
})

describe('공지', () => {
  it('처음에는 없고, 관리자가 켜면 모두에게 보이며, 끄면 사라진다', async () => {
    const { request, login } = setup()
    const publicNotice = async () => ((await (await request('/api/notice')).json()) as { notice: unknown }).notice
    expect(await publicNotice()).toBeNull()
    expect((await request('/api/notice')).headers.get('cache-control')).toBe('no-store')
    const boss = await login('boss@example.com')
    const put = (body: unknown) => request('/api/admin/notice', { method: 'PUT', cookie: boss, body: JSON.stringify(body) })
    const saved = await put({ active: true, level: 'warning', text: { ko: '  11월 20일 새벽 2시~3시 점검이 있어요. ', en: 'Maintenance on Nov 20, 2–3 AM KST.', ja: '' } })
    expect(saved.status).toBe(200)
    const shown = (await publicNotice()) as { version: number; level: string; text: Record<string, string> }
    expect(shown).toEqual({ version: expect.any(Number), level: 'warning', text: { ko: '11월 20일 새벽 2시~3시 점검이 있어요.', en: 'Maintenance on Nov 20, 2–3 AM KST.', ja: '' } })
    // 관리자 화면은 꺼진 공지도 고칠 수 있게 그대로 받는다
    await put({ active: false, level: 'warning', text: { ko: '지난 공지', en: '', ja: '' } })
    expect(await publicNotice()).toBeNull()
    const admin = (await (await request('/api/admin/notice', { cookie: boss })).json()) as { notice: { active: boolean; text: { ko: string } } }
    expect(admin.notice).toMatchObject({ active: false, text: { ko: '지난 공지' } })
  })

  it('다시 저장하면 판(version)이 바뀐다 — 닫았던 사람에게도 다시 보이게', async () => {
    const { request, login } = setup()
    const boss = await login('boss@example.com')
    const put = (body: unknown) => request('/api/admin/notice', { method: 'PUT', cookie: boss, body: JSON.stringify(body) })
    await put({ active: true, level: 'info', text: { ko: '새 스타일이 나왔어요', en: '', ja: '' } })
    const first = ((await (await request('/api/notice')).json()) as { notice: { version: number } }).notice.version
    await login('someone@example.com') // 시각이 흐른다
    await put({ active: true, level: 'info', text: { ko: '새 스타일이 나왔어요', en: '', ja: '' } })
    const second = ((await (await request('/api/notice')).json()) as { notice: { version: number } }).notice.version
    expect(second).toBeGreaterThan(first)
  })

  it('관리자만 바꿀 수 있고, 형식이 틀리면 400', async () => {
    const { request, login } = setup()
    const member = await login('mina@example.com')
    const body = JSON.stringify({ active: true, level: 'info', text: { ko: '공지', en: '', ja: '' } })
    expect((await request('/api/admin/notice', { method: 'PUT', cookie: member, body })).status).toBe(403)
    expect((await request('/api/admin/notice', { method: 'PUT', body })).status).toBe(401)
    const boss = await login('boss@example.com')
    const put = (value: unknown) => request('/api/admin/notice', { method: 'PUT', cookie: boss, body: JSON.stringify(value) })
    expect((await put({ active: true, level: 'info', text: { ko: '', en: ' ', ja: '' } })).status).toBe(400)
    expect(await (await put({ active: true, level: 'info', text: { ko: '', en: ' ', ja: '' } })).json()).toEqual({ error: 'empty' })
    expect((await put({ active: true, level: 'loud', text: { ko: '공지', en: '', ja: '' } })).status).toBe(400)
    expect(await (await put({ active: true, level: 'info', text: { ko: '가'.repeat(301), en: '', ja: '' } })).json()).toEqual({ error: 'too_long' })
    expect((await put('nope')).status).toBe(400)
  })
})
