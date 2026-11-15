export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const outCubic = (x: number) => 1 - (1 - clamp01(x)) ** 3
export const outQuart = (x: number) => 1 - (1 - clamp01(x)) ** 4
export const outExpo = (x: number) => (x >= 1 ? 1 : 1 - 2 ** (-10 * clamp01(x)))
export const inCubic = (x: number) => clamp01(x) ** 3
export const inOutCubic = (x: number) => {
  const t = clamp01(x)
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2
}
export function outBack(x: number, overshoot = 1.7): number {
  const t = clamp01(x) - 1
  return 1 + (overshoot + 1) * t ** 3 + overshoot * t ** 2
}

export const IN_SECONDS = 0.6
export const OUT_SECONDS = 0.4

/** 그래픽이 들어오는 정도(0~1)와 나가는 정도(1~0). */
export function envelope(start: number, end: number, t: number) {
  return {
    local: t - start,
    enter: clamp01((t - start) / IN_SECONDS),
    exit: clamp01((end - t) / OUT_SECONDS),
  }
}
