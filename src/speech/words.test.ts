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

  it('빈칸 없이 이어진 숫자·기호 조각은 앞 낱말에 붙인다(Whisper 가 1,400 · 8% 를 쪼개서 준다)', () => {
    const words = chunksToWords([
      { text: ' Out', timestamp: [0, 0.2] },
      { text: ' of', timestamp: [0.2, 0.3] },
      { text: ' 1', timestamp: [0.3, 0.5] },
      { text: ',400', timestamp: [0.5, 0.9] },
      { text: ' by', timestamp: [1, 1.1] },
      { text: ' 8', timestamp: [1.1, 1.3] },
      { text: '%', timestamp: [1.3, 1.6] },
      { text: ' since.', timestamp: [1.7, 2] },
    ])
    expect(words.map((word) => word.text)).toEqual(['Out', 'of', '1,400', 'by', '8%', 'since.'])
    expect(words[2]).toMatchObject({ start: 0.3, end: 0.9 })
  })

  it('일본어처럼 빈칸 없는 말은 글자 조각을 함부로 붙이지 않는다', () => {
    const words = chunksToWords([
      { text: '今日', timestamp: [0, 0.4] },
      { text: 'は', timestamp: [0.4, 0.5] },
      { text: '。', timestamp: [0.5, 0.6] },
    ])
    expect(words.map((word) => word.text)).toEqual(['今日', 'は。'])
  })
})
