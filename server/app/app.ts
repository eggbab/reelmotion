import { randomUUID } from 'node:crypto'
import { Hono } from 'hono'
import type { Context, MiddlewareHandler } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { MAX_INSTRUCTION, parseAssistState } from '../../src/editor/assist'
import { parseProject } from '../../src/editor/projects'
import type { Lang } from '../../src/langs'
import { checkExport, monthKey } from '../../src/site/entitlements'
import { PLANS } from '../../src/site/plans'
import type { PlanId } from '../../src/site/plans'
import { langOfPath, pagePath, safeNext } from '../../src/site/routes'
import { buildMessages, createRateLimiter, parseReply, RESPONSE_SCHEMA } from './assist'
import type { AssistModel } from './assist'
import type { BillingProvider } from './billing'
import type { Db, UserRow } from './db'
import { LoginError, pkcePair } from './google'
import type { GoogleClaims, GoogleClient } from './google'
import { SESSION_COOKIE, SESSION_DAYS, createSession, deleteSession, newToken, sessionUser } from './sessions'

/**
 * ReelMotion 앱 서버(/api): 로그인·계정·작업 저장. 받아쓰기(/api/asr)는 따로(server/asr).
 * 쿠키로 사용자를 알아보므로, 바꾸는 요청(POST·PUT·DELETE)은 우리 사이트에서 온 것만 받는다(Origin 확인 + SameSite=Lax).
 */
export type AppConfig = {
  /** 사이트 주소(https://도메인). 없으면 요청의 Host 로 같은 사이트인지 본다(개발용). */
  siteOrigin: string | null
  /** 로그인 쿠키에 Secure 를 붙인다(https). 로컬 http 시험에서만 끈다. */
  secureCookies: boolean
  /** 개발·시험용 가짜 로그인(POST /api/auth/dev). 운영에서는 끈다. */
  devLogin: boolean
  /** 요금제 한도(길이·횟수·워터마크)를 지킨다. 베타 동안은 끄고, 결제를 붙이는 날 켠다. */
  enforcePlans?: boolean
}

type Env = { Variables: { user: UserRow | null; token: string | null } }

export type AppDeps = { db: Db; google: GoogleClient | null; config: AppConfig; now?: () => number; assist?: AssistModel | null; billing?: BillingProvider | null }

/** 말로 고치기: 계정(로그인) 또는 IP 마다 10분에 20번, 동시에 기다리는 요청은 3개까지. */
export const ASSIST_LIMIT = 20
export const ASSIST_WINDOW = 10 * 60 * 1000
export const ASSIST_WAITING = 3

export const MAX_PROJECT_BYTES = 1_000_000
export const MAX_PROJECTS = 500
const LOGIN_WINDOW = 10 * 60 * 1000

/** 요금제 기간이 끝났으면 무료로 본다. */
export function effectivePlan(user: UserRow, now: number): string {
  return user.plan !== 'free' && user.plan_until !== null && user.plan_until <= now ? 'free' : user.plan
}

export function publicUser(user: UserRow, now: number) {
  return { id: user.id, email: user.email, name: user.name, plan: effectivePlan(user, now), planUntil: user.plan_until, createdAt: user.created_at }
}

function sameSite(origin: string, c: Context, config: AppConfig): boolean {
  if (config.siteOrigin) return origin === config.siteOrigin
  try {
    return new URL(origin).host === c.req.header('host')
  } catch {
    return false
  }
}

function upsertUser(db: Db, claims: GoogleClaims | { email: string; name: string; sub: null }, now: number): UserRow {
  const bySub = claims.sub ? (db.prepare('select * from users where google_sub = ?').get(claims.sub) as UserRow | undefined) : undefined
  const existing = bySub ?? (db.prepare('select * from users where email = ?').get(claims.email) as UserRow | undefined)
  if (existing) {
    db.prepare('update users set email = ?, name = ?, google_sub = coalesce(?, google_sub) where id = ?').run(claims.email, claims.name || existing.name, claims.sub, existing.id)
    return db.prepare('select * from users where id = ?').get(existing.id) as UserRow
  }
  const id = randomUUID()
  db.prepare('insert into users (id, google_sub, email, name, created_at) values (?, ?, ?, ?, ?)').run(id, claims.sub, claims.email, claims.name, now)
  return db.prepare('select * from users where id = ?').get(id) as UserRow
}

