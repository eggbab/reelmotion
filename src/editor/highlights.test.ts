import { describe, expect, it } from 'vitest'
import type { Graphic } from '../motion/types'
import { coveredSentences, maxPicks, picksToGraphics, toSentences, validatePicks } from './highlights'
import type { HighlightSentence } from './highlights'
import { scriptToWords } from '../captions/segment'

const EN: HighlightSentence[] = [
  { text: 'Good morning everyone.', start: 0, end: 2.4 },
  { text: "Today I'm taking you along for a day in my life as a nurse.", start: 2.8, end: 7 },
  { text: 'Coffee first, always.', start: 7.4, end: 9 },
  { text: 'Then I pack my lunch.', start: 9.4, end: 11 },
  { text: 'Then I check the ward schedule.', start: 11.4, end: 13.6 },
  { text: 'Every day is a little different, and I love that.', start: 14, end: 17.9 },
]
const none = EN.map(() => false)

describe('AI 가 고른 순간 검사(믿지 않는다 — 꼴·범위·글을 확인한다)', () => {
  it('제목·목록·인용을 받는다', () => {
    const picks = validatePicks(
      {
        picks: [
          { kind: 'title', from: 1, text: 'A day as a nurse' },
          { kind: 'list', from: 2, to: 4, title: 'Morning', items: ['Coffee first', 'Pack lunch', 'Check the schedule'] },
          { kind: 'quote', from: 5, text: 'Every day is a little different' },
        ],
      },
      EN,
      none,
      18,
    )
    expect(picks).toEqual([
      { kind: 'title', at: 1, text: 'A day as a nurse' },
      { kind: 'list', from: 2, to: 4, title: 'Morning', items: ['Coffee first', 'Pack lunch', 'Check the schedule'] },
      { kind: 'quote', at: 5, text: 'Every day is a little different' },
    ])
  })

  it('인용은 그 문장에 실제로 있는 말만(지어낸 말은 버린다). 따옴표·마침표·대소문자는 가리지 않는다', () => {
    expect(validatePicks({ picks: [{ kind: 'quote', from: 5, text: 'Nursing is the best job in the world' }] }, EN, none, 18)).toEqual([])
    expect(validatePicks({ picks: [{ kind: 'quote', from: 5, text: '"every day is a little different."' }] }, EN, none, 18)).toEqual([{ kind: 'quote', at: 5, text: 'every day is a little different' }])
  })

  it('없는 문장·이미 그래픽이 있는 문장·틀린 꼴·겹치는 고르기는 버린다', () => {
    const covered = EN.map((_, i) => i === 1)
    const raw = {
      picks: [
        { kind: 'title', from: 1, text: 'Covered' },
        { kind: 'title', from: 9, text: 'No such sentence' },
        { kind: 'title', from: -1, text: 'Negative' },
        { kind: 'title', from: 2.5, text: 'Not a whole number' },
        { kind: 'title', from: 2, text: '   ' },
        { kind: 'callout', from: 2, text: 'Kind we do not take' },
        { kind: 'list', from: 2, to: 2, items: ['one'] },
        { kind: 'list', from: 0, to: 5, items: ['a', 'b', 'c', 'd', 'e', 'f'] },
        { kind: 'list', from: 2, to: 4, items: ['only one'] },
        { kind: 'title', from: 3, text: 'Kept' },
        { kind: 'title', from: 3, text: 'Same sentence twice' },
        { kind: 'quote', from: 4, text: 'check the ward schedule' },
      ],
    }
    expect(validatePicks(raw, EN, covered, 18)).toEqual([
      { kind: 'title', at: 3, text: 'Kept' },
      { kind: 'quote', at: 4, text: 'check the ward schedule' },
    ])
    for (const junk of [null, 'text', { picks: 'no' }, {}, []]) expect(validatePicks(junk, EN, none, 18)).toEqual([])
  })

  it('목록은 이어진 2~5문장, 문장마다 항목 하나 — 덮인 문장이 끼면 버린다', () => {
    expect(validatePicks({ picks: [{ kind: 'list', from: 2, to: 4, items: ['a', 'b', 'c'] }] }, EN, EN.map((_, i) => i === 3), 18)).toEqual([])
    // 항목 수가 문장 수와 달라도 2~5개면 받는다(나타나는 때는 고르게 나눈다)
    expect(validatePicks({ picks: [{ kind: 'list', from: 2, to: 4, items: ['a', 'b'] }] }, EN, none, 18)).toHaveLength(1)
  })

  it('글이 길면 자리에 맞게 줄인다(제목 20자·목록 항목 28자 — 한국어·일본어)', () => {
    const KO: HighlightSentence[] = [
      { text: '오늘은 아침 여섯 시에 일어났어요.', start: 0, end: 3 },
      { text: '요즘 미라클 모닝 도전 중이거든요.', start: 3.4, end: 6 },
      { text: '일어나자마자 물 한 잔 마시고 스트레칭부터 해요.', start: 6.4, end: 10 },
      { text: '그리고 삼십 분 정도 책을 읽어요.', start: 10.4, end: 13 },
    ]
    const [title, list] = validatePicks(
      {
        picks: [
          { kind: 'title', from: 0, text: '미라클 모닝 도전 중인 직장인의 아주 길고 긴 아침 루틴 이야기' },
          { kind: 'list', from: 2, to: 3, items: ['일어나자마자 물 한 잔 마시고 스트레칭부터 하고 나서 샤워까지 하기', '책 읽기'] },
        ],
      },
      KO,
      KO.map(() => false),
      14,
    )
    expect(title.kind === 'title' && [...title.text].length).toBeLessThanOrEqual(20)
    expect(list.kind === 'list' && [...list.items[0]].length).toBeLessThanOrEqual(28)
  })

  it('영상 길이에 맞게 몇 개까지만(6초에 하나 — 짧은 영상의 보통 빠르기, 많아야 6개)', () => {
    expect(maxPicks(5)).toBe(1)
    expect(maxPicks(10)).toBe(1)
    expect(maxPicks(18)).toBe(3)
    expect(maxPicks(60)).toBe(6)
    expect(maxPicks(600)).toBe(6)
    const many = { picks: EN.map((_, i) => ({ kind: 'title', from: i, text: `T${i}` })) }
    expect(validatePicks(many, EN, none, 18)).toHaveLength(3)
  })
})

