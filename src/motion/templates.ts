import { wordPop } from '../captions/animate'
import { layoutLines } from '../captions/layout'
import { activeWordIndex, cueAt, wordsToCues } from '../captions/segment'
import { OUT_SECONDS, clamp01, envelope, inCubic, lerp, outBack, outCubic, outExpo, outQuart } from './ease'
import type { Frame } from './paint'
import { caseFor, drawText, fillPanel, fontString, needsShadow, roundRect, textColor, wrapText } from './paint'
import type {
  BarsGraphic,
  CalloutGraphic,
  CaptionsGraphic,
  ListGraphic,
  LowerThirdGraphic,
  QuoteGraphic,
  StatGraphic,
  Theme,
  TitleGraphic,
} from './types'

/** 글자를 테두리로 강조하는 묶음(서울·도쿄)은 미끄러지는 대신 톡 튀어나온다 */
const pops = (theme: Theme) => theme.outline.length > 0

/* ───────────── 제목 ───────────── */

export function drawTitle(f: Frame, g: TitleGraphic, t: number, theme: Theme) {
  const { ctx, w, h, u, portrait } = f
  const { local, exit } = envelope(g.start, g.end, t)
  const size = (theme.displayItalic ? 9 : 7.4) * u * (portrait ? 1.05 : 1)
  const lineHeight = size * (theme.displayItalic ? 1.02 : 1.12)
  const maxWidth = w * (portrait ? 0.86 : 0.6)
  const align: 'left' | 'center' = portrait ? 'center' : 'left'
  const left = w * 0.06
  const top = h * (portrait ? 0.15 : 0.12)

  ctx.save()
  ctx.font = fontString(theme.display, size, theme.displayWeight, theme.displayItalic)
  ctx.textBaseline = 'alphabetic'
  const text = caseFor(theme, g.text)
  const lines = wrapText(ctx, text, maxWidth).slice(0, 3)
  const space = ctx.measureText(' ').width
  const solid = theme.panel === 'solid'
  const padX = size * 0.32
  const padY = size * 0.14
  const fill = solid ? theme.ink : theme.onVideo
  const leave = 1 - exit
  let wordIndex = 0

  // 판 묶음이 아니면 제목 위에 짧은 강조 막대를 그어 시작을 알린다.
  if (!solid && !pops(theme)) {
    const bar = outQuart(local / 0.4) * (1 - inCubic(leave))
    const barX = align === 'left' ? left : w / 2 - size * 0.8
    ctx.fillStyle = theme.accent
    ctx.fillRect(barX, top - size * 0.42, size * 1.6 * bar, Math.max(2, size * 0.07))
  }

  lines.forEach((line, lineIndex) => {
    const words = line.split(' ')
    const widths = words.map((word) => ctx.measureText(word).width)
    const lineWidth = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1)
    const x0 = align === 'left' ? left : (w - lineWidth) / 2
    const baseline = top + lineHeight * (lineIndex + 0.8)

    if (solid) {
      const band = outQuart((local - lineIndex * 0.08) / 0.38) * (1 - inCubic(leave))
      fillPanel(f, theme, x0 - padX, baseline - size * 0.86 - padY, (lineWidth + padX * 2) * band, size * 1.1 + padY * 2, size * 0.08)
    }

    let x = x0
    words.forEach((word, i) => {
      const index = wordIndex++
      const appear = (local - 0.12 - index * 0.055) / 0.45
      const emphasized = g.emphasis === index
      ctx.save()
      if (pops(theme)) {
        const scale = outBack(appear, 2.2) * (1 - inCubic(leave))
        if (scale > 0.01) {
          ctx.translate(x + widths[i] / 2, baseline - size * 0.35)
          ctx.scale(scale, scale)
          drawText(f, word, -widths[i] / 2, size * 0.35, size, emphasized ? theme.accent : fill, theme.outline, false)
        }
      } else {
        // 줄 높이로 가린 상자 안에서 아래에서 위로 올라온다.
        ctx.beginPath()
        ctx.rect(x - size * 0.2, baseline - size * 1.05, widths[i] + size * 0.4, size * 1.35)
        ctx.clip()
        const rise = (1 - outCubic(appear)) * size * 1.1 - inCubic(leave) * size * 1.1
        if (emphasized && solid) {
          const mark = outQuart((local - 0.45) / 0.3)
          ctx.fillStyle = theme.accent
          ctx.fillRect(x - size * 0.1, baseline - size * 0.86 + rise, (widths[i] + size * 0.2) * mark, size * 1.1)
        }
        const color = emphasized ? (solid ? theme.accentInk : theme.accent) : fill
        if (appear > 0) drawText(f, word, x, baseline + rise, size, color, theme.outline, !solid)
      }
      ctx.restore()
      x += widths[i] + space
    })
  })
  ctx.restore()
}

