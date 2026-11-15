/**
 * 관리자 화면이 앱 서버(/api/admin — server/app/app.ts)와 이야기하는 곳. 관리자가 아니면 서버가 401·403 을 준다.
 */
export type AdminCheck = { id: 'web' | 'asr' | 'assist' | 'disk' | 'backup'; ok: boolean; detail: string; since: number }
export type AdminUser = { id: string; email: string; name: string; plan: string; planUntil: number | null; createdAt: number; exports: number; projects: number }
export type AdminOverview = {
  status: { checkedAt: number | null; checks: AdminCheck[] }
  users: { total: number; thisMonth: number }
  plans: Record<'free' | 'creator' | 'pro', number>
  exports: { month: string; total: number }
  recent: AdminUser[]
  backups: { name: string; bytes: number }[]
  alerts: { email: string | null; mail: boolean }
  settings: { enforced: boolean; billing: boolean; googleLogin: boolean }
}

const json = { 'content-type': 'application/json' }

export async function fetchOverview(): Promise<AdminOverview | null> {
  const response = await fetch('/api/admin/overview', { cache: 'no-store' }).catch(() => null)
  return response?.ok ? ((await response.json()) as AdminOverview) : null
}

export async function findUsers(query: string): Promise<AdminUser[] | null> {
  const response = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`, { cache: 'no-store' }).catch(() => null)
  return response?.ok ? ((await response.json()) as { users: AdminUser[] }).users : null
}

export type PlanError = 'no_user' | 'bad_plan' | 'bad_days' | 'failed'

export async function changePlan(email: string, plan: string, days: number | undefined): Promise<{ ok: true } | { ok: false; error: PlanError }> {
  const response = await fetch('/api/admin/plan', { method: 'POST', headers: json, body: JSON.stringify({ email, plan, days }) }).catch(() => null)
  if (response?.ok) return { ok: true }
  const error = ((await response?.json().catch(() => null)) as { error?: string } | null)?.error
  return { ok: false, error: error === 'no_user' || error === 'bad_plan' || error === 'bad_days' ? error : 'failed' }
}

export async function sendTestAlert(): Promise<{ ok: true } | { ok: false; reason: 'not_set_up' | 'failed'; message: string }> {
  const response = await fetch('/api/admin/test-alert', { method: 'POST', headers: json, body: '{}' }).catch(() => null)
  if (response?.ok) return { ok: true }
  if (response?.status === 503) return { ok: false, reason: 'not_set_up', message: '' }
  const body = (await response?.json().catch(() => null)) as { message?: string } | null
  return { ok: false, reason: 'failed', message: body?.message ?? String(response?.status ?? 'network') }
}

export const backupUrl = (name: string) => `/api/admin/backups/${encodeURIComponent(name)}`