export function createApp({ db, google, config, now = Date.now, assist = null, billing = null }: AppDeps) {
  const app = new Hono<Env>().basePath('/api')
  const assistLimiter = createRateLimiter(ASSIST_LIMIT, ASSIST_WINDOW, now)
  let assistWaiting = 0

  const startSession = (c: Context, userId: string) => {
    setCookie(c, SESSION_COOKIE, createSession(db, userId, now()), { httpOnly: true, secure: config.secureCookies, sameSite: 'Lax', path: '/', maxAge: SESSION_DAYS * 24 * 60 * 60 })
  }
  const endSession = (c: Context<Env>) => {
    const token = c.get('token')
    if (token) deleteSession(db, token)
    deleteCookie(c, SESSION_COOKIE, { path: '/', secure: config.secureCookies })
  }

  app.use('*', async (c, next) => {
    // 결제사 알림(webhook)은 다른 곳에서 오므로 Origin 대신 결제사 서명으로 확인한다(billing.ts).
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD' && c.req.path !== '/api/billing/webhook') {
      const origin = c.req.header('origin')
      if (!origin || !sameSite(origin, c, config)) return c.json({ error: 'bad_origin' }, 403)
    }
    const token = getCookie(c, SESSION_COOKIE) ?? null
    c.set('token', token)
    c.set('user', token ? sessionUser(db, token, now()) : null)
    await next()
    c.header('Cache-Control', 'no-store')
  })

  const requireUser: MiddlewareHandler<Env> = async (c, next) => {
    if (!c.get('user')) return c.json({ error: 'login_required' }, 401)
    await next()
  }
  const userOf = (c: Context<Env>) => c.get('user') as UserRow

  app.get('/health', (c) => c.json({ ok: true }))

  const exportsThisMonth = (userId: string) =>
    ((db.prepare('select exports from usage where user_id = ? and month = ?').get(userId, monthKey(now())) as { exports: number } | undefined)?.exports ?? 0)
  const billingStatus = () => ({ enforced: config.enforcePlans === true, connected: billing !== null, provider: billing?.name ?? null })

  app.get('/me', (c) => {
    const user = c.get('user')
    return c.json({
      user: user ? publicUser(user, now()) : null,
      login: { google: google !== null, dev: config.devLogin },
      billing: billingStatus(),
      usage: user ? { month: monthKey(now()), exports: exportsThisMonth(user.id) } : null,
    })
  })

  // ── 요금제 한도·사용량 ──
  /** 내보내기 전에 묻는다(세지 않음). 허락하면 워터마크를 넣을지와 이번 것을 빼고 남는 횟수를 알려 준다. */
  app.post('/usage/export', async (c) => {
    const body = (await c.req.json().catch(() => null)) as { duration?: unknown } | null
    const duration = typeof body?.duration === 'number' && Number.isFinite(body.duration) && body.duration >= 0 ? body.duration : null
    if (duration === null) return c.json({ error: 'bad_request' }, 400)
    const user = c.get('user')
    const used = user ? exportsThisMonth(user.id) : 0
    const check = checkExport({ enforced: config.enforcePlans === true, plan: user ? effectivePlan(user, now()) : null, durationSeconds: duration, usedThisMonth: used })
    if (!check.ok) return c.json({ error: check.reason }, check.reason === 'login' ? 401 : 403)
    return c.json(check)
  })

  /** 영상을 다 만들었을 때 센다(로그인했을 때만). 취소하거나 실패한 내보내기는 횟수를 쓰지 않는다. */
  app.post('/usage/export/done', (c) => {
    const user = c.get('user')
    if (!user) return c.json({ ok: true, exports: null })
    db.prepare('insert into usage (user_id, month, exports) values (?, ?, 1) on conflict(user_id, month) do update set exports = exports + 1').run(user.id, monthKey(now()))
    return c.json({ ok: true, exports: exportsThisMonth(user.id) })
  })

  // ── 결제(카드) — 결제사를 붙이기 전에는 「준비 중」 ──
  app.post('/billing/checkout', requireUser, async (c) => {
    const body = (await c.req.json().catch(() => null)) as { plan?: unknown; returnUrl?: unknown } | null
    const plan = PLANS.find((item) => item.id === body?.plan && item.monthlyWon > 0)
    if (!plan) return c.json({ error: 'bad_plan' }, 400)
    if (!billing) return c.json({ error: 'billing_not_connected' }, 503)
    const returnUrl = `${config.siteOrigin ?? ''}${safeNext(typeof body?.returnUrl === 'string' ? body.returnUrl : '/account')}`
    return c.json(await billing.startCheckout({ user: userOf(c), plan: plan.id as Exclude<PlanId, 'free'>, returnUrl }))
  })

  app.post('/billing/webhook', async (c) => {
    if (!billing) return c.json({ error: 'not_found' }, 404)
    return billing.handleWebhook(c.req.raw, (userId, plan, until) => {
      db.prepare('update users set plan = ?, plan_until = ? where id = ?').run(plan, until, userId)
    })
  })

  // ── 구글 로그인 ──
  app.get('/auth/google', (c) => {
    if (!google) return c.json({ error: 'login_not_configured' }, 503)
    const next = safeNext(c.req.query('next'))
    const state = newToken()
    const nonce = newToken()
    const { verifier, challenge } = pkcePair()
    db.prepare('insert into oauth_states (state, nonce, verifier, next, created_at) values (?, ?, ?, ?, ?)').run(state, nonce, verifier, next, now())
    return c.redirect(google.authUrl({ state, nonce, challenge }), 302)
  })

  app.get('/auth/google/callback', async (c) => {
    const state = c.req.query('state') ?? ''
    const row = db.prepare('select * from oauth_states where state = ?').get(state) as { nonce: string; verifier: string; next: string; created_at: number } | undefined
    if (row) db.prepare('delete from oauth_states where state = ?').run(state)
    const next = row?.next ?? '/app'
    const back = (reason: string) => c.redirect(`${pagePath('account', langOfPath(next))}?login=${reason}`, 302)
    if (c.req.query('error')) return back('cancelled')
    const code = c.req.query('code')
    if (!google || !row || !code || row.created_at < now() - LOGIN_WINDOW) return back('failed')
    try {
      const claims = await google.signIn(code, row.verifier, row.nonce)
      startSession(c, upsertUser(db, claims, now()).id)
      return c.redirect(next, 302)
    } catch (error) {
      console.error('google login failed:', error instanceof LoginError ? error.message : error)
      return back('failed')
    }
  })

  app.post('/auth/dev', async (c) => {
    if (!config.devLogin) return c.json({ error: 'not_found' }, 404)
    const body = (await c.req.json().catch(() => null)) as { email?: unknown; name?: unknown } | null
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!/^[^@\s]+@[^@\s]+$/.test(email)) return c.json({ error: 'bad_email' }, 400)
    const user = upsertUser(db, { email, name: typeof body?.name === 'string' ? body.name.slice(0, 100) : '', sub: null }, now())
    startSession(c, user.id)
    return c.json({ user: publicUser(user, now()) })
  })

  app.post('/auth/logout', (c) => {
    endSession(c)
    return c.json({ ok: true })
  })

  /** 탈퇴: 계정과 서버에 둔 작업·세션·사용량을 모두 지운다(바로, 되돌릴 수 없다). */
  app.delete('/account', requireUser, (c) => {
    const user = userOf(c)
    endSession(c)
    db.prepare('delete from users where id = ?').run(user.id)
    return c.json({ ok: true })
  })

  // ── 작업(영상 제외). 마지막에 고친 것이 이긴다. ──
  app.get('/projects', requireUser, (c) => {
    const rows = db.prepare('select data from projects where user_id = ? order by updated_at desc').all(userOf(c).id) as { data: string }[]
    const projects = rows.flatMap((row) => {
      const project = parseProject(JSON.parse(row.data))
      if (!project) return []
      const { id, name, updatedAt, createdAt, duration, portrait, thumbnail, source } = project
      return [{ id, name, updatedAt, createdAt, duration, portrait, thumbnail, source }]
    })
    return c.json({ projects })
  })

  app.get('/projects/:id', requireUser, (c) => {
    const row = db.prepare('select data from projects where user_id = ? and id = ?').get(userOf(c).id, c.req.param('id')) as { data: string } | undefined
    return row ? c.json({ project: JSON.parse(row.data) }) : c.json({ error: 'not_found' }, 404)
  })

  app.put('/projects/:id', requireUser, bodyLimit({ maxSize: MAX_PROJECT_BYTES, onError: (c) => c.json({ error: 'too_large' }, 413) }), async (c) => {
    const user = userOf(c)
    const project = parseProject(await c.req.json().catch(() => null))
    if (!project || project.id !== c.req.param('id')) return c.json({ error: 'bad_project' }, 400)
    // 영상은 서버에 없다: 이 기록을 받은 다른 브라우저는 영상을 다시 고른다.
    const record = { ...project, hasMedia: false, owner: user.id }
    const stored = db.prepare('select updated_at, data from projects where user_id = ? and id = ?').get(user.id, project.id) as { updated_at: number; data: string } | undefined
    if (stored && stored.updated_at > project.updatedAt) return c.json({ error: 'stale', project: JSON.parse(stored.data) }, 409)
    if (!stored) {
      const { count } = db.prepare('select count(*) as count from projects where user_id = ?').get(user.id) as { count: number }
      if (count >= MAX_PROJECTS) return c.json({ error: 'too_many' }, 409)
    }
    db.prepare('insert into projects (user_id, id, updated_at, data) values (?, ?, ?, ?) on conflict(user_id, id) do update set updated_at = excluded.updated_at, data = excluded.data').run(
      user.id,
      project.id,
      project.updatedAt,
      JSON.stringify(record),
    )
    return c.json({ ok: true })
  })

  app.delete('/projects/:id', requireUser, (c) => {
    db.prepare('delete from projects where user_id = ? and id = ?').run(userOf(c).id, c.req.param('id'))
    return c.json({ ok: true })
  })

  // ── 말로 고치기 ──
  app.get('/assist/health', async (c) => c.json({ ready: assist ? await assist.ready() : false }))

  app.post('/assist/edit', bodyLimit({ maxSize: 300_000, onError: (c) => c.json({ error: 'too_large' }, 413) }), async (c) => {
    if (!assist) return c.json({ error: 'assist_off' }, 503)
    const body = (await c.req.json().catch(() => null)) as { instruction?: unknown; lang?: unknown; state?: unknown } | null
    const instruction = typeof body?.instruction === 'string' ? body.instruction.trim() : ''
    const lang: Lang = body?.lang === 'ko' || body?.lang === 'ja' ? body.lang : 'en'
    const state = parseAssistState(body?.state)
    if (!instruction || instruction.length > MAX_INSTRUCTION || !state) return c.json({ error: 'bad_request' }, 400)
    // 로그인했으면 계정, 아니면 IP 로 센다(IP 는 메모리에서 10분 안에 사라진다).
    const user = c.get('user')
    const key = user ? `u:${user.id}` : `ip:${c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'}`
    if (!assistLimiter.hit(key)) return c.json({ error: 'rate_limited' }, 429)
    if (assistWaiting >= ASSIST_WAITING) return c.json({ error: 'busy' }, 503)
    assistWaiting += 1
    try {
      const result = parseReply(await assist.complete(buildMessages(state, instruction, lang), RESPONSE_SCHEMA), state)
      if (!result || (!result.reply && result.ops.length === 0)) return c.json({ error: 'bad_reply' }, 502)
      return c.json(result)
    } catch (error) {
      console.error('assist failed:', error instanceof Error ? error.message : error)
      return c.json({ error: 'assist_failed' }, 502)
    } finally {
      assistWaiting -= 1
    }
  })

  app.notFound((c) => c.json({ error: 'not_found' }, 404))
  app.onError((error, c) => {
    console.error('app error:', error)
    return c.json({ error: 'server_error' }, 500)
  })
  return app
}