describe('고른 순간을 그래픽으로', () => {
  it('그 문장을 말하는 때에 놓는다(목록 항목은 문장마다 나타난다)', () => {
    const graphics = picksToGraphics(
      [
        { kind: 'title', at: 1, text: 'A day as a nurse' },
        { kind: 'list', from: 2, to: 4, title: 'Morning', items: ['Coffee first', 'Pack lunch', 'Check the schedule'] },
        { kind: 'quote', at: 5, text: 'Every day is a little different' },
      ],
      EN,
      18,
      (n) => `ai${n}`,
    )
    expect(graphics[0]).toMatchObject({ id: 'ai1', kind: 'title', start: 2.8, text: 'A day as a nurse' })
    expect(graphics[0].end).toBeGreaterThanOrEqual(2.8 + 2.4)
    expect(graphics[0].end).toBeLessThanOrEqual(2.8 + 4.5)
    expect(graphics[1]).toMatchObject({ id: 'ai2', kind: 'list', start: 6.9, items: ['Coffee first', 'Pack lunch', 'Check the schedule'], itemTimes: [7.4, 9.4, 11.4] })
    expect(graphics[1].end).toBeCloseTo(15.2, 5)
    expect(graphics[2]).toMatchObject({ id: 'ai3', kind: 'quote', start: 14, author: '' })
    for (const g of graphics) expect(g.end).toBeLessThanOrEqual(18)
  })
})

describe('문장과 이미 덮인 문장', () => {
  it('받아 적은 말을 문장으로 나눈다', () => {
    const sentences = toSentences(scriptToWords('Good morning everyone.\nCoffee first, always.', 6))
    expect(sentences.map((s) => s.text)).toEqual(['Good morning everyone.', 'Coffee first, always.'])
    expect(sentences[0].start).toBe(0)
    expect(sentences[1].end).toBeCloseTo(6, 5)
  })

  it('가운데 그래픽(제목·숫자·차트·목록·인용)이 문장의 절반 넘게 덮으면 덮인 것 — 이름표·자막은 셈하지 않는다', () => {
    const graphics: Graphic[] = [
      { id: 'a', kind: 'title', start: 0, end: 3, text: 'Hello' },
      { id: 'b', kind: 'lowerThird', start: 2.8, end: 7, name: 'Mina', role: '' },
      { id: 'c', kind: 'captions', start: 0, end: 18, words: [] },
      { id: 'd', kind: 'stat', start: 9, end: 10, value: 3, prefix: '', suffix: '', decimals: 0, label: '' },
    ]
    expect(coveredSentences(EN, graphics)).toEqual([true, false, false, false, false, false])
  })
})
