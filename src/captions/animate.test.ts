import { describe, expect, it } from 'vitest'
import { ENTRANCE_SECONDS, entrance, wordPop } from './animate'

describe('entrance', () => {
  it('끝나면 어떤 등장 방식이든 제자리·제크기·불투명이다', () => {
    for (const kind of ['none', 'pop', 'slide', 'shake'] as const) {
      const pose = entrance(kind, ENTRANCE_SECONDS + 0.01)
      expect(pose.scale).toBeCloseTo(1)
      expect(pose.dx).toBeCloseTo(0)
      expect(pose.dy).toBeCloseTo(0)
      expect(pose.alpha).toBe(1)
    }
  })

  it('pop 은 작게 시작해서 한 번 넘쳤다가 돌아온다', () => {
    expect(entrance('pop', 0).scale).toBeLessThan(1)
    const peak = Math.max(...[0.4, 0.5, 0.6, 0.7, 0.8].map((p) => entrance('pop', ENTRANCE_SECONDS * p).scale))
    expect(peak).toBeGreaterThan(1)
  })

  it('slide 는 아래에서 올라온다', () => {
    expect(entrance('slide', 0).dy).toBeGreaterThan(0)
    expect(entrance('slide', 0).alpha).toBe(0)
  })

  it('none 은 처음부터 그대로다', () => {
    expect(entrance('none', 0)).toEqual({ scale: 1, dx: 0, dy: 0, alpha: 1 })
  })
})

describe('wordPop', () => {
  it('어절이 시작될 때 커졌다가 원래 크기로 돌아온다', () => {
    expect(wordPop(0)).toBeCloseTo(1)
    expect(wordPop(0.08)).toBeGreaterThan(1.1)
    expect(wordPop(1)).toBeCloseTo(1)
  })
})
