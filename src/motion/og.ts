/**
 * 개발용: 공유 그림(1200×630, 링크를 붙이면 뜨는 그림)을 우리 그래픽 엔진으로 그린다(og.html, scripts/og.mjs).
 * 빌드에 들어가지 않는다. 왼쪽은 소개 페이지 첫 화면의 제목, 오른쪽은 예시 영상 위에 실제로 그린 그래픽.
 */
import type { Lang } from '../langs'
import { pageMeta } from '../site/meta'
import { SITE_COPY } from '../site/copy'
import { demo } from '../site/demos'
import { loadFontsFor, loadFontsForGraphics } from './fonts'
import { renderGraphics } from './render'
import { themeById } from './themes'

const params = new URLSearchParams(location.search)
const lang = (params.get('lang') ?? 'en') as Lang
const at = Number(params.get('t') ?? '3.9')

const COLORS = { bg: '#0e0e13', text: '#f3f2ef', muted: '#8a8a93', mint: '#00ffdd' }
const FONT = `'DM Sans Variable', 'Pretendard JP Variable', sans-serif`

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** 낱말 단위로 줄을 나눈다. 일본어는 빈칸이 없어 낱말 경계(Intl.Segmenter)에서 나눈다(「モー/ション」처럼 끊기지 않게). */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const units = lang === 'ja' ? [...new Intl.Segmenter('ja', { granularity: 'word' }).segment(text)].map((part) => part.segment) : text.split(/(?<= )/)
  const lines: string[] = []
  let line = ''
  for (const unit of units) {
    if (line && ctx.measureText(line + unit).width > width) {
      lines.push(line.trimEnd())
      line = unit.trimStart()
    } else line += unit
  }
  if (line) lines.push(line.trimEnd())
  return lines
}

async function main() {
  const canvas = document.getElementById('og') as HTMLCanvasElement
  const ctx = canvas.getContext('2d')!
  const { width: W, height: H } = canvas
  const copy = SITE_COPY[lang]
  const headline = `${copy.hero.before}${copy.hero.words[0]}${copy.hero.after}`
  const sub = pageMeta('home', lang).title.split(' — ')[1] ?? ''

  const sample = demo('sleep', lang)
  const look = themeById(sample.theme)
  const poster = new Image()
  poster.src = `/media/${sample.clip}.jpg`
  await Promise.all([
    poster.decode(),
    loadFontsForGraphics(look, sample.graphics),
    document.fonts.load(`700 66px ${FONT}`, `ReelMotion${headline}`),
    document.fonts.load(`400 24px ${FONT}`, sub),
  ])
  await loadFontsFor(look, `${headline}${sub}`).catch(() => null)

  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, W, H)

  // 민트 빛(사이트의 .glow 와 같은 색·흐림)
  ctx.save()
  ctx.filter = 'blur(40px)'
  const glow = ctx.createRadialGradient(840, 300, 0, 840, 300, 520)
  glow.addColorStop(0, 'rgb(0 255 221 / 22%)')
  glow.addColorStop(0.6, 'rgb(0 255 221 / 0%)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)
  ctx.restore()

  // 오른쪽: 실제 영상 장면 + 우리 그래픽(1280×720 에 그려 줄인다)
  const frame = document.createElement('canvas')
  frame.width = 1280
  frame.height = 720
  const f = frame.getContext('2d')!
  f.drawImage(poster, 0, 0, frame.width, frame.height)
  renderGraphics(f, frame.width, frame.height, sample.graphics, at, look)
  const card = { x: 560, y: 128, w: 680, h: 383 }
  ctx.save()
  ctx.shadowColor = 'rgb(0 0 0 / 55%)'
  ctx.shadowBlur = 60
  ctx.shadowOffsetY = 24
  roundRect(ctx, card.x, card.y, card.w, card.h, 22)
  ctx.fillStyle = COLORS.bg
  ctx.fill()
  ctx.restore()
  ctx.save()
  roundRect(ctx, card.x, card.y, card.w, card.h, 22)
  ctx.clip()
  ctx.drawImage(frame, card.x, card.y, card.w, card.h)
  ctx.restore()
  roundRect(ctx, card.x + 0.5, card.y + 0.5, card.w - 1, card.h - 1, 22)
  ctx.strokeStyle = 'rgb(255 255 255 / 10%)'
  ctx.stroke()

  // 왼쪽: 로고
  const left = 72
  ctx.save()
  ctx.translate(left, 86)
  ctx.scale(1.5, 1.5)
  roundRect(ctx, 2, 4, 20, 16, 5)
  ctx.fillStyle = COLORS.text
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(10, 8.5)
  ctx.lineTo(10, 15.5)
  ctx.lineTo(16, 12)
  ctx.closePath()
  ctx.fillStyle = COLORS.bg
  ctx.fill()
  ctx.restore()
  ctx.fillStyle = COLORS.text
  ctx.font = `700 30px ${FONT}`
  ctx.letterSpacing = '-0.6px'
  ctx.textBaseline = 'middle'
  ctx.fillText('ReelMotion', left + 46, 104)

  // 제목(첫 화면과 같은 말)과 한 줄 설명
  ctx.textBaseline = 'alphabetic'
  ctx.font = `700 66px ${FONT}`
  ctx.letterSpacing = '-2.6px'
  const lines = wrap(ctx, headline, 440)
  let y = 300
  for (const line of lines) {
    ctx.fillText(line, left, y)
    y += 72
  }
  // 첫 화면처럼 바뀌는 낱말 밑에 민트 띠
  ctx.fillStyle = COLORS.mint
  ctx.fillRect(left, y - 52, 64, 6)
  ctx.fillStyle = COLORS.muted
  ctx.font = `400 24px ${FONT}`
  ctx.letterSpacing = '0px'
  for (const [index, line] of wrap(ctx, sub, 430).entries()) ctx.fillText(line, left, y + index * 34)

  document.body.dataset.ready = '1'
}
void main()
