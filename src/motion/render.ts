import { OUT_SECONDS } from './ease'
import { makeFrame } from './paint'
import { drawBars, drawCallout, drawCaptions, drawList, drawLowerThird, drawQuote, drawStat, drawTitle } from './templates'
import type { Graphic, Theme } from './types'

/** 자막은 다른 그래픽 위에 놓는다 */
const LAYER: Record<Graphic['kind'], number> = {
  callout: 0,
  bars: 1,
  list: 1,
  stat: 1,
  quote: 1,
  title: 2,
  lowerThird: 3,
  captions: 4,
}

export function isVisible(graphic: Graphic, t: number): boolean {
  // 자막은 말이 끝난 뒤 잠깐 남는다(segment.ts 의 HOLD).
  const tail = graphic.kind === 'captions' ? OUT_SECONDS + 0.05 : 0
  return t >= graphic.start && t < graphic.end + tail
}

/** 시각 t 의 모든 그래픽을 그린다. 미리보기·소개 페이지·내보내기가 같은 함수를 쓴다. */
export function renderGraphics(ctx: CanvasRenderingContext2D, w: number, h: number, graphics: Graphic[], t: number, theme: Theme) {
  const f = makeFrame(ctx, w, h)
  const visible = graphics.filter((graphic) => isVisible(graphic, t)).sort((a, b) => LAYER[a.kind] - LAYER[b.kind])
  for (const graphic of visible) {
    ctx.save()
    switch (graphic.kind) {
      case 'title':
        drawTitle(f, graphic, t, theme)
        break
      case 'lowerThird':
        drawLowerThird(f, graphic, t, theme)
        break
      case 'stat':
        drawStat(f, graphic, t, theme)
        break
      case 'bars':
        drawBars(f, graphic, t, theme)
        break
      case 'list':
        drawList(f, graphic, t, theme)
        break
      case 'callout':
        drawCallout(f, graphic, t, theme)
        break
      case 'quote':
        drawQuote(f, graphic, t, theme)
        break
      case 'captions':
        drawCaptions(f, graphic, t, theme)
        break
    }
    ctx.restore()
  }
}