/* ───────────── 이름 띠 ───────────── */

export function drawLowerThird(f: Frame, g: LowerThirdGraphic, t: number, theme: Theme) {
  const { ctx, w, h, u, portrait } = f
  const { local, exit } = envelope(g.start, g.end, t)
  const nameSize = 3.9 * u
  const roleSize = 2.4 * u
  const x = w * (portrait ? 0.07 : 0.05)
  const bottom = h * (portrait ? 0.68 : 0.8)

  ctx.save()
  ctx.font = fontString(theme.font, nameSize, theme.strongWeight)
  const name = caseFor(theme, g.name)
  const nameWidth = ctx.measureText(name).width
  ctx.font = fontString(theme.font, roleSize, theme.bodyWeight)
  const role = g.role ? caseFor(theme, g.role) : ''
  const roleWidth = role ? ctx.measureText(role).width : 0

  const padX = 2 * u
  const barWidth = 0.7 * u
  const height = role ? nameSize * 1.25 + roleSize * 1.6 + 1.6 * u : nameSize * 1.25 + 2.2 * u
  const width = Math.max(nameWidth, roleWidth) + padX * 2
  const top = bottom - height

  const bar = outCubic(local / 0.28) * exit
  const wipe = outQuart((local - 0.12) / 0.5) * outCubic(exit)

  ctx.fillStyle = theme.accent
  ctx.fillRect(x, top + height * (1 - bar), barWidth, height * bar)

  const panelX = x + barWidth
  if (theme.panel !== 'none') fillPanel(f, theme, panelX, top, width * wipe, height, 0.4 * u)

  ctx.beginPath()
  ctx.rect(panelX, top - nameSize, width * wipe + nameSize, height + nameSize * 2)
  ctx.clip()
  const shift = (1 - outCubic((local - 0.22) / 0.45)) * -4 * u
  ctx.font = fontString(theme.font, nameSize, theme.strongWeight)
  const ink = textColor(theme)
  drawText(f, name, panelX + padX + shift, top + nameSize * 1.12 + 0.6 * u, nameSize, ink, theme.outline, needsShadow(theme))
  if (role) {
    ctx.font = fontString(theme.font, roleSize, theme.bodyWeight)
    const roleY = top + nameSize * 1.25 + roleSize * 1.15 + 0.9 * u
    if (pops(theme)) {
      const tagW = roleWidth + roleSize * 0.8
      ctx.fillStyle = theme.accent
      roundRect(ctx, panelX + padX + shift - roleSize * 0.4, roleY - roleSize * 1.0, tagW, roleSize * 1.4, roleSize * 0.2)
      ctx.fill()
      drawText(f, role, panelX + padX + shift, roleY, roleSize, theme.accentInk, [], false)
    } else {
      drawText(f, role, panelX + padX + shift, roleY, roleSize, theme.panel === 'none' ? theme.muted : theme.muted, [], needsShadow(theme))
    }
  }
  ctx.restore()
}

/* ───────────── 숫자 ───────────── */

export function formatNumber(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals)
  const [whole, part] = fixed.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return part ? `${grouped}.${part}` : grouped
}

