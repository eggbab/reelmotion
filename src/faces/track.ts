import type { Graphic, GraphicKind, Side } from '../motion/types'

/**
 * 그래픽이 말하는 사람의 얼굴을 가리지 않게: 영상에서 얼굴 자리를 찾고(faces.worker.ts — 이 브라우저 안에서, 영상은 어디로도 보내지 않는다),
 * 가로 영상에서 그래픽의 기본 자리가 얼굴을 가리면 반대쪽(side)으로 옮긴다. 이 파일은 화면 없이 되는 계산만 둔다.
 */
export type Box = [x1: number, y1: number, x2: number, y2: number]
/** 그 시각의 가장 큰 얼굴(0~1 비율). 없으면 null */
export type FaceSample = { t: number; box: Box | null }

const SCORE = 0.7
const OVERLAP = 0.3
/** 0~1 로 자르고 소수 셋째 자리까지(모델의 답은 32비트 숫자라 0.1 이 0.10000000149 로 온다) */
const clamp01 = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 1000) / 1000
const area = (box: Box) => Math.max(0, box[2] - box[0]) * Math.max(0, box[3] - box[1])
const intersect = (a: Box, b: Box) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]))
const iou = (a: Box, b: Box) => {
  const shared = intersect(a, b)
  return shared / Math.max(1e-9, area(a) + area(b) - shared)
}

/** UltraFace 의 답(점수 [배경, 얼굴] 짝 · 상자 [x1, y1, x2, y2])에서 얼굴 상자들. 겹치는 상자는 하나로, 큰 것부터 */
export function decodeFaces(scores: Float32Array, boxes: Float32Array, threshold = SCORE): Box[] {
  const found: { score: number; box: Box }[] = []
  for (let i = 0; i * 2 + 1 < scores.length; i++) {
    const score = scores[i * 2 + 1]
    if (score <= threshold) continue
    const box: Box = [clamp01(boxes[i * 4]), clamp01(boxes[i * 4 + 1]), clamp01(boxes[i * 4 + 2]), clamp01(boxes[i * 4 + 3])]
    if (area(box) > 0) found.push({ score, box })
  }
  found.sort((a, b) => b.score - a.score)
  const kept: Box[] = []
  for (const { box } of found) if (kept.every((other) => iou(other, box) < OVERLAP)) kept.push(box)
  return kept.sort((a, b) => area(b) - area(a))
}

/** 얼굴을 볼 시각: 1초마다(그 초의 가운데), 길면 max 개를 고르게 */
export function sampleTimes(duration: number, max = 120): number[] {
  if (!(duration > 0)) return []
  const count = Math.min(max, Math.max(1, Math.round(duration)))
  const step = duration / count
  return Array.from({ length: count }, (_, i) => Math.round((step * (i + 0.5)) * 1000) / 1000)
}

/**
 * 가로 영상에서 그래픽 종류마다 기본 자리(대략의 상자, 0~1)와 그 쪽. templates.ts 의 그리는 자리와 맞춘다.
 * 인용·자막(가운데·아래)과 가리키기(사람이 고른 점)는 옮기지 않는다.
 */
const REGIONS: Partial<Record<GraphicKind, { side: Side; box: Box }>> = {
  stat: { side: 'right', box: [0.58, 0.22, 0.9, 0.66] },
  bars: { side: 'right', box: [0.54, 0.25, 0.94, 0.75] },
  list: { side: 'left', box: [0.06, 0.25, 0.48, 0.75] },
  title: { side: 'left', box: [0.06, 0.08, 0.66, 0.38] },
  lowerThird: { side: 'left', box: [0.05, 0.66, 0.42, 0.82] },
}
const mirror = (box: Box): Box => [1 - box[2], box[1], 1 - box[0], box[3]]
const opposite = (side: Side): Side => (side === 'left' ? 'right' : 'left')

