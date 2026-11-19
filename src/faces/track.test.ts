import { describe, expect, it } from 'vitest'
import type { Graphic } from '../motion/types'
import { decodeFaces, defaultSide, needsPlacement, placeAwayFromFaces, regionMeasure, sampleTimes, sideOf } from './track'
import type { FaceSample } from './track'

describe('얼굴 찾기 모델(UltraFace)의 답 풀기', () => {
  it('얼굴 점수가 넘는 상자만, 겹치는 상자는 하나로, 큰 것부터', () => {
    // 점수는 [배경, 얼굴] 짝, 상자는 [x1, y1, x2, y2](0~1)
    const scores = Float32Array.from([0.9, 0.1, 0.05, 0.95, 0.1, 0.9, 0.2, 0.8, 0.4, 0.6])
    const boxes = Float32Array.from([0, 0, 0.1, 0.1, 0.5, 0.1, 0.7, 0.5, 0.51, 0.11, 0.71, 0.5, 0.1, 0.6, 0.15, 0.7, 0.8, 0.8, 0.9, 0.9])
    const faces = decodeFaces(scores, boxes)
    expect(faces).toHaveLength(2)
    expect(faces[0]).toEqual([0.5, 0.1, 0.7, 0.5])
    expect(faces[1].map((value) => Math.round(value * 100) / 100)).toEqual([0.1, 0.6, 0.15, 0.7])
  })

  it('화면 밖으로 나간 상자는 화면 안으로 자른다', () => {
    expect(decodeFaces(Float32Array.from([0, 1]), Float32Array.from([-0.02, 0.13, 0.61, 0.68]))).toEqual([[0, 0.13, 0.61, 0.68]])
  })
})

describe('어느 때를 볼까', () => {
  it('1초마다(가운데), 길면 정한 수만큼 고르게', () => {
    expect(sampleTimes(4)).toEqual([0.5, 1.5, 2.5, 3.5])
    expect(sampleTimes(0.4)).toEqual([0.2])
    const long = sampleTimes(600, 120)
    expect(long).toHaveLength(120)
    expect(long[0]).toBeCloseTo(2.5, 5)
    expect(long[119]).toBeCloseTo(597.5, 5)
  })
})

const at = (t: number, box: [number, number, number, number] | null): FaceSample => ({ t, box })
/** 오른쪽에 앉은 사람(예시 영상 podcast-a 의 실제 자리) */
const RIGHT_FACE = [0.52, 0.08, 0.65, 0.43] as [number, number, number, number]
const LEFT_FACE = [0.18, 0.1, 0.36, 0.5] as [number, number, number, number]
const CENTER_FACE = [0.44, 0.08, 0.56, 0.42] as [number, number, number, number]
const track = (box: [number, number, number, number] | null) => Array.from({ length: 10 }, (_, i) => at(i + 0.5, box))
const stat: Graphic = { id: 's', kind: 'stat', start: 3.1, end: 5.4, value: 37, prefix: '', suffix: '%', decimals: 0, label: '' }
// 가운데 그래픽(숫자·목록·제목)은 자동 배치가 시간을 나눠 같은 때 보이지 않는다(direct.ts 의 resolveOverlaps)
const list: Graphic = { id: 'l', kind: 'list', start: 5.5, end: 9, title: '', items: ['a', 'b'] }
const lower: Graphic = { id: 'n', kind: 'lowerThird', start: 0, end: 3, name: 'Mina', role: '' }
const title: Graphic = { id: 't', kind: 'title', start: 0, end: 3, text: 'Hello' }
const quote: Graphic = { id: 'q', kind: 'quote', start: 6, end: 9, text: 'Hi', author: '' }
const sideIn = (graphics: Graphic[], id: string) => graphics.find((g) => g.id === id)?.side

