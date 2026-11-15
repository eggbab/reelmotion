import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { monthKey } from '../../src/site/entitlements'
import { PLANS } from '../../src/site/plans'
import type { PlanId } from '../../src/site/plans'
import type { Db, UserRow } from './db'

/**
 * 관리자 화면(/admin)과 관리 명령(admin.ts)이 함께 쓰는 읽기·바꾸기. 숫자는 서울 시간의 달로 센다(monthKey).
 */
const DAY = 86_400_000
const SEOUL = 9 * 60 * 60 * 1000
export const BACKUP_FILE = /^reelmotion-\d{8}\.db$/

/** 요금제 기간이 끝났으면 무료로 본다. */
export function effectivePlan(user: Pick<UserRow, 'plan' | 'plan_until'>, now: number): string {
  return user.plan !== 'free' && user.plan_until !== null && user.plan_until <= now ? 'free' : user.plan
}

/** 서울 시간으로 이번 달 1일 0시(밀리초). */
function monthStart(now: number): number {
  const seoul = new Date(now + SEOUL)
  return Date.UTC(seoul.getUTCFullYear(), seoul.getUTCMonth(), 1) - SEOUL
}

export type SetPlanResult = { ok: true; user: UserRow } | { ok: false; error: 'no_user' | 'bad_plan' | 'bad_days' }

/** 요금제 주기: 유료는 days 일(기본 30), free 는 끝나는 날 없음. */
export function setPlan(db: Db, email: string | undefined, plan: string | undefined, days: number | undefined, now: number): SetPlanResult {
  const user = email ? (db.prepare('select * from users where email = ?').get(email.trim().toLowerCase()) as UserRow | undefined) : undefined
  if (!user) return { ok: false, error: 'no_user' }
  if (!PLANS.some((item) => item.id === plan)) return { ok: false, error: 'bad_plan' }
  const length = days === undefined ? 30 : days
  if (plan !== 'free' && (!Number.isInteger(length) || length <= 0 || length > 3660)) return { ok: false, error: 'bad_days' }
  const until = plan === 'free' ? null : now + length * DAY
  db.prepare('update users set plan = ?, plan_until = ? where id = ?').run(plan as PlanId, until, user.id)
  return { ok: true, user: db.prepare('select * from users where id = ?').get(user.id) as UserRow }
}

export type AdminUser = { id: string; email: string; name: string; plan: string; planUntil: number | null; createdAt: number; exports: number; projects: number }

const USER_COLUMNS = `u.id, u.email, u.name, u.plan, u.plan_until, u.created_at,
  coalesce((select exports from usage where user_id = u.id and month = ?), 0) as exports,
  (select count(*) from projects where user_id = u.id) as projects`

type UserRowWithCounts = UserRow & { exports: number; projects: number }

function toAdminUser(row: UserRowWithCounts, now: number): AdminUser {
  return { id: row.id, email: row.email, name: row.name, plan: effectivePlan(row, now), planUntil: row.plan_until, createdAt: row.created_at, exports: row.exports, projects: row.projects }
}

export function overview(db: Db, now: number) {
  const month = monthKey(now)
  const total = (db.prepare('select count(*) as n from users').get() as { n: number }).n
  const thisMonth = (db.prepare('select count(*) as n from users where created_at >= ?').get(monthStart(now)) as { n: number }).n
  const plans: Record<PlanId, number> = { free: 0, creator: 0, pro: 0 }
  for (const row of db.prepare('select plan, plan_until from users').all() as Pick<UserRow, 'plan' | 'plan_until'>[]) {
    const plan = effectivePlan(row, now) as PlanId
    plans[plan in plans ? plan : 'free'] += 1
  }
  const exports = (db.prepare('select coalesce(sum(exports), 0) as n from usage where month = ?').get(month) as { n: number }).n
  const recent = (db.prepare(`select ${USER_COLUMNS} from users u order by u.created_at desc limit 20`).all(month) as UserRowWithCounts[]).map((row) => toAdminUser(row, now))
  return { users: { total, thisMonth }, plans, exports: { month, total: exports }, recent }
}

/** 메일·이름에 그 글자가 든 사람(최대 50명). % 와 _ 는 글자 그대로 찾는다. */
export function searchUsers(db: Db, query: string, now: number): AdminUser[] {
  const text = query.trim().toLowerCase().slice(0, 100)
  if (text === '') return []
  const pattern = `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
  const rows = db
    .prepare(`select ${USER_COLUMNS} from users u where lower(u.email) like ? escape '\\' or lower(u.name) like ? escape '\\' order by u.created_at desc limit 50`)
    .all(monthKey(now), pattern, pattern) as UserRowWithCounts[]
  return rows.map((row) => toAdminUser(row, now))
}

/** 자동 백업 목록(새것부터). 이 이름 꼴의 파일만. */
export function listBackups(dir: string | null): { name: string; bytes: number }[] {
  if (!dir) return []
  try {
    return readdirSync(dir)
      .filter((name) => BACKUP_FILE.test(name))
      .sort()
      .reverse()
      .map((name) => ({ name, bytes: statSync(join(dir, name)).size }))
  } catch {
    return []
  }
}
