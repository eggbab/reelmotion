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
  lowerThird: { side: 'left', box: [0.05, 0.6, 0.42, 0.82] },
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

/** 얼굴이 이 자리에 얼마나 가려지나(얼굴 넓이에 대한 겹친 넓이 — 장면들의 평균, 얼굴이 없는 장면은 0) */
function covered(samples: FaceSample[], region: Box): number {
  if (samples.length === 0) return 0
  return samples.reduce((sum, sample) => sum + (sample.box ? intersect(sample.box, region) / Math.max(1e-9, area(sample.box)) : 0), 0) / samples.length
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

/**
 * 가로 영상에서 쪽이 아직 정해지지 않은 그래픽의 쪽을 정한다. 기본 자리가 얼굴을 가리고 반대쪽이 확실히 덜 가리면 반대쪽,
 * 아니면 기본 쪽. 한 번 정한 쪽은 다시 바꾸지 않는다 — 시간을 옮겼다고 그래픽이 저절로 건너뛰지 않게(바꾸는 것은 사람이 「위치」에서).
 * 사람이 고른 쪽도 그대로 둔다. 바뀐 것이 없으면 받은 배열을 그대로 돌려준다.
 */
export function placeAwayFromFaces(graphics: Graphic[], track: FaceSample[], portrait: boolean): Graphic[] {
  if (portrait || track.length === 0 || !needsPlacement(graphics)) return graphics
  return graphics.map((graphic) => {
    const region = REGIONS[graphic.kind]
    if (!region || graphic.side !== undefined) return graphic
    const samples = samplesDuring(track, graphic.start, graphic.end)
    const here = covered(samples, region.box)
    const there = covered(samples, mirror(region.box))
    return { ...graphic, side: here > 0.12 && there < here * 0.5 ? opposite(region.side) : region.side }
  })
}
