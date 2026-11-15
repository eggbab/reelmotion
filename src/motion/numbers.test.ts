import { describe, expect, it } from 'vitest'
import { findNumbers } from './numbers'

const one = (text: string) => findNumbers(text)[0]

describe('findNumbers', () => {
  it('퍼센트와 통화를 알아본다', () => {
    expect(one('Sales grew 42% this year')).toMatchObject({ value: 42, prefix: '', suffix: '%', decimals: 0 })
    expect(one('We raised $1,200 in a week')).toMatchObject({ value: 1200, prefix: '$', suffix: '' })
    expect(one('It costs €3.5 per month')).toMatchObject({ value: 3.5, prefix: '€', decimals: 1 })
  })

  it('영어 단위 낱말을 기호로 바꾼다', () => {
    expect(one('about 30 percent of people')).toMatchObject({ value: 30, suffix: '%' })
    expect(one('we reached 2 million users')).toMatchObject({ value: 2, suffix: 'M' })
    expect(one('3x faster')).toMatchObject({ value: 3, suffix: 'x' })
  })

  it('한·일 세는 말(명·년·人 등)도 단위로 붙여 둔다', () => {
    expect(one('3명이 다쳤다')).toMatchObject({ value: 3, suffix: '명' })
    expect(one('천 년은 1000년이다')).toMatchObject({ value: 1000, suffix: '년' })
    expect(one('5人が来た')).toMatchObject({ value: 5, suffix: '人' })
  })

  it('연도(2024년 포함)는 건너뛴다', () => {
    expect(findNumbers('2024년에 시작했다')).toEqual([])
  })

  it('한국어·일본어 단위를 붙여 둔다', () => {
    expect(one('매출이 30% 늘었어요')).toMatchObject({ value: 30, suffix: '%' })
    expect(one('가격은 9,900원입니다')).toMatchObject({ value: 9900, suffix: '원' })
    expect(one('구독자가 3만 명이 됐어요')).toMatchObject({ value: 3, suffix: '만' })
    expect(one('売上は2倍になりました')).toMatchObject({ value: 2, suffix: '倍' })
    expect(one('料金は500円です')).toMatchObject({ value: 500, suffix: '円' })
  })

  it('한 문장의 여러 숫자를 순서대로 돌려준다', () => {
    expect(findNumbers('Apple 30%, Banana 50%, Cherry 20%').map((n) => n.value)).toEqual([30, 50, 20])
  })

  it('연도처럼 보이는 네 자리 수는 건너뛴다', () => {
    expect(findNumbers('In 2024 we started')).toEqual([])
    expect(findNumbers('In 2024 we grew 40%').map((n) => n.value)).toEqual([40])
  })

  it('숫자 앞 낱말을 이름표로 쓸 수 있게 알려준다', () => {
    expect(findNumbers('Apple 30%, Banana 50%').map((n) => n.before)).toEqual(['Apple', 'Banana'])
  })

  it('숫자 바로 뒤에 붙은 낱말을 알려준다(쉼표가 끼면 비운다)', () => {
    expect(findNumbers('70 runs in just 41 balls').map((n) => n.after)).toEqual(['runs', 'balls'])
    expect(findNumbers('Apple 30, Banana 50').map((n) => n.after)).toEqual(['', ''])
    expect(findNumbers('사과 30개, 바나나 50개').map((n) => [n.before, n.after])).toEqual([
      ['사과', ''],
      ['바나나', ''],
    ])
  })
})