/** 그래픽이 보이는 동안의 장면들. 그 사이에 장면이 없으면(짧은 그래픽) 가장 가까운 장면 하나 */
function samplesDuring(track: FaceSample[], start: number, end: number): FaceSample[] {
  const inside = track.filter((sample) => sample.t >= start && sample.t <= end)
  if (inside.length > 0 || track.length === 0) return inside
  const middle = (start + end) / 2
  return [track.reduce((best, sample) => (Math.abs(sample.t - middle) < Math.abs(best.t - middle) ? sample : best))]
}

/**
 * 얼굴 상자를 머리 둘레로 넓힌다 — 모델은 얼굴(눈·코·입)만 잡지만, 그래픽이 머리카락·귀·헤드폰에 붙어도 답답해 보인다.
 * 옆으로 얼굴 폭의 25%씩, 위로 30%, 아래로 10%(2026-11-19 예시 영상 podcast-a 로 정함 — 숫자 판이 헤드폰에 붙었다).
 */
function headOf(face: Box): Box {
  const width = face[2] - face[0]
  const height = face[3] - face[1]
  return [clamp01(face[0] - width * 0.25), clamp01(face[1] - height * 0.3), clamp01(face[2] + width * 0.25), clamp01(face[3] + height * 0.1)]
}

/** 머리가 이 자리에 얼마나 가려지나(머리 넓이에 대한 겹친 넓이 — 장면들의 평균, 얼굴이 없는 장면은 0) */
function covered(samples: FaceSample[], region: Box): number {
  if (samples.length === 0) return 0
  return (
    samples.reduce((sum, sample) => {
      if (!sample.box) return sum
      const head = headOf(sample.box)
      return sum + intersect(head, region) / Math.max(1e-9, area(head))
    }, 0) / samples.length
  )
}

/** 얼굴을 피해 옮기는 종류의 기본 쪽(그 밖의 종류는 null — 옮기지 않는다) */
export function defaultSide(kind: GraphicKind): Side | null {
  return REGIONS[kind]?.side ?? null
}

/** 그래픽이 지금 놓인 쪽(가로 영상에서). 옮기지 않는 종류는 null */
export function sideOf(graphic: Graphic): Side | null {
  const fallback = defaultSide(graphic.kind)
  return fallback === null ? null : (graphic.side ?? fallback)
}

/** 아직 쪽을 정하지 않은 그래픽이 있나(얼굴을 찾아 볼 까닭이 있나) */
export function needsPlacement(graphics: Graphic[]): boolean {
  return graphics.some((graphic) => graphic.side === undefined && REGIONS[graphic.kind] !== undefined)
}

/** 그래픽이 그 쪽에 놓일 때 화면에서 차지하는 상자(0~1). 편집기는 실제로 그려 보고 잰다(src/motion/measure.ts) */
export type Measure = (graphic: Graphic, side: Side) => Box | null

/** 그려 보지 않고 셀 때: 종류마다의 어림 자리(REGIONS) */
export const regionMeasure: Measure = (graphic, side) => {
  const region = REGIONS[graphic.kind]
  if (!region) return null
  return side === region.side ? region.box : mirror(region.box)
}

/** 두 그래픽이 같은 때 보이나(0.2초 넘게 겹치나) */
const together = (a: Graphic, b: Graphic) => Math.min(a.end, b.end) - Math.max(a.start, b.start) > 0.2
/**
 * 두 그래픽이 부딪히나: 가로·세로 모두 이만큼(화면 비율) 넘게 파고들어야 한다. 그려 본 상자에는 옅은 그림자·빛이 들어 있어
 * 가장자리끼리 닿기만 해도 조금 겹친다(숫자 판의 그림자가 이름표 위끝에 0.03 쯤) — 그건 부딪힘이 아니다.
 */
const bumps = (a: Box, b: Box) => Math.min(a[2], b[2]) - Math.max(a[0], b[0]) > 0.03 && Math.min(a[3], b[3]) - Math.max(a[1], b[1]) > 0.035

