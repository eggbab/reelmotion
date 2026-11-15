import type { Stroke, Theme } from './types'

/**
 * 그리는 판. u 는 크기의 기본 단위(짧은 변의 1.3%). 모든 크기를 u 로 적어 세로·가로 영상에서 같은 비율로 보이게 한다.
 * 1.3 은 실제 영상 위에 얹어 보고 정한 값이다(1% 는 작아 보였다).
 */
export const UNIT = 0.013
export type Frame = { ctx: CanvasRenderingContext2D; w: number; h: number; u: number; portrait: boolean }

export function makeFrame(ctx: CanvasRenderingContext2D, w: number, h: number): Frame {
  return { ctx, w, h, u: Math.min(w, h) * UNIT, portrait: h > w * 1.05 }
}

export function fontString(family: string, size: number, weight: number, italic = false): string {
  return `${italic ? 'italic ' : ''}${weight} ${Math.max(1, Math.round(size))}px ${family}`
}

const CJK = /[぀-ヿ㐀-鿿가-힯]/

/** 띄어쓰기 단위로 줄을 나눈다. 한 덩어리가 너무 길고 한·중·일 글자면 글자 단위로 자른다. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  const push = (piece: string) => {
    const next = line ? `${line} ${piece}` : piece
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line)
      line = piece
    } else {
      line = next
    }
  }
  for (const word of words) {
    if (ctx.measureText(word).width > maxWidth && CJK.test(word)) {
      let chunk = ''
      for (const char of word) {
        if (ctx.measureText(chunk + char).width > maxWidth && chunk) {
          push(chunk)
          chunk = ''
        }
        chunk += char
      }
      if (chunk) push(chunk)
    } else {
      push(word)
    }
  }
  if (line) lines.push(line)
  return lines
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, Math.max(0, w), Math.max(0, h), Math.max(0, Math.min(r, w / 2, h / 2)))
}

/** 디자인 묶음에 맞는 판을 깐다. none 이면 아무것도 깔지 않는다. */
export function fillPanel(f: Frame, theme: Theme, x: number, y: number, w: number, h: number, radius = theme.radius * f.u) {
  const { ctx } = f
  if (theme.panel === 'none' || w <= 0 || h <= 0) return
  ctx.save()
  if (theme.panel === 'glass') {
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 3 * f.u
    ctx.shadowOffsetY = 0.8 * f.u
  } else {
    ctx.shadowColor = 'rgba(0,0,0,0.18)'
    ctx.shadowBlur = 2 * f.u
    ctx.shadowOffsetY = 0.4 * f.u
  }
  roundRect(ctx, x, y, w, h, radius)
  ctx.fillStyle = theme.paper
  ctx.fill()
  ctx.shadowColor = 'transparent'
  if (theme.panel === 'glass') {
    ctx.lineWidth = Math.max(1, 0.12 * f.u)
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'
    ctx.stroke()
  }
  ctx.restore()
}

/** 글자 색: 판이 있으면 판 위 색, 없으면 영상 위 색 */
export function textColor(theme: Theme): string {
  return theme.panel === 'none' ? theme.onVideo : theme.ink
}

/**
 * 테두리(바깥부터) → 채우기 순서로 글자를 그린다.
 * 판이 없는 묶음에서 테두리도 없으면 영상 위에서 읽히도록 그림자를 준다.
 */
export function drawText(
  f: Frame,
  text: string,
  x: number,
  y: number,
  size: number,
  fill: string,
  outline: Stroke[],
  shadow: boolean,
) {
  const { ctx } = f
  ctx.save()
  ctx.lineJoin = 'round'
  for (const stroke of outline) {
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.width * size
    ctx.strokeText(text, x, y)
  }
  if (shadow && outline.length === 0) {
    ctx.shadowColor = 'rgba(0,0,0,0.6)'
    ctx.shadowBlur = size * 0.4
    ctx.shadowOffsetY = size * 0.04
  }
  ctx.fillStyle = fill
  ctx.fillText(text, x, y)
  ctx.restore()
}

/** 판이 없는 묶음이면 영상 위 글자로 본다(그림자나 테두리가 필요) */
export const needsShadow = (theme: Theme) => theme.panel === 'none'

export function caseFor(theme: Theme, text: string): string {
  return theme.upper ? text.toUpperCase() : text
}

/** 그래픽 안에 들어갈 수 없을 만큼 긴 글은 줄여서 끝에 … 을 붙인다 */
export function clampText(text: string, max: number): string {
  const chars = [...text.trim()]
  return chars.length > max ? `${chars.slice(0, max - 1).join('').trimEnd()}…` : text.trim()
}
