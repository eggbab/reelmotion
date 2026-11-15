import { describe, expect, it } from 'vitest'
import { MAX_SCRIPT, describePlan, draftPath, estimateSeconds, guessLang, isDraftId, planFromScript } from './plan'

const EN = 'Hi, I am Mina Park.\nMost people fall asleep 37% faster.\nFirst, no screens after ten. Second, wake up at the same time.'
const KO = '안녕하세요 저는 박미나입니다.\n대부분 37% 더 빨리 잠들어요.\n첫째, 10시 뒤엔 화면 끄기. 둘째, 같은 시간에 일어나기.'

describe('언어 어림', () => {
  it('가나가 있으면 일본어, 한글이 있으면 한국어, 아니면 영어', () => {
    expect(guessLang('こんにちは、朴ミナです。')).toBe('ja')
    expect(guessLang(KO)).toBe('ko')
    expect(guessLang(EN)).toBe('en')
    expect(guessLang('睡眠 37%')).toBe('ja')
    expect(guessLang('')).toBe('en')
  })
})

describe('말하는 데 걸리는 시간 어림', () => {
  it('영어 150낱말은 1분쯤, 한국어 330자는 1분쯤', () => {
    const english = Array.from({ length: 15 }, () => 'This is a plain sentence with ten words in it.').join(' ')
    expect(estimateSeconds(english, 'en')).toBeGreaterThan(55)
    expect(estimateSeconds(english, 'en')).toBeLessThan(75)
    const korean = Array.from({ length: 22 }, () => '오늘은 잠을 잘 자는 방법을 알려 드릴게요.').join(' ')
    expect(estimateSeconds(korean, 'ko')).toBeGreaterThan(50)
    expect(estimateSeconds(korean, 'ko')).toBeLessThan(80)
  })

  it('아주 짧아도 3초, 길어도 30분', () => {
    expect(estimateSeconds('Hi.', 'en')).toBe(3)
    expect(estimateSeconds('word '.repeat(20000), 'en')).toBe(1800)
  })
})

describe('대본에서 그래픽 계획', () => {
  it('자기소개 → 이름표, 숫자 → 숫자, 첫째·둘째 → 목록, 말 전체 → 자막. 시간은 영상 길이 안', () => {
    const plan = planFromScript(EN, { seconds: 20 })
    expect(plan).toMatchObject({ ok: true, language: 'en', seconds: 20, estimated: false })
    if (!plan.ok) return
    const kinds = plan.graphics.map((graphic) => graphic.kind)
    expect(kinds).toEqual(expect.arrayContaining(['lowerThird', 'stat', 'list', 'captions']))
    for (const graphic of plan.graphics) {
      expect(graphic.start).toBeGreaterThanOrEqual(0)
      expect(graphic.end).toBeLessThanOrEqual(20)
      expect(graphic.end).toBeGreaterThan(graphic.start)
      expect(graphic).not.toHaveProperty('id')
    }
    expect(plan.graphics.find((graphic) => graphic.kind === 'lowerThird')).toMatchObject({ name: 'Mina Park' })
    expect(plan.graphics.find((graphic) => graphic.kind === 'stat')).toMatchObject({ value: 37, suffix: '%' })
  })

  it('길이를 주지 않으면 대본에서 어림한다(estimated)', () => {
    const plan = planFromScript(KO, {})
    expect(plan).toMatchObject({ ok: true, language: 'ko', estimated: true })
    if (plan.ok) expect(plan.seconds).toBe(estimateSeconds(KO, 'ko'))
  })

  it('말한 언어를 주면 그대로 쓴다', () => {
    expect(planFromScript('Tokyo 2026', { language: 'ja' })).toMatchObject({ ok: true, language: 'ja' })
  })

  it('빈 대본·너무 긴 대본·틀린 길이는 까닭을 돌려준다', () => {
    expect(planFromScript('   ', {})).toEqual({ ok: false, error: 'empty' })
    expect(planFromScript('a'.repeat(MAX_SCRIPT + 1), {})).toEqual({ ok: false, error: 'too_long' })
    expect(planFromScript(EN, { seconds: 0 })).toEqual({ ok: false, error: 'bad_seconds' })
    expect(planFromScript(EN, { seconds: 4000 })).toEqual({ ok: false, error: 'bad_seconds' })
  })
})

describe('계획을 글로', () => {
  it('그래픽마다 한 줄: 시간·종류·내용(그 언어로)', () => {
    const plan = planFromScript(KO, { seconds: 20 })
    if (!plan.ok) throw new Error('plan failed')
    const text = describePlan(plan)
    expect(text).toMatch(/이름표: 박미나/)
    expect(text).toMatch(/숫자: 37%/)
    expect(text).toMatch(/자막/)
    expect(text.split('\n').length).toBe(plan.graphics.length)
    expect(describePlan({ ...plan, language: 'en' })).toMatch(/Name tag: 박미나/)
  })
})

describe('편집기로 여는 주소', () => {
  it('언어의 편집기 주소에 ?draft= 를 붙인다', () => {
    expect(draftPath('ko', 'd_0123456789abcdef0123456789abcdef')).toBe('/ko/app?draft=d_0123456789abcdef0123456789abcdef')
    expect(draftPath('en', 'd_0123456789abcdef0123456789abcdef')).toBe('/app?draft=d_0123456789abcdef0123456789abcdef')
  })

  it('초안 번호 꼴만 받는다', () => {
    expect(isDraftId('d_0123456789abcdef0123456789abcdef')).toBe(true)
    for (const bad of ['', 'd_123', '../etc', 'd_0123456789ABCDEF0123456789abcdef', 'x_0123456789abcdef0123456789abcdef', null, 5]) expect(isDraftId(bad), String(bad)).toBe(false)
  })
})
