/**
 * 타임라인 계산(화면 없이 시험할 수 있게 따로 둔다 — Timeline.tsx 가 쓴다).
 * 배율(pps)은 1초가 몇 픽셀인지다. 짧은 영상은 화면에 꼭 맞게, 긴 영상은 MIN_PPS 로 그리고 가로로 밀어 본다.
 */
export const MIN_PPS = 28
export const MAX_PPS = 240
const ZOOM_STEP = 1.5

/** 처음 보이는 배율 */
export function basePps(width: number, duration: number): number {
  if (duration <= 0 || width <= 0) return 0
  return Math.max(width / duration, MIN_PPS)
}

/** 확대(1)·축소(-1) 한 걸음. 가장 작게는 화면에 꼭 맞게, 가장 크게는 MAX_PPS(꼭 맞는 배율이 더 크면 그 값). */
export function zoomPps(current: number, direction: 1 | -1, width: number, duration: number): number {
  const fit = duration > 0 ? width / duration : 0
  const highest = Math.max(MAX_PPS, fit)
  const next = direction > 0 ? current * ZOOM_STEP : current / ZOOM_STEP
  return Math.min(highest, Math.max(fit, next))
}

/**
 * 블록을 누른 자리(왼쪽에서 offset px)가 하는 일. 손가락(coarse)은 끝 영역을 넓게 잡되,
 * 좁은 블록에서는 가운데 옮기기 자리(16px, 마우스 8px)를 먼저 남긴다.
 */
export function dragMode(offset: number, width: number, coarse: boolean): 'move' | 'start' | 'end' {
  const edge = Math.max(0, Math.min(coarse ? 20 : 8, (width - (coarse ? 16 : 8)) / 2))
  if (offset < edge) return 'start'
  if (offset > width - edge) return 'end'
  return 'move'
}

const STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600]

/** 눈금 간격(초): 글자가 겹치지 않게 44px 이상 떨어지는 가장 촘촘한 간격 */
export function tickStep(pps: number): number {
  if (pps <= 0) return 1
  return STEPS.find((step) => step * pps >= 44) ?? STEPS[STEPS.length - 1]
}

export function tickLabel(second: number): string {
  if (second < 60) return `${second}s`
  return `${Math.floor(second / 60)}:${String(second % 60).padStart(2, '0')}`
}

/** 재생 머리(x)가 보이는 범위를 벗어났으면 밀 위치(머리가 왼쪽 10% 자리에 오게), 안이면 null */
export function scrollToShow(x: number, scrollLeft: number, viewWidth: number): number | null {
  if (x >= scrollLeft && x <= scrollLeft + viewWidth) return null
  return Math.max(0, Math.round(x - viewWidth * 0.1))
}
