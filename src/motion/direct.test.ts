import { describe, expect, it } from 'vitest'
import { scriptToWords } from '../captions/segment'
import { direct, splitSentences } from './direct'
import type { Graphic } from './types'

const timed = (script: string, seconds = 20) => scriptToWords(script, seconds)
const kinds = (graphics: Graphic[]) => graphics.map((g) => g.kind)
const byKind = <K extends Graphic['kind']>(graphics: Graphic[], kind: K) =>
  graphics.filter((g): g is Extract<Graphic, { kind: K }> => g.kind === kind)

describe('splitSentences', () => {
  it('문장 부호와 줄바꿈에서 나눈다', () => {
    const words = timed('Hello there. How are you?\nFine thanks')
    expect(splitSentences(words).map((s) => s.text)).toEqual(['Hello there.', 'How are you?', 'Fine thanks'])
  })
})

describe('direct', () => {
  it('말 전체에 자막을 깔고, 첫 문장으로 제목을 만든다', () => {
    const graphics = direct(timed('Three habits that changed my mornings.\nLet me show you.'))
    expect(kinds(graphics)).toContain('captions')
    const [title] = byKind(graphics, 'title')
    expect(title.text).toBe('Three habits that changed my mornings.')
    expect(title.end - title.start).toBeGreaterThanOrEqual(2.4)
  })

  it('자기소개에서 이름 띠를 만든다', () => {
    const [lower] = byKind(direct(timed("Hi, I'm Mina Park, a product designer.\nToday we talk color.")), 'lowerThird')
    expect(lower).toMatchObject({ name: 'Mina Park', role: 'product designer' })
    const [ko] = byKind(direct(timed('안녕하세요 저는 김하늘입니다.\n오늘은 색 이야기를 해요.')), 'lowerThird')
    expect(ko.name).toBe('김하늘')
    const [ja] = byKind(direct(timed('こんにちは 私は田中です。\n今日は色の話です。')), 'lowerThird')
    expect(ja.name).toBe('田中')
  })

  it('숫자 하나는 큰 숫자로, 여러 개는 막대 차트로 만든다', () => {
    const graphics = direct(timed('Intro line here.\nOur revenue grew 42% last year.\nApple 30%, Banana 50%, Cherry 20%.', 30))
    const [stat] = byKind(graphics, 'stat')
    expect(stat).toMatchObject({ value: 42, suffix: '%' })
    expect(stat.label).toBe('Our revenue grew last year')
    const [bars] = byKind(graphics, 'bars')
    expect(bars.items.map((item) => item.label)).toEqual(['Apple', 'Banana', 'Cherry'])
    expect(bars.unit).toBe('%')
  })

  it('첫째·둘째처럼 이어지는 말을 목록으로 만든다', () => {
    const graphics = direct(timed('Here is my routine.\nFirst, drink water.\nSecond, stretch for five minutes.\nThird, plan the day.', 24))
    const [list] = byKind(graphics, 'list')
    expect(list.items).toEqual(['drink water', 'stretch for five minutes', 'plan the day'])
    expect(list.itemTimes).toHaveLength(3)
    const ko = byKind(direct(timed('제 아침 루틴이에요.\n첫째, 물 마시기.\n둘째, 스트레칭.', 18)), 'list')[0]
    expect(ko.items).toEqual(['물 마시기', '스트레칭'])
  })

  it('따옴표 속 말은 인용으로 만든다', () => {
    const [quote] = byKind(direct(timed('My mentor said "done is better than perfect" and it stuck.', 10)), 'quote')
    expect(quote.text).toBe('done is better than perfect')
  })

  it('화면 가운데 그래픽은 서로 겹치지 않는다', () => {
    const graphics = direct(timed('Big news today.\nWe grew 40%.\nAnd 3x more users.\nFirst, focus.\nSecond, ship.', 12))
    const center = graphics.filter((g) => ['title', 'stat', 'bars', 'list', 'quote'].includes(g.kind)).sort((a, b) => a.start - b.start)
    for (let i = 1; i < center.length; i++) expect(center[i].start).toBeGreaterThanOrEqual(center[i - 1].end - 1e-9)
    for (const g of graphics) expect(g.end).toBeGreaterThan(g.start)
  })

  it('말이 없으면 아무것도 만들지 않는다', () => {
    expect(direct([])).toEqual([])
  })
})
