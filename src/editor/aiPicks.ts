import { release } from '../http'
import { validatePicks } from './highlights'
import type { HighlightPick, HighlightSentence } from './highlights'

/** 「AI로 강조할 순간 찾기」를 서버(server/app/highlights.ts)에 묻는다. 서버가 검사한 답도 한 번 더 검사한다. */
export type HighlightRequest = { sentences: HighlightSentence[]; covered: boolean[]; duration: number }
export type HighlightResult = { ok: true; picks: HighlightPick[] } | { ok: false; reason: 'unavailable' | 'busy' | 'limited' | 'failed' }

export async function findHighlights(request: HighlightRequest): Promise<HighlightResult> {
  let response: Response
  try {
    response = await fetch('/api/assist/highlights', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) })
  } catch {
    return { ok: false, reason: 'failed' }
  }
  const body = (await response.json().catch(() => null)) as { picks?: unknown; error?: unknown } | null
  if (!body) release(response)
  if (response.ok && body && Array.isArray(body.picks)) return { ok: true, picks: validatePicks(body, request.sentences, request.covered, request.duration) }
  if (response.status === 429) return { ok: false, reason: 'limited' }
  if (response.status === 503) return { ok: false, reason: body?.error === 'busy' ? 'busy' : 'unavailable' }
  return { ok: false, reason: 'failed' }
}
