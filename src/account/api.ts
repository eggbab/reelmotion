import { parseProject } from '../editor/projects'
import type { ProjectSource, SavedProject } from '../editor/projects'

/**
 * 앱 서버(/api — server/app)와 이야기하는 곳. 서버가 없으면(정적 사이트만 띄웠을 때) 계정 기능을 숨긴다.
 * 쿠키(로그인 유지)는 브라우저가 알아서 보낸다. 바꾸는 요청은 같은 사이트에서만 받으므로 다른 곳에서 부를 수 없다.
 */
export type Account = { id: string; email: string; name: string; plan: string; planUntil: number | null; createdAt: number }
export type Me = { user: Account | null; login: { google: boolean; dev: boolean } }
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

export async function deleteRemote(id: string): Promise<void> {
  await fetch(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => undefined)
}
