import { release } from '../http'
import { THEMES } from '../motion/themes'
import type { ThemeId } from '../motion/types'
import { MAX_SCRIPT, isDraftId } from './plan'

/**
 * Claude·ChatGPT 커넥터가 만든 초안(?draft=)을 앱 서버에서 받는다(server/app/connect.ts 의 /api/drafts).
 *  - gone: 기한(7일)이 지났거나 없는 번호(404), 또는 쓸 수 없는 초안 — 다시 만들어야 한다.
 *  - failed: 서버에 닿지 못했거나 서버가 탈이 났다 — 링크는 살아 있을 수 있으니 「다시 열어 보세요」라고 알린다.
 * 어느 쪽이든 편집기는 빈 화면으로 그대로 쓸 수 있다.
 */
export type DraftResult = { status: 'ready'; script: string; theme: ThemeId } | { status: 'gone' } | { status: 'failed' }

const THEME_IDS = new Set<string>(THEMES.map((theme) => theme.id))

export async function fetchDraft(id: string): Promise<DraftResult> {
  if (!isDraftId(id)) return { status: 'gone' }
  try {
    const response = await fetch(`/api/drafts/${id}`, { cache: 'no-store' })
    if (!response.ok) {
      release(response)
      return { status: response.status === 404 ? 'gone' : 'failed' }
    }
    const { draft } = (await response.json()) as { draft?: { script?: unknown; theme?: unknown } }
    if (typeof draft?.script !== 'string' || draft.script.trim() === '' || draft.script.length > MAX_SCRIPT) return { status: 'gone' }
    return { status: 'ready', script: draft.script, theme: THEME_IDS.has(String(draft.theme)) ? (draft.theme as ThemeId) : 'neon' }
  } catch {
    return { status: 'failed' }
  }
}
