import { describe, expect, it } from 'vitest'
import { lerp, parseOffset, progressOf } from './scrollProgress'

describe('스크롤 진행(0~1) — 대상의 어느 쪽이 창의 어디에 닿을 때', () => {
  it('글 꼴의 자리를 숫자로', () => {
    expect(parseOffset(['start end', 'start start'])).toEqual([
      [0, 1],
      [0, 0],
    ])
    expect(parseOffset(['start 0.8', 'center 0.5'])).toEqual([
      [0, 0.8],
      [0.5, 0.5],
    ])
    expect(parseOffset(['start start', 'end end'])).toEqual([
      [0, 0],
      [1, 1],
    ])
  })

  it('대상의 위가 창의 아래에 닿을 때 0, 창의 위에 닿을 때 1, 그 사이는 고르게, 밖은 0·1 로', () => {
    const offset = parseOffset(['start end', 'start start'])
    expect(progressOf(900, 500, 900, offset)).toBe(0)
    expect(progressOf(450, 500, 900, offset)).toBe(0.5)
    expect(progressOf(0, 500, 900, offset)).toBe(1)
    expect(progressOf(1200, 500, 900, offset)).toBe(0)
    expect(progressOf(-300, 500, 900, offset)).toBe(1)
  })

  it('창보다 긴 대상(첫 화면 300vh): 위가 창의 위일 때 0, 아래가 창의 아래일 때 1', () => {
    const offset = parseOffset(['start start', 'end end'])
    expect(progressOf(0, 2700, 900, offset)).toBe(0)
    expect(progressOf(-675, 2700, 900, offset)).toBe(0.375)
    expect(progressOf(-1800, 2700, 900, offset)).toBe(1)
  })

  it('가운데·비율 자리', () => {
    const offset = parseOffset(['start 0.8', 'center 0.5'])
    // 0: top = 0.8 × 900 = 720 · 1: top + 300 = 450 → top = 150
    expect(progressOf(720, 600, 900, offset)).toBe(0)
    expect(progressOf(150, 600, 900, offset)).toBe(1)
    expect(progressOf(435, 600, 900, offset)).toBeCloseTo(0.5)
  })

  it('두 자리가 같으면 지났는지만', () => {
    const offset = parseOffset(['start start', 'start start'])
    expect(progressOf(10, 100, 900, offset)).toBe(0)
    expect(progressOf(0, 100, 900, offset)).toBe(1)
  })

  it('구간 안에서만 바뀌는 직선(움직임 라이브러리의 useTransform 과 같은 꼴)', () => {
    expect(lerp(0.05, [0, 0.16], [1, 0])).toBeCloseTo(0.6875)
    expect(lerp(0.5, [0, 0.16], [1, 0])).toBe(0)
    expect(lerp(-1, [0.1, 0.3], [1, 0])).toBe(1)
  })
})