export function drawStat(f: Frame, g: StatGraphic, t: number, theme: Theme) {
  const { ctx, w, h, u, portrait } = f
  const { local, exit } = envelope(g.start, g.end, t)
  const ring = g.suffix.trim() === '%' && g.value > 0 && g.value <= 100
  const numberSize = (ring ? 8.6 : 11.5) * u
  const labelSize = 2.7 * u
  const cx = portrait ? w / 2 : w * 0.74
  const cy = h * (portrait ? 0.42 : 0.44)
  const radius = 11 * u

  const grow = outBack(local / 0.55, 1.4)
  const fade = outCubic(exit)
  const count = outExpo((local - 0.15) / 1.3)
  const current = g.value * count
  const text = `${g.prefix}${formatNumber(current, g.decimals)}${g.suffix}`

  ctx.save()
  ctx.globalAlpha = clamp01(local / 0.2) * fade
  ctx.translate(cx, cy)
  ctx.scale(lerp(0.86, 1, grow), lerp(0.86, 1, grow))

  ctx.font = fontString(theme.font, labelSize, theme.bodyWeight)
  const label = caseFor(theme, g.label)
  const labelLines = wrapText(ctx, label, 26 * u).slice(0, 2)
  const labelWidth = Math.max(0, ...labelLines.map((line) => ctx.measureText(line).width))
  ctx.font = fontString(theme.display, numberSize, theme.strongWeight, false)
  const finalWidth = ctx.measureText(`${g.prefix}${formatNumber(g.value, g.decimals)}${g.suffix}`).width

  const bodyHeight = ring ? radius * 2 : numberSize * 1.05
  const cardW = Math.max(ring ? radius * 2 : finalWidth, labelWidth) + 6 * u
  const cardH = bodyHeight + labelLines.length * labelSize * 1.35 + 6.5 * u
  fillPanel(f, theme, -cardW / 2, -cardH / 2, cardW, cardH)

  const bodyCenter = -cardH / 2 + 3 * u + bodyHeight / 2
  const ink = textColor(theme)
  if (ring) {
    ctx.lineCap = 'round'
    ctx.lineWidth = 1.5 * u
    ctx.strokeStyle = theme.panel === 'solid' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.16)'
    ctx.beginPath()
    ctx.arc(0, bodyCenter, radius - u, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = theme.accent
    ctx.beginPath()
    ctx.arc(0, bodyCenter, radius - u, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * current) / 100)
    ctx.stroke()
  }
  ctx.textAlign = 'center'
  ctx.font = fontString(theme.display, numberSize, theme.strongWeight, false)
  drawText(f, text, 0, bodyCenter + numberSize * 0.36, numberSize, ring ? ink : theme.panel === 'solid' ? theme.ink : theme.accent, theme.outline, needsShadow(theme))
  ctx.font = fontString(theme.font, labelSize, theme.bodyWeight)
  labelLines.forEach((line, i) => {
    drawText(f, line, 0, bodyCenter + bodyHeight / 2 + 2.6 * u + labelSize * (i + 0.7) * 1.3, labelSize, theme.panel === 'none' ? theme.onVideo : theme.muted, theme.outline.length ? [theme.outline[0]] : [], needsShadow(theme))
  })
  ctx.restore()
}

/* ───────────── 막대 차트 ───────────── */

