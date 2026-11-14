import { describe, expect, it } from 'vitest'
import { activeWordIndex, cueAt, scriptToWords, wordsToCues } from './segment'
import type { Word } from './types'

const w = (text: string, start: number, end: number): Word => ({ text, start, end })

describe('scriptToWords', () => {
  it('대본을 어절로 나누고 영상 길이 안에 순서대로 놓는다', () => {
    const words = scriptToWords('오늘은 진짜 대박\n사건이 있었어요', 10)
    expect(words.map((x) => x.text)).toEqual(['오늘은', '진짜', '대박', '사건이', '있었어요'])
    expect(words[0].start).toBe(0)
    for (let i = 1; i < words.length; i++) {
      expect(words[i].start).toBeGreaterThanOrEqual(words[i - 1].end)
    }
    expect(words.at(-1)!.end).toBeLessThanOrEqual(10)
  })

  it('긴 어절에 더 긴 시간을 준다', () => {
    const [short, long] = scriptToWords('네 안녕하십니까', 6)
    expect(long.end - long.start).toBeGreaterThan(short.end - short.start)
  })

  it('줄이 바뀌는 곳에는 쉬는 시간을 둔다', () => {
    const words = scriptToWords('하나 둘\n셋', 6)
    const gapInside = words[1].start - words[0].end
    const gapAtBreak = words[2].start - words[1].end
    expect(gapAtBreak).toBeGreaterThan(gapInside)
  })

  it('빈 대본이나 길이 0 이면 아무것도 없다', () => {
    expect(scriptToWords('  \n ', 10)).toEqual([])
    expect(scriptToWords('안녕', 0)).toEqual([])
  })
})

describe('wordsToCues', () => {
  it('글자 수가 넘치면 새 자막으로 넘긴다', () => {
    const words = [w('오늘은', 0, 1), w('진짜', 1, 2), w('대박', 2, 3), w('사건이', 3, 4)]
    const cues = wordsToCues(words, { maxChars: 7 })
    expect(cues.map((c) => c.words.map((x) => x.text).join(' '))).toEqual(['오늘은 진짜', '대박 사건이'])
    expect(cues[0]).toMatchObject({ start: 0, end: 2 })
    expect(cues[1]).toMatchObject({ start: 2, end: 4 })
  })

  it('말이 오래 끊기면 새 자막으로 넘긴다', () => {
    const cues = wordsToCues([w('하나', 0, 1), w('둘', 2.5, 3)], { maxChars: 20 })
    expect(cues).toHaveLength(2)
  })

  it('문장이 끝나면 새 자막으로 넘긴다', () => {
    const cues = wordsToCues([w('진짜?', 0, 1), w('네', 1, 2)], { maxChars: 20 })
    expect(cues).toHaveLength(2)
  })

  it('한 어절이 한도보다 길어도 버리지 않는다', () => {
    const cues = wordsToCues([w('가나다라마바사아자차', 0, 2)], { maxChars: 4 })
    expect(cues).toHaveLength(1)
  })
})

describe('cueAt · activeWordIndex', () => {
  const cues = wordsToCues([w('하나', 1, 2), w('둘', 2, 3), w('셋', 6, 7)], { maxChars: 4 })

  it('시작 전에는 자막이 없다', () => {
    expect(cueAt(cues, 0.5)).toBeNull()
  })

  it('말하는 동안 그 자막을 돌려준다', () => {
    expect(cueAt(cues, 2.5)).toBe(cues[0])
    expect(cueAt(cues, 6.2)).toBe(cues[1])
  })

  it('말이 끝난 뒤 잠깐은 남겨 두고, 그 뒤에는 지운다', () => {
    expect(cueAt(cues, 3.2)).toBe(cues[0])
    expect(cueAt(cues, 4.5)).toBeNull()
  })

  it('지금 말하는 어절의 순번을 알려준다', () => {
    expect(activeWordIndex(cues[0], 1.5)).toBe(0)
    expect(activeWordIndex(cues[0], 2.1)).toBe(1)
    expect(activeWordIndex(cues[0], 3.3)).toBe(1)
  })
})
