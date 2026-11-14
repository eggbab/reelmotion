import type { Entrance } from './types'

export const ENTRANCE_SECONDS = 0.22
const WORD_POP_SECONDS = 0.16

/** dx · dy 는 글자 크기에 대한 비율. */
export type Pose = { scale: number; dx: number; dy: number; alpha: number }

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

function easeOutBack(x: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2
}

const easeOutCubic = (x: number) => 1 - (1 - x) ** 3

/** 자막이 뜬 지 elapsed 초 지났을 때의 자세. */
export function entrance(kind: Entrance, elapsed: number): Pose {
  const p = clamp01(elapsed / ENTRANCE_SECONDS)
  if (kind === 'none' || p >= 1) return { scale: 1, dx: 0, dy: 0, alpha: 1 }
  if (kind === 'slide') {
    return { scale: 1, dx: 0, dy: (1 - easeOutCubic(p)) * 0.6, alpha: p }
  }
  const scale = 0.6 + 0.4 * easeOutBack(p)
  const alpha = clamp01(p * 3)
  if (kind === 'shake') {
    const fade = 1 - p
    return { scale, dx: Math.sin(elapsed * 90) * 0.1 * fade, dy: Math.cos(elapsed * 70) * 0.06 * fade, alpha }
  }
  return { scale, dx: 0, dy: 0, alpha }
}

/** 어절이 시작된 지 elapsed 초 지났을 때의 크기 배율. */
export function wordPop(elapsed: number): number {
  const p = clamp01(elapsed / WORD_POP_SECONDS)
  return 1 + 0.22 * Math.sin(Math.PI * p)
}
