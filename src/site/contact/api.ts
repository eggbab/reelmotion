import { release } from '../../http'
import type { Lang } from '../../langs'
import type { ContactKind } from './rules'

export type ContactDraft = { kind: ContactKind; body: string; email: string; lang: Lang; page: string; website: string }
/** ok: 받음 · rate_limited: 10분에 5번을 넘음 · unavailable: 오늘 다 받았거나 앱 서버가 없음(정적 사이트만) · failed: 그 밖 */
export type ContactResult = 'ok' | 'rate_limited' | 'unavailable' | 'failed'

/** 문의 보내기(server/app/app.ts 의 POST /api/contact) */
export async function sendContact(draft: ContactDraft, signal?: AbortSignal): Promise<ContactResult> {
  const response = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(draft), signal }).catch(() => null)
  release(response)
  if (!response) return 'failed'
  if (response.ok) return 'ok'
  if (response.status === 429) return 'rate_limited'
  // 503: 오늘 받을 만큼 받음 · 404·405: 앱 서버 없이 사이트만 떠 있음
  if (response.status === 503 || response.status === 404 || response.status === 405) return 'unavailable'
  return 'failed'
}

/** 어느 쪽에서 왔는지(같은 사이트일 때만, 물음표 뒤는 빼고) — 고장 신고가 어느 화면 이야기인지 알려고 */
export function fromPage(referrer: string, origin: string): string {
  try {
    const url = new URL(referrer)
    return url.origin === origin ? url.pathname : ''
  } catch {
    return ''
  }
}
