import { release } from '../http'
import type { PulseEvent } from '../pulseEvents'

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
  messages: { open: number }
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

/** 쓰임 숫자(최근 7일)와 브라우저 오류 — 누가 했는지는 서버에도 없다(server/app/pulse.ts) */
export type AdminPulse = {
  days: string[]
  events: { event: PulseEvent; counts: number[]; total: number }[]
  exports: { agent: string; started: number; done: number; failed: number; unsupported: number }[]
  bots: number
}
export type AdminError = { fingerprint: string; message: string; stack: string; page: string; agent: string; version: string; count: number; firstAt: number; lastAt: number }

export async function fetchPulse(): Promise<AdminPulse | null> {
  return okJson<AdminPulse>(fetch('/api/admin/pulse', { cache: 'no-store' }))
}

export async function fetchErrors(): Promise<AdminError[] | null> {
  return (await okJson<{ errors: AdminError[] }>(fetch('/api/admin/errors', { cache: 'no-store' })))?.errors ?? null
}

export async function clearErrors(): Promise<boolean> {
  const response = await fetch('/api/admin/errors', { method: 'DELETE' }).catch(() => null)
  release(response)
  return response?.ok === true
}

/** 문의하기로 온 것(server/app/inbox.ts) — 최근 100개 */
export type AdminMessage = { id: number; createdAt: number; kind: 'question' | 'bug' | 'idea' | 'billing'; body: string; email: string | null; lang: string; page: string; doneAt: number | null }

export async function fetchMessages(): Promise<{ messages: AdminMessage[]; open: number } | null> {
  return okJson<{ messages: AdminMessage[]; open: number }>(fetch('/api/admin/messages', { cache: 'no-store' }))
}

export async function markMessage(id: number, done: boolean): Promise<boolean> {
  const response = await fetch(`/api/admin/messages/${id}/done`, { method: 'POST', headers: json, body: JSON.stringify({ done }) }).catch(() => null)
  release(response)
  return response?.ok === true
}

export async function removeMessage(id: number): Promise<boolean> {
  const response = await fetch(`/api/admin/messages/${id}`, { method: 'DELETE' }).catch(() => null)
  release(response)
  return response?.ok === true
}
