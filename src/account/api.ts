import { parseProject } from '../editor/projects'
import type { ProjectSource, SavedProject } from '../editor/projects'

/**
 * 앱 서버(/api — server/app)와 이야기하는 곳. 서버가 없으면(정적 사이트만 띄웠을 때) 계정 기능을 숨긴다.
 * 쿠키(로그인 유지)는 브라우저가 알아서 보낸다. 바꾸는 요청은 같은 사이트에서만 받으므로 다른 곳에서 부를 수 없다.
 */
export type Account = { id: string; email: string; name: string; plan: string; planUntil: number | null; createdAt: number }
export type Billing = { enforced: boolean; connected: boolean; provider: string | null }
export type Me = { user: Account | null; login: { google: boolean; dev: boolean }; billing: Billing; usage: { month: string; exports: number } | null; admin?: boolean }
export type RemoteSummary = { id: string; name: string; updatedAt: number; createdAt: number; duration: number; portrait: boolean; thumbnail: string | null; source: ProjectSource }

const json = { 'content-type': 'application/json' }

/** 서버가 없거나 응답이 이상하면 null(계정 기능을 쓸 수 없음). */
export async function fetchMe(signal?: AbortSignal): Promise<Me | null> {
  try {
    const response = await fetch('/api/me', { signal, cache: 'no-store' })
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return null
    const body = (await response.json()) as Me
    return body && typeof body === 'object' && 'login' in body ? body : null
  } catch {
    return null
  }
}

export const loginUrl = (next: string) => `/api/auth/google?next=${encodeURIComponent(next)}`

export async function devLogin(email: string, name: string): Promise<boolean> {
  const response = await fetch('/api/auth/dev', { method: 'POST', headers: json, body: JSON.stringify({ email, name }) })
  return response.ok
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
}

export async function deleteAccount(): Promise<boolean> {
  const response = await fetch('/api/account', { method: 'DELETE' }).catch(() => null)
  return response?.ok ?? false
}

export async function listRemote(): Promise<RemoteSummary[]> {
  const response = await fetch('/api/projects', { cache: 'no-store' })
  if (!response.ok) throw new Error(`projects ${response.status}`)
  return ((await response.json()) as { projects: RemoteSummary[] }).projects
}

export async function getRemote(id: string): Promise<SavedProject | null> {
  const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, { cache: 'no-store' })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`project ${response.status}`)
  return parseProject(((await response.json()) as { project: unknown }).project)
}

/** stale: 다른 기기에서 더 나중에 고친 판이 서버에 있다(덮지 않았다). */
export async function putRemote(project: SavedProject): Promise<'ok' | 'stale' | 'failed'> {
  try {
    const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}`, { method: 'PUT', headers: json, body: JSON.stringify(project) })
    if (response.ok) return 'ok'
    return response.status === 409 ? 'stale' : 'failed'
  } catch {
    return 'failed'
  }
}

/** 내보내기 허락(요금제 한도). 앱 서버가 없으면(정적 사이트만 띄움) 베타처럼 제한 없이. */
export type ExportPermit = { ok: true; watermark: boolean; remaining: number | null } | { ok: false; reason: 'login' | 'too_long' | 'limit' }

export async function requestExport(duration: number): Promise<ExportPermit> {
  try {
    const response = await fetch('/api/usage/export', { method: 'POST', headers: json, body: JSON.stringify({ duration }) })
    if (!response.headers.get('content-type')?.includes('application/json')) return { ok: true, watermark: false, remaining: null }
    const body = (await response.json()) as { ok?: boolean; watermark?: boolean; remaining?: number | null; error?: string }
    if (response.ok && body.ok) return { ok: true, watermark: body.watermark === true, remaining: body.remaining ?? null }
    if (body.error === 'login' || body.error === 'too_long' || body.error === 'limit') return { ok: false, reason: body.error }
    return { ok: true, watermark: false, remaining: null }
  } catch {
    return { ok: true, watermark: false, remaining: null }
  }
}

/** 영상을 다 만들었을 때 알린다(이번 달 횟수를 센다). 창을 닫아도 보내지게 keepalive. */
export function reportExportDone(): void {
  void fetch('/api/usage/export/done', { method: 'POST', headers: json, body: '{}', keepalive: true }).catch(() => undefined)
}

/** 카드 결제 화면 주소(결제사를 붙인 뒤). 준비 전이면 null. */
export async function startCheckout(plan: string, returnUrl: string): Promise<string | null> {
  const response = await fetch('/api/billing/checkout', { method: 'POST', headers: json, body: JSON.stringify({ plan, returnUrl }) }).catch(() => null)
  if (!response?.ok) return null
  return ((await response.json()) as { url?: string }).url ?? null
}

export async function deleteRemote(id: string): Promise<void> {
  await fetch(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => undefined)
}
