import { randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { join } from 'node:path'
import { Readable } from 'node:stream'
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
import { BACKUP_FILE, effectivePlan, listBackups, overview, searchUsers, setPlan } from './admin-data'
import type { BillingProvider } from './billing'
import { createConnector, openDraftStore } from './connect'
import type { DraftStore } from './connect'
import type { Db, UserRow } from './db'
import { LoginError, pkcePair } from './google'
import type { GoogleClaims, GoogleClient } from './google'
import { SESSION_COOKIE, SESSION_DAYS, createSession, deleteSession, newToken, sessionUser } from './sessions'
import type { WatchStatus } from './watch'

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
  /** Claude·ChatGPT 커넥터(/mcp)를 켠다(기본). 남용될 때 끄는 스위치 — 이미 만든 링크는 기한까지 열린다. */
  connector?: boolean
}

type Env = { Variables: { user: UserRow | null; token: string | null } }

export type AppDeps = {
  db: Db
  google: GoogleClient | null
  config: AppConfig
  now?: () => number
  assist?: AssistModel | null
  billing?: BillingProvider | null
  /** 장애 확인 결과(watch.ts) — /api/status 와 관리자 화면이 쓴다 */
  watch?: { status(): WatchStatus } | null
  /** 관리자 화면(/admin) */
  admin?: AdminDeps | null
  /** 커넥터 초안을 두는 곳(connect.ts). 주지 않으면 메모리에만(시험). */
  drafts?: DraftStore
}

/** 관리자: ADMIN_EMAILS 의 메일로 로그인한 사람(구글은 확인된 메일만 받는다 — google.ts). */
export type AdminDeps = {
  emails: string[]
  /** 자동 백업 폴더(backup.ts) — 목록과 내려받기 */
  backupDir: string | null
  alerts: { email: string | null; mail: boolean; test: (() => Promise<void>) | null }
}

/** 말로 고치기: 계정(로그인) 또는 IP 마다 10분에 20번, 동시에 기다리는 요청은 3개까지. */
export const ASSIST_LIMIT = 20
export const ASSIST_WINDOW = 10 * 60 * 1000
export const ASSIST_WAITING = 3

export const MAX_PROJECT_BYTES = 1_000_000
export const MAX_PROJECTS = 500
const LOGIN_WINDOW = 10 * 60 * 1000

export { effectivePlan }

export function publicUser(user: UserRow, now: number) {
  return { id: user.id, email: user.email, name: user.name, plan: effectivePlan(user, now), planUntil: user.plan_until, createdAt: user.created_at }
}

