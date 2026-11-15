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
    expect(one('구독자가 3만 명이 됐어요')).toMatchObject({ value: 3, suffix: '만 명' })
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

  it('이어진 큰 수(12만 9천 원·3억 5천만 원·1億2000万円)를 한 숫자로 읽는다', () => {
    expect(findNumbers('가격은 12만 9천 원인데 저는 만족합니다')).toHaveLength(1)
    expect(one('가격은 12만 9천 원인데 저는 만족합니다')).toMatchObject({ value: 12.9, suffix: '만 원', decimals: 1, raw: '12만 9천 원' })
    expect(one('월급 300만 원 받는 직장인')).toMatchObject({ value: 300, suffix: '만 원', decimals: 0 })
    expect(findNumbers('1년에 1,000만 원 모으기').map((n) => [n.value, n.suffix])).toEqual([
      [1, '년'],
      [1000, '만 원'],
    ])
    expect(one('집값이 3억 5천만 원이에요')).toMatchObject({ value: 3.5, suffix: '억 원', decimals: 1 })
    expect(one('5천만 원이 필요해요')).toMatchObject({ value: 5000, suffix: '만 원' })
    expect(one('3만명이 모였어요')).toMatchObject({ value: 3, suffix: '만 명' })
    expect(one('手取り25万円で暮らす')).toMatchObject({ value: 25, suffix: '万円' })
    expect(one('資産は1億2000万円です')).toMatchObject({ value: 1.2, suffix: '億円', decimals: 1 })
    expect(one('値段は39,800円でした')).toMatchObject({ value: 39800, suffix: '円' })
  })

  it('말로 적은 돈 단위(dollars·euros)를 기호로 바꾼다', () => {
    expect(one("For 349 dollars, I think it's worth it")).toMatchObject({ value: 349, prefix: '$', suffix: '', raw: '349 dollars' })
    expect(one('Critics worry about the 85 million dollar cost')).toMatchObject({ value: 85, prefix: '$', suffix: 'M', after: 'cost' })
    expect(one('about 20 euros a month')).toMatchObject({ value: 20, prefix: '€' })
    expect(one('I saved 10,000 dollars in one year')).toMatchObject({ value: 10000, prefix: '$', after: 'in' })
  })

  it('퍼센트포인트·퍼센트·%대', () => {
    expect(one('기준금리를 0.25%포인트 내렸습니다')).toMatchObject({ value: 0.25, suffix: '%p', decimals: 2, raw: '0.25%포인트' })
    expect(one('매출이 30퍼센트 늘었어요')).toMatchObject({ value: 30, suffix: '%' })
    expect(one('물가는 여전히 2%대를 유지하고 있습니다')).toMatchObject({ value: 2, suffix: '%대' })
    expect(one('物価の上昇率は2%台が続いています')).toMatchObject({ value: 2, suffix: '%台' })
    expect(one('売上が30パーセント増えました')).toMatchObject({ value: 30, suffix: '%' })
  })

  it('시각·날짜·모르는 세는 말이 붙은 숫자, 이름에 붙은 숫자(MP3)는 건너뛴다', () => {
    expect(findNumbers('오늘 10시에 만나요')).toEqual([])
    expect(findNumbers('3월 15일에 열어요')).toEqual([])
    expect(findNumbers('아침 6시 30분에 일어나요')).toEqual([])
    expect(findNumbers('2호선을 타요')).toEqual([])
    expect(findNumbers('朝6時に起きます')).toEqual([])
    expect(findNumbers('3月10日に始めます')).toEqual([])
    expect(findNumbers('MP3 파일과 H264 영상')).toEqual([])
    expect(findNumbers('It supports 5G and 3D')).toEqual([])
  })

  it('조사만 붙은 숫자는 단위 없는 숫자로 둔다', () => {
    expect(one('점수가 90을 넘었다')).toMatchObject({ value: 90, suffix: '' })
    expect(one('合計は120になります')).toMatchObject({ value: 120, suffix: '' })
  })

  it('더 많은 세는 말(리터·가지·위·단계…)', () => {
    expect(one('하루에 물을 2리터 마셔요')).toMatchObject({ value: 2, suffix: '리터' })
    expect(one('방법은 3가지예요')).toMatchObject({ value: 3, suffix: '가지' })
    expect(one('전국 1위를 했어요')).toMatchObject({ value: 1, suffix: '위' })
    expect(one('5단계로 나눠요')).toMatchObject({ value: 5, suffix: '단계' })
    expect(one('3位になりました')).toMatchObject({ value: 3, suffix: '位' })
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
