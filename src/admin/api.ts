import { release } from '../http'

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
  settings: { enforced: boolean; billing: boolean; googleLogin: boolean; connector: boolean }
}

const json = { 'content-type': 'application/json' }

/** 성공한 응답의 JSON, 아니면 null(읽지 않을 응답은 내려놓는다 — src/http.ts). */
async function okJson<T>(request: Promise<Response>): Promise<T | null> {
  const response = await request.catch(() => null)
  if (!response?.ok) {
    release(response)
    return null
  }
  return (await response.json()) as T
}

export async function fetchOverview(): Promise<AdminOverview | null> {
  return okJson<AdminOverview>(fetch('/api/admin/overview', { cache: 'no-store' }))
}

export async function findUsers(query: string): Promise<AdminUser[] | null> {
  return (await okJson<{ users: AdminUser[] }>(fetch(`/api/admin/users?q=${encodeURIComponent(query)}`, { cache: 'no-store' })))?.users ?? null
}

export type PlanError = 'no_user' | 'bad_plan' | 'bad_days' | 'failed'

export async function changePlan(email: string, plan: string, days: number | undefined): Promise<{ ok: true } | { ok: false; error: PlanError }> {
  const response = await fetch('/api/admin/plan', { method: 'POST', headers: json, body: JSON.stringify({ email, plan, days }) }).catch(() => null)
  if (response?.ok) {
    release(response)
    return { ok: true }
  }
  const error = ((await response?.json().catch(() => null)) as { error?: string } | null)?.error
  return { ok: false, error: error === 'no_user' || error === 'bad_plan' || error === 'bad_days' ? error : 'failed' }
}

export async function sendTestAlert(): Promise<{ ok: true } | { ok: false; reason: 'not_set_up' | 'failed'; message: string }> {
  const response = await fetch('/api/admin/test-alert', { method: 'POST', headers: json, body: '{}' }).catch(() => null)
  if (response?.ok || response?.status === 503) {
    release(response)
    return response.ok ? { ok: true } : { ok: false, reason: 'not_set_up', message: '' }
  }
  const body = (await response?.json().catch(() => null)) as { message?: string } | null
  return { ok: false, reason: 'failed', message: body?.message ?? String(response?.status ?? 'network') }
}

export const backupUrl = (name: string) => `/api/admin/backups/${encodeURIComponent(name)}`

export type AdminNotice = { active: boolean; level: 'info' | 'warning'; text: Record<'ko' | 'en' | 'ja', string>; version: number }

export async function fetchAdminNotice(): Promise<AdminNotice | null> {
  return (await okJson<{ notice: AdminNotice }>(fetch('/api/admin/notice', { cache: 'no-store' })))?.notice ?? null
}

export async function saveNotice(notice: Omit<AdminNotice, 'version'>): Promise<{ ok: true; notice: AdminNotice } | { ok: false; error: 'empty' | 'too_long' | 'failed' }> {
  const response = await fetch('/api/admin/notice', { method: 'PUT', headers: json, body: JSON.stringify(notice) }).catch(() => null)
  if (response?.ok) return { ok: true, notice: ((await response.json()) as { notice: AdminNotice }).notice }
  const error = ((await response?.json().catch(() => null)) as { error?: string } | null)?.error
  return { ok: false, error: error === 'empty' || error === 'too_long' ? error : 'failed' }
}