export function drawBars(f: Frame, g: BarsGraphic, t: number, theme: Theme) {
  const { ctx, w, h, u, portrait } = f
  const { local, exit } = envelope(g.start, g.end, t)
  const items = g.items.slice(0, 5)
  const max = Math.max(...items.map((item) => item.value), 1)
  const width = portrait ? w * 0.84 : Math.min(w * 0.4, 46 * u)
  const titleSize = 3 * u
  const labelSize = 2.3 * u
  const rowH = 6.6 * u
  const pad = 3 * u
  const titleBlock = g.title ? titleSize * 1.6 : 0
  const height = pad * 2 + titleBlock + rowH * items.length
  const x = portrait ? (w - width) / 2 : w * 0.94 - width
  const y = portrait ? h * 0.3 : (h - height) / 2

  ctx.save()
  ctx.globalAlpha = clamp01(local / 0.25) * outCubic(exit)
  const lift = (1 - outCubic(local / 0.5)) * 3 * u
  ctx.translate(0, lift)
  fillPanel(f, theme, x, y, width, height)
  const ink = textColor(theme)
  const shadow = needsShadow(theme)
  if (g.title) {
    ctx.font = fontString(theme.font, titleSize, theme.strongWeight)
    drawText(f, caseFor(theme, g.title), x + pad, y + pad + titleSize, titleSize, ink, theme.outline, shadow)
  }

  items.forEach((item, i) => {
    const rowTop = y + pad + titleBlock + i * rowH
    const grow = outCubic((local - 0.3 - i * 0.12) / 0.9)
    ctx.font = fontString(theme.font, labelSize, theme.bodyWeight)
    drawText(f, caseFor(theme, item.label), x + pad, rowTop + labelSize * 1.1, labelSize, theme.panel === 'none' ? theme.onVideo : theme.muted, [], shadow)
    const trackY = rowTop + labelSize * 1.6
    const trackW = width - pad * 2
    const barH = 2.2 * u
    ctx.fillStyle = theme.panel === 'solid' ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.12)'
    roundRect(ctx, x + pad, trackY, trackW, barH, barH / 2)
    ctx.fill()
    ctx.fillStyle = theme.accent
    roundRect(ctx, x + pad, trackY, trackW * (item.value / max) * grow, barH, barH / 2)
    ctx.fill()
    ctx.textAlign = 'right'
    ctx.font = fontString(theme.font, labelSize, theme.strongWeight)
    drawText(f, `${formatNumber(item.value * grow, Number.isInteger(item.value) ? 0 : 1)}${g.unit}`, x + width - pad, rowTop + labelSize * 1.1, labelSize, ink, [], shadow)
    ctx.textAlign = 'left'
  })
  ctx.restore()
}

/* ───────────── 목록 ───────────── */

