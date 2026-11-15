import { UNIT } from './paint'

export const WATERMARK_FONT = `600 32px 'DM Sans Variable', sans-serif`

/**
 * 무료 요금제 내보내기의 표시(요금제 한도를 켰을 때만 — src/site/entitlements.ts). 오른쪽 아래에 작게:
 * 반투명 검은 알약 안에 재생 표시와 「ReelMotion」. 크기는 그래픽과 같은 단위(짧은 변의 1.3%)로 세로·가로 영상에서 같게 보인다.
 */
export function drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const u = Math.min(width, height) * UNIT
  const font = 1.7 * u
  ctx.save()
  ctx.font = `600 ${font}px 'DM Sans Variable', sans-serif`
  const label = 'ReelMotion'
  const textWidth = ctx.measureText(label).width
  const icon = 1.5 * u
  const padX = 1.1 * u
  const pillHeight = 3.4 * u
  const pillWidth = padX * 2 + icon + 0.7 * u + textWidth
  const x = width - pillWidth - 2.2 * u
  const y = height - pillHeight - 2.2 * u
  ctx.globalAlpha = 0.85
  ctx.fillStyle = 'rgb(0 0 0 / 50%)'
  ctx.beginPath()
  ctx.roundRect(x, y, pillWidth, pillHeight, pillHeight / 2)
  ctx.fill()
  // 재생 표시(사이트 로고와 같은 모양)
  const ix = x + padX
  const iy = y + (pillHeight - icon * 0.8) / 2
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(ix, iy, icon, icon * 0.8, icon * 0.22)
  ctx.fill()
  ctx.fillStyle = '#0e0e13'
  ctx.beginPath()
  ctx.moveTo(ix + icon * 0.4, iy + icon * 0.22)
  ctx.lineTo(ix + icon * 0.4, iy + icon * 0.58)
  ctx.lineTo(ix + icon * 0.7, iy + icon * 0.4)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, ix + icon + 0.7 * u, y + pillHeight / 2 + u * 0.08)
  ctx.restore()
}