describe('얼굴을 피해 놓기(가로 영상)', () => {
  it('얼굴이 오른쪽이면 오른쪽에 놓이는 숫자는 왼쪽으로', () => {
    expect(sideIn(placeAwayFromFaces([stat], track(RIGHT_FACE), false), 's')).toBe('left')
  })

  it('얼굴이 왼쪽이면 왼쪽에 놓이는 목록·제목은 오른쪽으로, 오른쪽의 숫자는 그대로', () => {
    const placed = placeAwayFromFaces([stat, list, lower, title], track(LEFT_FACE), false)
    // 이름표는 화면 아래쪽이라 위쪽에 있는 얼굴을 가리지 않는다 — 기본 쪽(왼쪽)으로 정한다
    expect([sideIn(placed, 's'), sideIn(placed, 'l'), sideIn(placed, 'n'), sideIn(placed, 't')]).toEqual(['right', 'right', 'left', 'right'])
    // 얼굴이 아래 왼쪽에 있으면(구석의 화면 속 화면 등) 이름표도 옮긴다
    expect(sideIn(placeAwayFromFaces([lower], track([0.08, 0.5, 0.3, 0.88]), false), 'n')).toBe('right')
  })

  it('얼굴이 가운데면(양쪽 다 비켜 있으면) 기본 쪽, 옮겨도 가리면 기본 쪽', () => {
    const placed = placeAwayFromFaces([stat, list], track(CENTER_FACE), false)
    expect([sideIn(placed, 's'), sideIn(placed, 'l')]).toEqual(['right', 'left'])
    // 제목은 넓어서 가운데 얼굴을 양쪽 다 가린다 — 옮길 까닭이 없다
    expect(sideIn(placeAwayFromFaces([title], track(CENTER_FACE), false), 't')).toBe('left')
  })

  it('인용·자막·가리키기, 이미 정한 쪽, 세로 영상, 얼굴을 아직 못 찾은 때는 그대로(같은 배열)', () => {
    const quotes = [quote]
    expect(placeAwayFromFaces(quotes, track(RIGHT_FACE), false)).toBe(quotes)
    const chosen = [{ ...stat, side: 'right' as const }]
    expect(placeAwayFromFaces(chosen, track(RIGHT_FACE), false)).toBe(chosen)
    const tall = [stat]
    expect(placeAwayFromFaces(tall, track(RIGHT_FACE), true)).toBe(tall)
    expect(placeAwayFromFaces(tall, [], false)).toBe(tall)
    // 장면은 봤는데 얼굴이 없으면(풍경·화면 녹화) 기본 쪽으로 정한다
    expect(sideIn(placeAwayFromFaces([stat], track(null), false), 's')).toBe('right')
  })

  it('한 번 정하면 다시 정하지 않는다(시간을 옮겨도 건너뛰지 않게)', () => {
    const once = placeAwayFromFaces([stat], track(RIGHT_FACE), false)
    const moved = once.map((graphic) => ({ ...graphic, start: 0, end: 1 }))
    expect(placeAwayFromFaces(moved, track(LEFT_FACE), false)).toBe(moved)
  })

  it('옮길 쪽에 같은 때 보이는 그래픽이 있으면, 그 그래픽이 비켜 설 수 있으면 함께 옮기고 아니면 옮기지 않는다', () => {
    const bars: Graphic = { id: 'b', kind: 'bars', start: 2, end: 6, title: '', unit: '', items: [{ label: 'a', value: 1 }, { label: 'b', value: 2 }] }
    const tag: Graphic = { ...lower, start: 1, end: 5 }
    // 차트를 왼쪽으로 옮기면 왼쪽 아래 이름표와 부딪힌다 — 이름표가 오른쪽 아래로 비켜 선다(머리는 위에 있어 가리지 않는다)
    const placed = placeAwayFromFaces([tag, bars], track(RIGHT_FACE), false)
    expect([sideIn(placed, 'n'), sideIn(placed, 'b')]).toEqual(['right', 'left'])
    // 사람이 이름표를 왼쪽으로 정해 두었으면 비켜 세우지 않는다 — 차트도 그대로(「위치」로 바꿀 수 있다)
    const chosen = placeAwayFromFaces([{ ...tag, side: 'left' }, bars], track(RIGHT_FACE), false)
    expect([sideIn(chosen, 'n'), sideIn(chosen, 'b')]).toEqual(['left', 'right'])
    // 이름표가 같은 때가 아니면 차트만 옮긴다
    expect(sideIn(placeAwayFromFaces([{ ...tag, start: 0, end: 1.5 }, bars], track(RIGHT_FACE), false), 'b')).toBe('left')
    // 숫자는 이름표 위에 놓여(가장자리만 닿는다) 같은 때라도 이름표를 건드리지 않고 옮긴다 — 예시 영상 podcast-a 의 모습
    const stats = placeAwayFromFaces([tag, stat], track(RIGHT_FACE), false)
    expect([sideIn(stats, 'n'), sideIn(stats, 's')]).toEqual(['left', 'left'])
  })

  it('기본 자리에서 같은 때의 그래픽과 부딪히면, 반대쪽이 비어 있고 얼굴을 더 가리지 않을 때 옮긴다', () => {
    const tag: Graphic = { ...lower, start: 5, end: 8 }
    const placed = placeAwayFromFaces([tag, list], track(null), false)
    // 먼저 나오는 이름표가 비켜 선다(어느 쪽이 비켜도 겹치지 않으면 된다)
    expect([sideIn(placed, 'n'), sideIn(placed, 'l')]).toEqual(['right', 'left'])
  })

  it('실제로 그려 본 자리를 쓸 수 있다(편집기) — 짧은 제목은 가운데 얼굴을 가리지 않는다', () => {
    const short = { ...title, text: 'Hi' }
    const measure = (graphic: Graphic, side: 'left' | 'right') =>
      graphic.kind === 'title' ? (side === 'left' ? ([0.06, 0.1, 0.3, 0.25] as const) : ([0.7, 0.1, 0.94, 0.25] as const)) : regionMeasure(graphic, side)
    const face = [0.12, 0.05, 0.3, 0.4] as [number, number, number, number]
    // 얼굴이 왼쪽 위에 있어 짧은 제목과 겹치면 옮긴다
    expect(sideIn(placeAwayFromFaces([short], track(face), false, (g, side) => [...measure(g, side)!] as [number, number, number, number]), 't')).toBe('right')
    // 얼굴이 가운데면 짧은 제목은 어느 쪽이든 가리지 않는다
    expect(sideIn(placeAwayFromFaces([short], track(CENTER_FACE), false, (g, side) => [...measure(g, side)!] as [number, number, number, number]), 't')).toBe('left')
  })

  it('쪽 고르기에 쓰는 기본 쪽', () => {
    expect([defaultSide('stat'), defaultSide('bars'), defaultSide('list'), defaultSide('title'), defaultSide('lowerThird')]).toEqual(['right', 'right', 'left', 'left', 'left'])
    expect([defaultSide('quote'), defaultSide('captions'), defaultSide('callout')]).toEqual([null, null, null])
    expect([sideOf(stat), sideOf({ ...stat, side: 'left' }), sideOf(quote)]).toEqual(['right', 'left', null])
    expect([needsPlacement([stat]), needsPlacement([{ ...stat, side: 'right' }]), needsPlacement([quote])]).toEqual([true, false, false])
  })

  it('그래픽이 보이는 동안의 얼굴만 본다(사람이 자리를 옮기는 영상)', () => {
    const moving = [...Array.from({ length: 5 }, (_, i) => at(i + 0.5, LEFT_FACE)), ...Array.from({ length: 5 }, (_, i) => at(i + 5.5, RIGHT_FACE))]
    const early = { ...stat, id: 'early', start: 0.5, end: 3 }
    const late = { ...stat, id: 'late', start: 6, end: 9 }
    const placed = placeAwayFromFaces([early, late], moving, false)
    expect([sideIn(placed, 'early'), sideIn(placed, 'late')]).toEqual(['right', 'left'])
  })

  it('짧은 그래픽은 가장 가까운 장면을 본다', () => {
    const sparse = [at(0.5, RIGHT_FACE), at(9.5, LEFT_FACE)]
    expect(sideIn(placeAwayFromFaces([{ ...stat, start: 1.2, end: 1.6 }], sparse, false), 's')).toBe('left')
  })
})