export function drawList(f: Frame, g: ListGraphic, t: number, theme: Theme) {
  const { ctx, w, h, u, portrait } = f
  const { local, exit } = envelope(g.start, g.end, t)
  const items = g.items.slice(0, 5)
  const width = portrait ? w * 0.84 : Math.min(w * 0.42, 48 * u)
  const titleSize = 3 * u
  const itemSize = 2.8 * u
  const rowH = itemSize * 2.1
  const pad = 3 * u
  ctx.save()
  ctx.font = fontString(theme.font, itemSize, theme.bodyWeight)
  const height = pad * 2 + (g.title ? titleSize * 1.9 : 0) + rowH * items.length
  const x = portrait ? (w - width) / 2 : w * 0.06
  const y = portrait ? h * 0.24 : (h - height) / 2

  ctx.globalAlpha = clamp01(local / 0.25) * outCubic(exit)
  fillPanel(f, theme, x, y, width * outQuart(local / 0.45), height)
  const ink = textColor(theme)
  const shadow = needsShadow(theme)
  if (g.title) {
    ctx.font = fontString(theme.font, titleSize, theme.strongWeight)
    drawText(f, caseFor(theme, g.title), x + pad, y + pad + titleSize, titleSize, ink, theme.outline, shadow)
  }
  items.forEach((item, i) => {
    const at = g.itemTimes?.[i] ?? g.start + 0.5 + i * 0.6
    const appear = (t - at) / 0.4
    if (appear <= 0) return
    const rowY = y + pad + (g.title ? titleSize * 1.9 : 0) + i * rowH
    const slide = (1 - outCubic(appear)) * -3 * u
    ctx.save()
    ctx.globalAlpha *= clamp01(appear * 1.5)
    const dot = outBack(appear, 2.4)
    const cx = x + pad + itemSize * 0.55 + slide
    const cy = rowY + itemSize * 0.75
    ctx.fillStyle = theme.accent
    ctx.beginPath()
    ctx.arc(cx, cy, itemSize * 0.55 * dot, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = theme.accentInk
    ctx.lineWidth = itemSize * 0.13
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(cx - itemSize * 0.24, cy)
    ctx.lineTo(cx - itemSize * 0.06, cy + itemSize * 0.2)
    ctx.lineTo(cx + itemSize * 0.26, cy - itemSize * 0.18)
    ctx.stroke()
    ctx.font = fontString(theme.font, itemSize, theme.bodyWeight)
    const text = wrapText(ctx, caseFor(theme, item), width - pad * 2 - itemSize * 1.8)[0] ?? ''
    drawText(f, text, x + pad + itemSize * 1.6 + slide, cy + itemSize * 0.36, itemSize, ink, theme.outline.length ? [theme.outline[0]] : [], shadow)
    ctx.restore()
  })
  ctx.restore()
}

/* ───────────── 가리키기 ───────────── */

export function drawCallout(f: Frame, g: CalloutGraphic, t: number, theme: Theme) {
  const { ctx, w, h, u } = f
  const { local, exit } = envelope(g.start, g.end, t)
  const px = g.x * w
  const py = g.y * h
  const toLeft = g.x > 0.6
  const ex = px + (toLeft ? -16 : 16) * u
  const ey = py - 11 * u
  const size = 2.6 * u
  const fade = outCubic(exit)

  ctx.save()
  ctx.globalAlpha = fade
  // 맥박처럼 퍼지는 고리
  const pulse = (local % 1.4) / 1.4
  ctx.strokeStyle = theme.accent
  ctx.lineWidth = 0.4 * u
  ctx.globalAlpha = fade * (1 - pulse) * clamp01(local / 0.3)
  ctx.beginPath()
  ctx.arc(px, py, (1.6 + pulse * 3.4) * u, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = fade
  ctx.fillStyle = theme.accent
  ctx.beginPath()
  ctx.arc(px, py, 1.1 * u * outBack(local / 0.35, 2.5), 0, Math.PI * 2)
  ctx.fill()

  const draw = outCubic((local - 0.2) / 0.35)
  ctx.lineWidth = 0.35 * u
  ctx.beginPath()
  ctx.moveTo(px, py)
  ctx.lineTo(lerp(px, ex, draw), lerp(py, ey, draw))
  ctx.stroke()

  ctx.font = fontString(theme.font, size, theme.strongWeight)
  const text = caseFor(theme, g.text)
  const textW = ctx.measureText(text).width
  const pillW = (textW + size * 1.4) * outQuart((local - 0.45) / 0.4)
  const pillH = size * 2
  const pillX = toLeft ? ex - pillW : ex
  if (pillW > 1) {
    ctx.fillStyle = theme.accent
    roundRect(ctx, pillX, ey - pillH / 2, pillW, pillH, pillH / 2)
    ctx.fill()
    ctx.save()
    ctx.beginPath()
    ctx.rect(pillX, ey - pillH / 2, pillW, pillH)
    ctx.clip()
    drawText(f, text, (toLeft ? ex - textW - size * 0.7 : ex + size * 0.7), ey + size * 0.36, size, theme.accentInk, [], false)
    ctx.restore()
  }
  ctx.restore()
}

/* ───────────── 인용 ───────────── */

export function drawQuote(f: Frame, g: QuoteGraphic, t: number, theme: Theme) {
  const { ctx, w, h, u, portrait } = f
  const { local, exit } = envelope(g.start, g.end, t)
  const size = (theme.displayItalic ? 5.6 : 4.4) * u
  const maxWidth = w * (portrait ? 0.78 : 0.56)
  ctx.save()
  ctx.font = fontString(theme.display, size, theme.displayWeight, theme.displayItalic)
  const lines = wrapText(ctx, caseFor(theme, `${g.text}`), maxWidth).slice(0, 4)
  const lineH = size * 1.22
  const authorSize = 2.3 * u
  const height = lines.length * lineH + (g.author ? authorSize * 2.6 : 0) + 8 * u
  const width = Math.max(...lines.map((line) => ctx.measureText(line).width)) + 8 * u
  const x = (w - width) / 2
  const y = (h - height) / 2 - (portrait ? h * 0.04 : 0)
  ctx.globalAlpha = outCubic(exit)
  fillPanel(f, theme, x, y, width, height)
  ctx.fillStyle = theme.accent
  ctx.font = fontString("'Instrument Serif', serif", 12 * u, 400)
  ctx.globalAlpha *= clamp01(local / 0.3)
  ctx.fillText('“', x + 2 * u, y + 9 * u)
  ctx.globalAlpha = outCubic(exit)
  ctx.font = fontString(theme.display, size, theme.displayWeight, theme.displayItalic)
  const ink = textColor(theme)
  lines.forEach((line, i) => {
    const appear = outCubic((local - 0.2 - i * 0.12) / 0.5)
    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y + 4 * u + i * lineH, width, lineH * 1.1)
    ctx.clip()
    drawText(f, line, x + 4 * u, y + 4 * u + i * lineH + size * 0.95 + (1 - appear) * lineH, size, ink, theme.outline, needsShadow(theme))
    ctx.restore()
  })
  if (g.author) {
    ctx.font = fontString(theme.font, authorSize, theme.bodyWeight)
    ctx.globalAlpha *= clamp01((local - 0.6) / 0.4)
    drawText(f, `— ${g.author}`, x + 4 * u, y + 4 * u + lines.length * lineH + authorSize * 1.6, authorSize, theme.panel === 'none' ? theme.onVideo : theme.muted, [], needsShadow(theme))
  }
  ctx.restore()
}

/* ───────────── 자막 ───────────── */

const SPACE = 0.3
const LINE = 1.22

export function drawCaptions(f: Frame, g: CaptionsGraphic, t: number, theme: Theme) {
  const { ctx, w, h, u, portrait } = f
  const style = theme.caption
  const cues = wordsToCues(g.words, { maxChars: portrait ? 16 : 30 })
  const cue = cueAt(cues, t)
  if (!cue) return
  const size = (portrait ? 4.6 : 3.8) * u * (style.upper ? 0.92 : 1)
  ctx.save()
  ctx.font = fontString(style.font, size, style.weight)
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.lineJoin = 'round'
  const words = cue.words.map((word) => (style.upper ? word.text.toUpperCase() : word.text))
  const widths = words.map((word) => ctx.measureText(word).width)
  const space = size * SPACE
  // 일본어처럼 붙여 쓰는 낱말 사이에는 빈칸을 두지 않는다.
  const joins = cue.words.map((word) => Boolean(word.joinNext))
  const gap = (i: number) => (joins[i] ? 0 : space)
  const lines = layoutLines(widths, space, w * 0.86, joins)
  const lineH = size * LINE
  const centerY = h * (portrait ? 0.8 : 0.87) - ((lines.length - 1) * lineH) / 2
  const active = activeWordIndex(cue, t)
  const enter = outCubic((t - cue.start) / 0.18)
  const hold = OUT_SECONDS
  const leave = clamp01((cue.end + hold - t) / 0.15)
  ctx.globalAlpha = enter * leave
  ctx.translate(0, (1 - enter) * size * 0.25)

  const placed: { index: number; x: number; y: number }[] = []
  let widest = 0
  lines.forEach((indexes, lineIndex) => {
    const lineWidth = indexes.reduce((sum, i, k) => sum + widths[i] + (k < indexes.length - 1 ? gap(i) : 0), 0)
    widest = Math.max(widest, lineWidth)
    let x = (w - lineWidth) / 2
    for (const index of indexes) {
      placed.push({ index, x: x + widths[index] / 2, y: centerY + lineIndex * lineH })
      x += widths[index] + gap(index)
    }
  })

  if (style.box) {
    const bw = widest + size * 0.9
    const bh = lines.length * lineH + size * 0.4
    ctx.fillStyle = style.box
    roundRect(ctx, (w - bw) / 2, centerY - lineH / 2 - size * 0.2, bw, bh, size * 0.22)
    ctx.fill()
  }

  const each = (draw: (text: string, isActive: boolean) => void) => {
    for (const { index, x, y } of placed) {
      const isActive = index === active
      // 톡 튀는 크기를 절반으로 줄여 옆 낱말을 덮지 않게 한다(실제 말소리 영상에서 겹쳐 보였다).
      const scale = isActive && style.pop ? 1 + (wordPop(t - cue.words[index].start) - 1) * 0.5 : 1
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(scale, scale)
      draw(words[index], isActive)
      ctx.restore()
    }
  }
  for (const stroke of style.outline) {
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.width * size
    each((text) => ctx.strokeText(text, 0, 0))
  }
  if (!style.box && style.outline.length === 0) {
    ctx.shadowColor = 'rgba(0,0,0,0.6)'
    ctx.shadowBlur = size * 0.3
  }
  each((text, isActive) => {
    ctx.fillStyle = isActive ? style.active : style.fill
    ctx.fillText(text, 0, 0)
  })
  ctx.restore()
}