/** 방문자의 주소(웹 서버가 X-Forwarded-For 로 알려 준다 — deploy/Caddyfile). 남용 막기의 열쇠로만 쓰고 저장·기록하지 않는다. */
function visitorOf(c: Context): string {
  return c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
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

export function createApp({ db, google, config, now = Date.now, assist = null, billing = null, watch = null, admin = null, drafts = openDraftStore(':memory:') }: AppDeps) {
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
    // 커넥터(/api/mcp)는 Claude·ChatGPT 의 서버가 부르고 쿠키·계정을 보지 않으므로 확인하지 않는다(connect.ts).
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD' && c.req.path !== '/api/billing/webhook' && c.req.path !== '/api/mcp') {
      const origin = c.req.header('origin')
      if (!origin || !sameSite(origin, c, config)) return c.json({ error: 'bad_origin' }, 403)
    }
    const token = getCookie(c, SESSION_COOKIE) ?? null
    c.set('token', token)
    c.set('user', token ? sessionUser(db, token, now()) : null)
    await next()
    c.header('Cache-Control', 'no-store')
  })

  const adminEmails = new Set((admin?.emails ?? []).map((email) => email.trim().toLowerCase()))
  const isAdmin = (user: UserRow | null) => user !== null && adminEmails.has(user.email.toLowerCase())
  const requireAdmin: MiddlewareHandler<Env> = async (c, next) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'login_required' }, 401)
    if (!isAdmin(user)) return c.json({ error: 'forbidden' }, 403)
    await next()
  }
  const requireUser: MiddlewareHandler<Env> = async (c, next) => {
    if (!c.get('user')) return c.json({ error: 'login_required' }, 401)
    await next()
  }
  const userOf = (c: Context<Env>) => c.get('user') as UserRow

  app.get('/health', (c) => c.json({ ok: true }))

  /** 바깥 감시 서비스용: 모두 정상이면 200, 아니면 503. 부분 이름과 정상 여부만(자세한 내용은 관리자 화면). */
  app.get('/status', (c) => {
    const status = watch?.status() ?? { checkedAt: null, checks: [] }
    const ok = status.checkedAt !== null && status.checks.every((check) => check.ok)
    return c.json({ ok, checkedAt: status.checkedAt, checks: status.checks.map((check) => ({ id: check.id, ok: check.ok })) }, ok ? 200 : 503)
  })

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
      admin: isAdmin(user),
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
    const key = user ? `u:${user.id}` : `ip:${visitorOf(c)}`
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

  // ── Claude·ChatGPT 커넥터(MCP)와 그 초안 ──
  const connector = createConnector({ db: drafts, now, siteOrigin: config.siteOrigin, enabled: config.connector ?? true })
  app.all('/mcp', (c) => connector.handle(c.req.raw, visitorOf(c)))

  /** 「편집기로 열기」 주소(?draft=)가 가리키는 대본·스타일. 7일이 지났거나 없으면 404. */
  app.get('/drafts/:id', (c) => {
    const draft = connector.readDraft(c.req.param('id'))
    return draft ? c.json({ draft }) : c.json({ error: 'not_found' }, 404)
  })

  // ── 공지 — 누구나 읽고, 관리자만 바꾼다 ──
  type NoticeRow = { active: number; level: string; text_ko: string; text_en: string; text_ja: string; updated_at: number }
  const readNotice = () => db.prepare('select * from notice where id = 1').get() as NoticeRow
  const noticeText = (row: NoticeRow) => ({ ko: row.text_ko, en: row.text_en, ja: row.text_ja })

  app.get('/notice', (c) => {
    const row = readNotice()
    const text = noticeText(row)
    const visible = row.active === 1 && Object.values(text).some((value) => value !== '')
    c.header('cache-control', 'no-store')
    return c.json({ notice: visible ? { version: row.updated_at, level: row.level, text } : null })
  })

  // ── 관리자 화면(/admin) — 관리자만 ──
  app.use('/admin/*', requireAdmin)

  app.get('/admin/notice', (c) => {
    const row = readNotice()
    return c.json({ notice: { active: row.active === 1, level: row.level, text: noticeText(row), version: row.updated_at } })
  })

  /** 공지 저장. 저장할 때마다 판(version)이 바뀌어, 닫았던 사람에게도 다시 보인다. 언어마다 300자까지. */
  app.put('/admin/notice', async (c) => {
    const body = (await c.req.json().catch(() => null)) as { active?: unknown; level?: unknown; text?: Record<string, unknown> } | null
    if (!body || typeof body !== 'object' || typeof body.active !== 'boolean' || (body.level !== 'info' && body.level !== 'warning')) return c.json({ error: 'bad_request' }, 400)
    const text = Object.fromEntries((['ko', 'en', 'ja'] as const).map((lang) => [lang, typeof body.text?.[lang] === 'string' ? (body.text[lang] as string).replace(/\s+/g, ' ').trim() : ''])) as Record<Lang, string>
    if (Object.values(text).some((value) => value.length > 300)) return c.json({ error: 'too_long' }, 400)
    if (body.active && Object.values(text).every((value) => value === '')) return c.json({ error: 'empty' }, 400)
    db.prepare('update notice set active = ?, level = ?, text_ko = ?, text_en = ?, text_ja = ?, updated_at = ? where id = 1').run(body.active ? 1 : 0, body.level, text.ko, text.en, text.ja, now())
    const row = readNotice()
    return c.json({ notice: { active: row.active === 1, level: row.level, text: noticeText(row), version: row.updated_at } })
  })

  app.get('/admin/overview', (c) =>
    c.json({
      status: watch?.status() ?? { checkedAt: null, checks: [] },
      ...overview(db, now()),
      backups: listBackups(admin?.backupDir ?? null),
      alerts: { email: admin?.alerts.email ?? null, mail: admin?.alerts.mail ?? false },
      settings: { enforced: config.enforcePlans === true, billing: billing !== null, googleLogin: google !== null, connector: config.connector ?? true },
    }),
  )

  app.get('/admin/users', (c) => c.json({ users: searchUsers(db, c.req.query('q') ?? '', now()) }))

  app.post('/admin/plan', async (c) => {
    const body = (await c.req.json().catch(() => null)) as { email?: unknown; plan?: unknown; days?: unknown } | null
    const days = typeof body?.days === 'number' ? body.days : undefined
    const result = setPlan(db, typeof body?.email === 'string' ? body.email : undefined, typeof body?.plan === 'string' ? body.plan : undefined, days, now())
    if (!result.ok) return c.json({ error: result.error }, result.error === 'no_user' ? 404 : 400)
    return c.json({ user: publicUser(result.user, now()) })
  })

  /** 백업 내려받기(다른 곳에 보관할 때). 백업 이름 꼴만 — 다른 파일이나 위 폴더로는 갈 수 없다. */
  app.get('/admin/backups/:name', (c) => {
    const name = c.req.param('name')
    const backup = listBackups(admin?.backupDir ?? null).find((item) => item.name === name)
    if (!backup || !BACKUP_FILE.test(name) || !admin?.backupDir) return c.json({ error: 'not_found' }, 404)
    const stream = Readable.toWeb(createReadStream(join(admin.backupDir, name))) as ReadableStream
    return c.body(stream, 200, {
      'content-type': 'application/octet-stream',
      'content-length': String(backup.bytes),
      'content-disposition': `attachment; filename="${name}"`,
      'cache-control': 'no-store',
    })
  })

  app.post('/admin/test-alert', async (c) => {
    const test = admin?.alerts.test
    if (!test) return c.json({ error: 'mail_not_set_up' }, 503)
    try {
      await test()
      return c.json({ ok: true, to: admin?.alerts.email ?? null })
    } catch (error) {
      return c.json({ error: 'send_failed', message: error instanceof Error ? error.message : String(error) }, 502)
    }
  })

  app.notFound((c) => c.json({ error: 'not_found' }, 404))
  app.onError((error, c) => {
    console.error('app error:', error)
    return c.json({ error: 'server_error' }, 500)
  })
  return app
}
