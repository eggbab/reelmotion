import { entrance, wordPop } from './animate'
import { layoutLines } from './layout'
import { activeWordIndex } from './segment'
import type { CaptionStyle, Cue } from './types'

const SPACE = 0.28
const LINE_HEIGHT = 1.28
const MAX_WIDTH = 0.88

export function fontSpec(style: CaptionStyle, px: number): string {
  return `${style.fontWeight} ${px}px ${style.fontFamily}`
}

/**
 * 시각 t 의 자막 한 덩어리를 그린다. 미리보기와 내보내기가 같은 함수를 쓴다.
 * width · height 는 영상의 실제 픽셀 크기.
 */
export function drawCaption(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cue: Cue,
  t: number,
  style: CaptionStyle,
): void {
  const size = Math.round(style.fontSize * height)
  ctx.save()
  ctx.font = fontSpec(style, size)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'

  const widths = cue.words.map((word) => ctx.measureText(word.text).width)
  const space = size * SPACE
  const lines = layoutLines(widths, space, width * MAX_WIDTH)
  const lineHeight = size * LINE_HEIGHT

  const placed: { index: number; cx: number; cy: number }[] = []
  let widest = 0
  lines.forEach((indexes, lineIndex) => {
    const lineWidth = indexes.reduce((sum, i) => sum + widths[i], 0) + space * (indexes.length - 1)
    widest = Math.max(widest, lineWidth)
    const cy = (lineIndex - (lines.length - 1) / 2) * lineHeight
    let x = -lineWidth / 2
    for (const index of indexes) {
      placed.push({ index, cx: x + widths[index] / 2, cy })
      x += widths[index] + space
    }
  })

  const pose = entrance(style.entrance, t - cue.start)
  const active = activeWordIndex(cue, t)
  ctx.translate(width / 2 + pose.dx * size, style.position * height + pose.dy * size)
  ctx.scale(pose.scale, pose.scale)
  ctx.globalAlpha = pose.alpha

  if (style.box) {
    const boxWidth = widest + style.box.paddingX * size * 2
    const boxHeight = lines.length * lineHeight + style.box.paddingY * size * 2
    ctx.fillStyle = style.box.color
    ctx.beginPath()
    ctx.roundRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, style.box.radius * size)
    ctx.fill()
  }

  const eachWord = (draw: (text: string, isActive: boolean) => void, offsetY = 0) => {
    for (const { index, cx, cy } of placed) {
      const word = cue.words[index]
      const isActive = index === active
      const scale = isActive && style.wordPop ? wordPop(t - word.start) : 1
      ctx.save()
      ctx.translate(cx, cy + offsetY)
      ctx.scale(scale, scale)
      draw(word.text, isActive)
      ctx.restore()
    }
  }

  // 겹치는 옆 어절의 테두리가 글자를 덮지 않게: 그림자 → 테두리(바깥부터) → 글자 순으로 전부 한 겹씩.
  const outer = style.strokes[0]
  if (style.shadow) {
    const { color, offsetY } = style.shadow
    ctx.fillStyle = color
    ctx.strokeStyle = color
    ctx.lineWidth = (outer?.width ?? 0) * size
    eachWord((text) => {
      if (outer) ctx.strokeText(text, 0, 0)
      ctx.fillText(text, 0, 0)
    }, offsetY * size)
  }
  for (const layer of style.strokes) {
    ctx.strokeStyle = layer.color
    ctx.lineWidth = layer.width * size
    eachWord((text) => ctx.strokeText(text, 0, 0))
  }
  eachWord((text, isActive) => {
    ctx.fillStyle = isActive ? style.activeFill : style.fill
    ctx.fillText(text, 0, 0)
  })

  ctx.restore()
}
