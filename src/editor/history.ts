import type { Word } from '../captions/types'
import type { Graphic, ThemeId } from '../motion/types'

/**
 * 편집기의 되돌리기·다시 하기(Ctrl+Z · Ctrl+Shift+Z). 사람이 고친 것(그래픽·받아쓴 말·스타일)만 담는다 —
 * 편집기가 저절로 하는 것(얼굴을 피해 쪽 정하기, 자막 낱말 맞추기)은 담지 않는다. 그래서 되돌린 뒤에 저절로 하는 일이
 * 다시 일어나도 다시 하기가 사라지지 않는다. 화면 없이 되는 계산만 두고 EditorPage 가 부른다.
 */
export type Snapshot = { graphics: Graphic[]; script: string; recognized: Word[] | null; theme: ThemeId }

export type History = {
  /** 되돌릴 모습들(오래된 것부터) */
  past: Snapshot[]
  /** 다시 할 모습들(가까운 것부터) */
  future: Snapshot[]
  /** 마지막으로 고친 칸과 그때(같은 칸을 잇달아 고치면 한 번으로 묶는다) */
  key: string | null
  at: number
}

export const HISTORY_LIMIT = 100
/** 같은 칸을 이만큼(밀리초) 안에 다시 고치면 앞의 고치기에 묶는다 — 글자 하나하나·끄는 동안의 움직임이 따로 되돌려지지 않게 */
export const COALESCE_MS = 1000

export const emptyHistory = (): History => ({ past: [], future: [], key: null, at: 0 })

/**
 * 고치기 직전의 모습(before)을 남긴다. key 는 고친 칸의 이름(그래픽 번호 + 칸, 받아쓴 말 등) — 같은 칸을 잇달아 고치면
 * 처음 것만 남긴다. key 가 null 이면(그래픽 만들기·지우기·스타일 바꾸기처럼 한 번에 끝나는 고치기) 늘 따로 남긴다.
 */
export function record(history: History, before: Snapshot, key: string | null, now: number): History {
  if (key !== null && key === history.key && now - history.at < COALESCE_MS) return { ...history, future: [], at: now }
  return { past: [...history.past, before].slice(-HISTORY_LIMIT), future: [], key, at: now }
}

/** 되돌리기: 바로 앞의 모습. 지금 모습은 다시 하기로 간다. 되돌릴 것이 없으면 null */
export function undo(history: History, current: Snapshot): { history: History; snapshot: Snapshot } | null {
  const snapshot = history.past.at(-1)
  if (!snapshot) return null
  return { history: { past: history.past.slice(0, -1), future: [current, ...history.future].slice(0, HISTORY_LIMIT), key: null, at: 0 }, snapshot }
}

/** 다시 하기: 되돌리기 전의 모습. 다시 할 것이 없으면 null */
export function redo(history: History, current: Snapshot): { history: History; snapshot: Snapshot } | null {
  const snapshot = history.future[0]
  if (!snapshot) return null
  return { history: { past: [...history.past, current].slice(-HISTORY_LIMIT), future: history.future.slice(1), key: null, at: 0 }, snapshot }
}

/** 그래픽 하나를 고칠 때의 칸 이름: 「번호:바뀐 칸들」(끌기는 start·end, 글 고치기는 text …) */
export function changeKey(before: Graphic, after: Graphic): string {
  const a = before as unknown as Record<string, unknown>
  const b = after as unknown as Record<string, unknown>
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((key) => JSON.stringify(a[key]) !== JSON.stringify(b[key])).sort()
  return `${after.id}:${keys.join(',')}`
}
