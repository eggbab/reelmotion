import { describe, expect, it } from 'vitest'
import { clampToDuration, createGraphic, laneOf, moveGraphic, resizeGraphic, syncCaptions } from './graphics'
import type { Graphic } from '../motion/types'

describe('createGraphic', () => {
  it('재생 위치에서 시작하고 영상 끝을 넘지 않는다', () => {
    const g = createGraphic('stat', 3, 10, 'g9')
    expect(g).toMatchObject({ id: 'g9', kind: 'stat', start: 3 })
    expect(g.end).toBeLessThanOrEqual(10)
    expect(g.end - g.start).toBeGreaterThan(1)
  })

  it('끝 가까이에서 만들면 앞으로 당겨 길이를 지킨다', () => {
    const g = createGraphic('title', 9.5, 10, 'x')
    expect(g.end).toBe(10)
    expect(g.end - g.start).toBeGreaterThanOrEqual(2)
  })
})

describe('laneOf', () => {
  it('제목 · 이름표 · 데이터 · 자막 네 줄로 나눈다(같이 나오는 제목과 이름표가 겹치지 않게)', () => {
    expect(['title', 'quote'].map((k) => laneOf(k as Graphic['kind']))).toEqual([0, 0])
    expect(['lowerThird', 'callout'].map((k) => laneOf(k as Graphic['kind']))).toEqual([1, 1])
    expect(['stat', 'bars', 'list'].map((k) => laneOf(k as Graphic['kind']))).toEqual([2, 2, 2])
    expect(laneOf('captions')).toBe(3)
  })
})

describe('moveGraphic · resizeGraphic', () => {
  const g = createGraphic('title', 2, 10, 'a')

  it('길이를 지킨 채 옮기고, 영상 밖으로 나가지 않는다', () => {
    const moved = moveGraphic(g, 100, 10)
    expect(moved.end).toBe(10)
    expect(moved.end - moved.start).toBeCloseTo(g.end - g.start)
    expect(moveGraphic(g, -100, 10).start).toBe(0)
  })

  it('목록의 항목 시각도 함께 옮긴다', () => {
    const list: Graphic = { id: 'l', kind: 'list', start: 2, end: 6, title: '', items: ['a', 'b'], itemTimes: [2.5, 3] }
    const moved = moveGraphic(list, 1, 10)
    expect(moved.kind === 'list' && moved.itemTimes).toEqual([3.5, 4])
  })

  it('끝을 당기거나 늘려도 최소 길이를 지킨다', () => {
    expect(resizeGraphic(g, 'end', g.start + 0.1, 10).end - g.start).toBeGreaterThanOrEqual(0.5)
    expect(resizeGraphic(g, 'start', -3, 10).start).toBe(0)
    expect(resizeGraphic(g, 'end', 50, 10).end).toBe(10)
  })
})

describe('syncCaptions', () => {
  it('자막 그래픽의 낱말을 지금 대본으로 바꾸고 나머지는 그대로 둔다', () => {
    const graphics: Graphic[] = [createGraphic('title', 0, 10, 't'), { id: 'c', kind: 'captions', start: 0, end: 5, words: [] }]
    const words = [{ text: 'hi', start: 1, end: 2 }]
    const next = syncCaptions(graphics, words)
    expect(next[0]).toBe(graphics[0])
    expect(next[1]).toMatchObject({ kind: 'captions', start: 1, end: 2, words })
  })
})

describe('clampToDuration', () => {
  it('영상 끝을 넘는 그래픽을 영상 끝에서 끊고, 너무 짧아진 것은 뺀다', () => {
    const graphics: Graphic[] = [
      { ...createGraphic('list', 6, 20, 'l'), end: 11.5 },
      { ...createGraphic('title', 0, 20, 't'), start: 9.9, end: 12 },
    ]
    const clamped = clampToDuration(graphics, 10)
    expect(clamped).toHaveLength(1)
    expect(clamped[0]).toMatchObject({ id: 'l', end: 10 })
  })
})
