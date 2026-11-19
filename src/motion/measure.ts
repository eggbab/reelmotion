import { IN_SECONDS, OUT_SECONDS } from './ease'
import { renderGraphics } from './render'
import type { Graphic, Side, Theme } from './types'

/** 화면에서 차지하는 상자(0~1 비율): [왼쪽, 위, 오른쪽, 아래] */
export type DrawnBox = [x1: number, y1: number, x2: number, y2: number]

/** 재는 판의 가로(픽셀). 작게 그려도 자리는 같다(크기는 화면 비율로 정해진다 — paint.ts 의 u) */
const WIDTH = 320
let board: HTMLCanvasElement | OffscreenCanvas | null = null

/**
 * 그래픽 하나를 그 쪽(side)에 놓고 실제로 그려 보아 차지하는 상자를 잰다 — 글 길이·스타일마다 크기가 달라서
 * 어림 자리(src/faces/track.ts 의 REGIONS)보다 정확하다. 다 나온 모습(사라지기 직전)을 잰다. 브라우저에서만 쓴다.
 * 아무것도 그려지지 않으면 null.
 */
export function measureGraphic(graphic: Graphic, side: Side, aspect: number, theme: Theme): DrawnBox | null {
  const width = WIDTH
  const height = Math.max(1, Math.round(WIDTH / aspect))
  board ??= typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(width, height) : document.createElement('canvas')
  if (board.width !== width) board.width = width
  if (board.height !== height) board.height = height
  const ctx = board.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | null
  if (!ctx) return null
  const span = graphic.end - graphic.start
  const t = span > IN_SECONDS + OUT_SECONDS ? graphic.end - OUT_SECONDS - 0.05 : graphic.start + span / 2
  ctx.clearRect(0, 0, width, height)
  renderGraphics(ctx, width, height, [{ ...graphic, side }], t, theme)
  const pixels = ctx.getImageData(0, 0, width, height).data
  let left = width
  let top = height
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] <= 24) continue
      if (x < left) left = x
      if (x > right) right = x
      if (y < top) top = y
      if (y > bottom) bottom = y
    }
  }
  if (right < 0) return null
  return [left / width, top / height, (right + 1) / width, (bottom + 1) / height]
}
