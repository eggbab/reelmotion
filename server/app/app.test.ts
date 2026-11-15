import { describe, expect, it } from 'vitest'
import type { SavedProject } from '../../src/editor/projects'
import { createApp, effectivePlan } from './app'
import type { AppConfig } from './app'
import { openDb } from './db'
import type { UserRow } from './db'
import { LoginError } from './google'
import type { GoogleClaims, GoogleClient } from './google'

const ORIGIN = 'https://reelmotion.test'
const config: AppConfig = { siteOrigin: ORIGIN, secureCookies: true, devLogin: false }

function setup(options: { claims?: GoogleClaims; devLogin?: boolean; google?: boolean } = {}) {
  const db = openDb(':memory:')
  let now = 1_800_000_000_000
  const google: GoogleClient = {
    authUrl: ({ state }) => `https://accounts.example/auth?state=${state}`,
    signIn: async (code) => {
      if (code !== 'good') throw new LoginError('bad code')
      return options.claims ?? { sub: 'g-1', email: 'mina@example.com', name: 'Mina' }
    },
  }
  const app = createApp({ db, google: options.google === false ? null : google, config: { ...config, devLogin: options.devLogin ?? false }, now: () => now })
  const request = (path: string, init: RequestInit & { cookie?: string } = {}) => {
    const headers = new Headers(init.headers)
    if (init.cookie) headers.set('cookie', init.cookie)
    if (init.method && init.method !== 'GET' && !headers.has('origin')) headers.set('origin', ORIGIN)
    return app.request(path, { ...init, headers })
  }
  /** 구글 로그인을 끝까지 하고 쿠키를 돌려준다. */
  const login = async (next = '/ko/app') => {
    const start = await request(`/api/auth/google?next=${encodeURIComponent(next)}`)
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!
    const back = await request(`/api/auth/google/callback?state=${state}&code=good`)
    const cookie = back.headers.get('set-cookie')!.split(';')[0]
    return { cookie, back }
  }
  return { db, app, request, login, advance: (ms: number) => (now += ms) }
}

const project = (id: string, updatedAt: number, name = 'Talk'): SavedProject => ({
  version: 1,
  id,
  name,
  createdAt: 1,
  updatedAt,
  source: { kind: 'file', name: 'talk.mp4', size: 10, type: 'video/mp4', lastModified: 0 },
  hasMedia: true,
  script: 'hello',
  recognized: null,
  graphics: [{ id: 'u101', kind: 'title', start: 0, end: 2, text: 'hello' }],
  theme: 'neon',
  speechLanguage: 'en',
  duration: 12,
  portrait: false,
  thumbnail: null,
  owner: null,
})

describe('로그인', () => {
  it('로그인 전에는 사용자가 없고, 구글 로그인을 쓸 수 있는지 알려 준다', async () => {
    const { request } = setup()
    expect(await (await request('/api/me')).json()).toEqual({
      user: null,
      login: { google: true, dev: false },
      billing: { enforced: false, connected: false, provider: null },
      usage: null,
    })
    const off = setup({ google: false })
    expect((await off.request('/api/auth/google')).status).toBe(503)
  })

  it('구글 로그인 → 쿠키(HttpOnly·Secure·SameSite=Lax) → 돌아갈 곳 → 내 정보', async () => {
    const { request, login } = setup()
    const { cookie, back } = await login('/ko/app?project=p1')
    expect(back.status).toBe(302)
    expect(back.headers.get('location')).toBe('/ko/app?project=p1')
    const setCookie = back.headers.get('set-cookie')!
    expect(setCookie).toMatch(/HttpOnly/)
    expect(setCookie).toMatch(/Secure/)
    expect(setCookie).toMatch(/SameSite=Lax/)
    const me = (await (await request('/api/me', { cookie })).json()) as { user: { email: string; plan: string } }
    expect(me.user).toMatchObject({ email: 'mina@example.com', plan: 'free' })
  })

  it('state 가 틀리거나 다시 쓰이거나 10분이 지나면 실패, 취소는 취소로', async () => {
    const { request, advance } = setup()
    const failed = await request('/api/auth/google/callback?state=nope&code=good')
    expect(failed.headers.get('location')).toBe('/account?login=failed')

    const start = await request('/api/auth/google?next=/ja/app')
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!
    const cancelled = await request(`/api/auth/google/callback?state=${state}&error=access_denied`)
    expect(cancelled.headers.get('location')).toBe('/ja/account?login=cancelled')
    expect((await request(`/api/auth/google/callback?state=${state}&code=good`)).headers.get('location')).toBe('/account?login=failed')

    const late = await request('/api/auth/google?next=/ko/app')
    const lateState = new URL(late.headers.get('location')!).searchParams.get('state')!
    advance(11 * 60 * 1000)
    expect((await request(`/api/auth/google/callback?state=${lateState}&code=good`)).headers.get('location')).toBe('/ko/account?login=failed')
  })

  it('로그아웃하면 세션이 사라진다', async () => {
    const { request, login } = setup()
    const { cookie } = await login()
    expect((await request('/api/auth/logout', { method: 'POST', cookie })).status).toBe(200)
    expect(((await (await request('/api/me', { cookie })).json()) as { user: unknown }).user).toBeNull()
  })

  it('다른 사이트에서 온(Origin 이 다르거나 없는) 바꾸는 요청은 거절', async () => {
    const { request, login } = setup()
    const { cookie } = await login()
    expect((await request('/api/auth/logout', { method: 'POST', cookie, headers: { origin: 'https://evil.example' } })).status).toBe(403)
    expect((await request('/api/account', { method: 'DELETE', cookie, headers: { origin: 'null' } })).status).toBe(403)
  })

  it('개발용 로그인은 켰을 때만', async () => {
    expect((await setup().request('/api/auth/dev', { method: 'POST', body: JSON.stringify({ email: 'a@b.c' }) })).status).toBe(404)
    const dev = setup({ devLogin: true })
    const response = await dev.request('/api/auth/dev', { method: 'POST', body: JSON.stringify({ email: 'Test@Example.com', name: 'Tester' }) })
    expect(response.status).toBe(200)
    expect(((await response.json()) as { user: { email: string } }).user.email).toBe('test@example.com')
  })
})

