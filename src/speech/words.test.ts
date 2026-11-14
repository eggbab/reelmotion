import { describe, expect, it } from 'vitest'
import { chunksToWords } from './words'

describe('chunksToWords', () => {
  it('앞뒤 빈칸을 떼고 빈 조각은 버린다', () => {
    const words = chunksToWords([
      { text: ' 고대', timestamp: [2.54, 2.96] },
      { text: '  ', timestamp: [2.96, 3.0] },
      { text: ' 신왕국', timestamp: [3.0, 3.4] },
    ])
    expect(words).toEqual([
      { text: '고대', start: 2.54, end: 2.96 },
      { text: '신왕국', start: 3.0, end: 3.4 },
    ])
  })

  it('끝 시간이 없으면 글자 수로 어림한다', () => {
    const [word] = chunksToWords([{ text: ' 안녕하세요', timestamp: [1, null] }])
    expect(word.start).toBe(1)
    expect(word.end).toBeGreaterThan(1)
    expect(word.end).toBeLessThan(3)
  })

  it('말이 끝난 뒤의 침묵까지 한 어절로 늘어진 것은 줄인다', () => {
    const [word] = chunksToWords([{ text: ' 있습니다.', timestamp: [10.2, 19.5] }])
    expect(word.end).toBeLessThan(13)
  })

  it('시간이 뒤로 가거나 겹치면 순서대로 고친다', () => {
    const words = chunksToWords([
      { text: ' 하나', timestamp: [5, 6] },
      { text: ' 둘', timestamp: [5.5, 5.8] },
      { text: ' 셋', timestamp: [5.2, 7] },
    ])
    for (let i = 1; i < words.length; i++) expect(words[i].start).toBeGreaterThanOrEqual(words[i - 1].end)
    for (const word of words) expect(word.end).toBeGreaterThan(word.start)
  })
})
