import { describe, expect, it } from 'vitest'
import { alignTokensToWords } from './align'

describe('alignTokensToWords', () => {
  it('영어: 문장 부호가 붙은 낱말에 정렬 조각의 시간을 입힌다', () => {
    const words = alignTokensToWords('Out of 1,400 people, wow.', [
      { text: 'Out', start: 0, end: 0.2 },
      { text: 'of', start: 0.2, end: 0.3 },
      { text: '1400', start: 0.3, end: 0.9 },
      { text: 'people', start: 1, end: 1.4 },
      { text: 'wow', start: 1.6, end: 1.9 },
    ])
    expect(words.map((w) => [w.text, w.start, w.end])).toEqual([
      ['Out', 0, 0.2],
      ['of', 0.2, 0.3],
      ['1,400', 0.3, 0.9],
      ['people,', 1, 1.4],
      ['wow.', 1.6, 1.9],
    ])
  })

  it('한국어: 어절보다 잘게 나뉜 조각을 어절 하나로 합친다', () => {
    const words = alignTokensToWords('과학적 데이터가 있다', [
      { text: '과학', start: 0.96, end: 1.28 },
      { text: '적', start: 1.28, end: 1.44 },
      { text: '데이터', start: 1.44, end: 1.76 },
      { text: '가', start: 1.76, end: 1.92 },
      { text: '있다', start: 2, end: 2.3 },
    ])
    expect(words.map((w) => [w.text, w.start, w.end])).toEqual([
      ['과학적', 0.96, 1.44],
      ['데이터가', 1.44, 1.92],
      ['있다', 2, 2.3],
    ])
  })

  it('일본어: 붙여 쓴 글을 낱말로 나누고 사이에 빈칸이 없다고 표시한다', () => {
    const words = alignTokensToWords('今日はいい天気ですね。', [
      { text: '今日', start: 0, end: 0.4 },
      { text: 'は', start: 0.4, end: 0.5 },
      { text: 'いい', start: 0.5, end: 0.8 },
      { text: '天気', start: 0.9, end: 1.3 },
      { text: 'です', start: 1.3, end: 1.6 },
      { text: 'ね', start: 1.6, end: 1.8 },
    ])
    expect(words.map((w) => [w.text, w.start, w.end, Boolean(w.joinNext)])).toEqual([
      ['今日はいい', 0, 0.8, true],
      ['天気ですね。', 0.9, 1.8, false],
    ])
  })

  it('정렬 조각을 못 찾은 낱말은 앞뒤 사이 시간에 놓고, 시간은 늘 앞에서 뒤로 흐른다', () => {
    const words = alignTokensToWords('one — two three', [
      { text: 'one', start: 0, end: 0.5 },
      { text: 'three', start: 2, end: 2.5 },
    ])
    expect(words.map((w) => w.text)).toEqual(['one', '—', 'two', 'three'])
    for (let i = 1; i < words.length; i++) expect(words[i].start).toBeGreaterThanOrEqual(words[i - 1].end)
    expect(words[2].end).toBeLessThanOrEqual(2)
  })

  it('줄바꿈 표시를 남긴다', () => {
    const words = alignTokensToWords('a b\nc', [
      { text: 'a', start: 0, end: 1 },
      { text: 'b', start: 1, end: 2 },
      { text: 'c', start: 2, end: 3 },
    ])
    expect(words.map((w) => Boolean(w.lineEnd))).toEqual([false, true, true])
  })
})