describe('작업 저장(영상 제외)', () => {
  it('로그인해야 쓸 수 있다', async () => {
    const { request } = setup()
    expect((await request('/api/projects')).status).toBe(401)
    expect((await request('/api/projects/p1', { method: 'PUT', body: JSON.stringify(project('p1', 10)) })).status).toBe(401)
  })

  it('저장·목록·하나 읽기·지우기. 서버 기록은 영상 없음(hasMedia=false)', async () => {
    const { request, login } = setup()
    const { cookie } = await login()
    expect((await request('/api/projects/p1', { method: 'PUT', cookie, body: JSON.stringify(project('p1', 10)) })).status).toBe(200)
    expect((await request('/api/projects/p2', { method: 'PUT', cookie, body: JSON.stringify(project('p2', 20, 'Second')) })).status).toBe(200)
    const list = (await (await request('/api/projects', { cookie })).json()) as { projects: { id: string; name: string }[] }
    expect(list.projects.map((item) => item.id)).toEqual(['p2', 'p1'])
    expect(list.projects[0]).not.toHaveProperty('graphics')
    const one = (await (await request('/api/projects/p1', { cookie })).json()) as { project: SavedProject }
    expect(one.project.hasMedia).toBe(false)
    expect(one.project.graphics).toHaveLength(1)
    await request('/api/projects/p1', { method: 'DELETE', cookie })
    expect((await request('/api/projects/p1', { cookie })).status).toBe(404)
  })

  it('더 새 기록을 옛 기록이 덮지 못한다(409 와 함께 서버 기록)', async () => {
    const { request, login } = setup()
    const { cookie } = await login()
    await request('/api/projects/p1', { method: 'PUT', cookie, body: JSON.stringify(project('p1', 50, 'New')) })
    const stale = await request('/api/projects/p1', { method: 'PUT', cookie, body: JSON.stringify(project('p1', 40, 'Old')) })
    expect(stale.status).toBe(409)
    expect(((await stale.json()) as { project: SavedProject }).project.name).toBe('New')
  })

  it('형식이 틀리거나 주소의 id 와 다르면 400', async () => {
    const { request, login } = setup()
    const { cookie } = await login()
    expect((await request('/api/projects/p1', { method: 'PUT', cookie, body: JSON.stringify({ hello: 1 }) })).status).toBe(400)
    expect((await request('/api/projects/p1', { method: 'PUT', cookie, body: JSON.stringify(project('p9', 1)) })).status).toBe(400)
  })

  it('다른 사람의 작업은 보이지 않는다', async () => {
    const first = setup({ claims: { sub: 'g-1', email: 'a@example.com', name: 'A' } })
    const a = await first.login()
    await first.request('/api/projects/p1', { method: 'PUT', cookie: a.cookie, body: JSON.stringify(project('p1', 10)) })
    const other = createApp({
      db: first.db,
      google: { authUrl: ({ state }) => `https://g/auth?state=${state}`, signIn: async () => ({ sub: 'g-2', email: 'b@example.com', name: 'B' }) },
      config,
    })
    const start = await other.request('/api/auth/google?next=/app')
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!
    const cookie = (await other.request(`/api/auth/google/callback?state=${state}&code=x`)).headers.get('set-cookie')!.split(';')[0]
    expect(((await (await other.request('/api/projects', { headers: { cookie } })).json()) as { projects: unknown[] }).projects).toEqual([])
    expect((await other.request('/api/projects/p1', { headers: { cookie } })).status).toBe(404)
  })
})

describe('탈퇴', () => {
  it('계정·작업·세션·내보내기 횟수를 모두 지운다', async () => {
    const { db, request, login } = setup()
    const { cookie } = await login()
    await request('/api/projects/p1', { method: 'PUT', cookie, body: JSON.stringify(project('p1', 10)) })
    await request('/api/usage/export/done', { method: 'POST', cookie, body: '{}' })
    expect(db.prepare('select count(*) as n from usage').get()).toEqual({ n: 1 })
    expect((await request('/api/account', { method: 'DELETE', cookie })).status).toBe(200)
    expect(db.prepare('select count(*) as n from users').get()).toEqual({ n: 0 })
    expect(db.prepare('select count(*) as n from projects').get()).toEqual({ n: 0 })
    expect(db.prepare('select count(*) as n from sessions').get()).toEqual({ n: 0 })
    expect(db.prepare('select count(*) as n from usage').get()).toEqual({ n: 0 })
    expect(((await (await request('/api/me', { cookie })).json()) as { user: unknown }).user).toBeNull()
  })
})

describe('요금제 기간', () => {
  it('기간이 끝난 유료 요금제는 무료로 본다', () => {
    const user = { plan: 'creator', plan_until: 100 } as UserRow
    expect(effectivePlan(user, 50)).toBe('creator')
    expect(effectivePlan(user, 100)).toBe('free')
    expect(effectivePlan({ plan: 'pro', plan_until: null } as UserRow, 1e15)).toBe('pro')
  })
})
