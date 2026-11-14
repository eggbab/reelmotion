import { describe, expect, it } from 'vitest'
import type { Word } from '../captions/types'
import { retime } from './retime'

const base: Word[] = [
  { text: '고대', start: 1, end: 1.5 },
  { text: '신앙극', start: 1.5, end: 2.2 },
  { text: '이집트인들은', start: 2.2, end: 3.4 },
  { text: '경탄했고', start: 4, end: 4.8 },
]
const times = (words: Word[]) => words.map((x) => [x.start, x.end])

describe('retime', () => {
  it('글을 고치지 않으면 시간이 그대로다', () => {
    const words = retime(base, '고대 신앙극 이집트인들은 경탄했고')
    expect(words.map((x) => x.text)).toEqual(base.map((x) => x.text))
    expect(times(words)).toEqual(times(base))
  })

  it('오타를 고친 어절은 원래 어절의 시간을 물려받는다', () => {
    const words = retime(base, '고대 신왕국 이집트인들은 경탄했고')
    expect(words[1]).toMatchObject({ text: '신왕국', start: 1.5, end: 2.2 })
    expect(times(words)).toEqual(times(base))
  })

  it('어절을 지워도 남은 어절의 시간은 그대로다', () => {
    const words = retime(base, '고대 이집트인들은 경탄했고')
    expect(times(words)).toEqual([
      [1, 1.5],
      [2.2, 3.4],
      [4, 4.8],
    ])
  })

  it('한 어절을 둘로 띄어 쓰면 그 시간을 글자 수대로 나눠 갖는다', () => {
    const words = retime(base, '고대 신 왕국 이집트인들은 경탄했고')
    expect(words[1].start).toBe(1.5)
    expect(words[2].end).toBeCloseTo(2.2)
    expect(words[1].end).toBeCloseTo(words[2].start)
    expect(words[2].end - words[2].start).toBeGreaterThan(words[1].end - words[1].start)
  })

  it('사이에 끼워 넣은 어절은 앞뒤 말 사이의 빈 시간에 놓인다', () => {
    const words = retime(base, '고대 신앙극 이집트인들은 정말 경탄했고')
    expect(words[3].text).toBe('정말')
    expect(words[3].start).toBeGreaterThanOrEqual(3.4)
    expect(words[3].end).toBeLessThanOrEqual(4)
    expect(words[3].end).toBeGreaterThan(words[3].start)
  })

  it('빈 시간이 없는 곳에 끼워 넣으면 앞 어절의 시간을 나눠 받고, 순서는 지킨다', () => {
    const words = retime(base, '고대 아주 신앙극 이집트인들은 경탄했고')
    expect(words[1].text).toBe('아주')
    expect(words[1].end).toBeGreaterThan(words[1].start)
    for (let i = 1; i < words.length; i++) expect(words[i].start).toBeGreaterThanOrEqual(words[i - 1].end)
    expect(words[2]).toMatchObject({ text: '신앙극', start: 1.5, end: 2.2 })
  })

  it('끝에 덧붙인 어절은 마지막 말 뒤에 놓인다', () => {
    const words = retime(base, '고대 신앙극 이집트인들은 경탄했고 끝')
    expect(words[4].start).toBeGreaterThanOrEqual(4.8)
    expect(words[4].end).toBeGreaterThan(words[4].start)
  })

  it('문장 부호만 고친 것은 같은 어절로 본다', () => {
    const words = retime(base, '고대 신앙극 이집트인들은 경탄했고!')
    expect(words[3]).toMatchObject({ text: '경탄했고!', start: 4, end: 4.8 })
  })

  it('줄이 바뀌는 어절에 표시를 남긴다', () => {
    const words = retime(base, '고대 신앙극\n이집트인들은 경탄했고')
    expect(words.map((x) => Boolean(x.lineEnd))).toEqual([false, true, false, true])
  })
})