/**
 * 가로 영상에서 쪽이 아직 정해지지 않은 그래픽의 쪽을 정한다(시간 순서로).
 *  - 기본 자리가 머리를 가리고 반대쪽이 확실히 덜 가리면 반대쪽으로 옮긴다.
 *    그쪽에 같은 때 보이는 다른 그래픽(이름표 등)이 있으면, 그 그래픽도 이번에 정한 것이고 비켜 설 자리(머리도 안 가리고
 *    다른 것과도 안 부딪히는 반대쪽)가 있으면 함께 옮기고, 아니면 옮기지 않는다(「위치」로 바꿀 수 있다).
 *  - 기본 자리에서 다른 그래픽과 부딪히고 반대쪽은 비어 있으며 머리를 더 가리지 않으면 그때도 옮긴다.
 * 한 번 정한 쪽은 다시 바꾸지 않는다 — 시간을 옮겼다고 그래픽이 저절로 건너뛰지 않게(바꾸는 것은 사람이 「위치」에서).
 * 사람이 고른 쪽도 그대로 둔다. 바뀐 것이 없으면 받은 배열을 그대로 돌려준다.
 */
export function placeAwayFromFaces(graphics: Graphic[], track: FaceSample[], portrait: boolean, measure: Measure = regionMeasure): Graphic[] {
  if (portrait || track.length === 0 || !needsPlacement(graphics)) return graphics
  const placed = [...graphics]
  /** 이번에 쪽을 정한 그래픽(사람이 고른 것·전에 정한 것이 아니어서 비켜 세울 수 있다) */
  const decided = new Set<number>()
  const movable = placed.map((graphic, index) => ({ graphic, index })).filter(({ graphic }) => REGIONS[graphic.kind] !== undefined)
  const coverAt = (graphic: Graphic, side: Side) => {
    const box = measure(graphic, side)
    return box ? covered(samplesDuring(track, graphic.start, graphic.end), box) : 0
  }
  /** index 의 그래픽이 box 자리에 있을 때 부딪히는 다른 그래픽들(skip 은 빼고) */
  const blockers = (index: number, box: Box | null, skip = -1) => {
    if (box === null) return []
    const graphic = placed[index]
    return movable.filter(({ index: j }) => {
      if (j === index || j === skip || !together(placed[j], graphic)) return false
      const other = measure(placed[j], sideOf(placed[j])!)
      return other !== null && bumps(other, box)
    })
  }
  /** 이번에 정한 그래픽을 반대쪽으로 비켜 세울 수 있나(머리를 더 가리지 않고, 거기서 아무와도 부딪히지 않으면) */
  const canStepAside = (j: number, mover: number) => {
    if (!decided.has(j)) return false
    const other = placed[j]
    const now = sideOf(other)!
    const next = opposite(now)
    if (coverAt(other, next) > Math.max(0.12, coverAt(other, now))) return false
    return blockers(j, measure(other, next), mover).length === 0
  }

  for (const { index } of [...movable].sort((a, b) => a.graphic.start - b.graphic.start)) {
    const graphic = placed[index]
    if (graphic.side !== undefined) continue
    const home = REGIONS[graphic.kind]!.side
    const away = opposite(home)
    const here = coverAt(graphic, home)
    const there = coverAt(graphic, away)
    const awayBlockers = blockers(index, measure(graphic, away))
    const homeBlockers = blockers(index, measure(graphic, home))
    let side = home
    if (here > 0.12 && there < here * 0.5) {
      if (awayBlockers.length === 0) side = away
      else if (awayBlockers.every(({ index: j }) => canStepAside(j, index))) {
        for (const { index: j } of awayBlockers) placed[j] = { ...placed[j], side: opposite(sideOf(placed[j])!) }
        side = away
      }
    } else if (homeBlockers.length > 0 && awayBlockers.length === 0 && there <= here) side = away
    placed[index] = { ...graphic, side }
    decided.add(index)
  }
  return placed
}
