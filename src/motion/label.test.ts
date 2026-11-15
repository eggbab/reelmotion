import { describe, expect, it } from 'vitest'
import { itemLabel, statLabel } from './label'
import { findNumbers } from './numbers'

/** 문장에서 값이 value 인 숫자를 골라(없으면 첫 숫자) 그 숫자의 설명을 본다 */
const label = (sentence: string, value?: number) => {
  const numbers = findNumbers(sentence)
  const n = value === undefined ? numbers[0] : numbers.find((item) => item.value === value)
  if (!n) throw new Error(`숫자를 못 찾음: ${sentence}`)
  return statLabel(sentence, n)
}
const items = (sentence: string) => findNumbers(sentence).map((n) => itemLabel(sentence, n))

describe('숫자 설명(한국어) — 숫자를 뺀 깨진 문장이 아니라, 무엇의 숫자인지', () => {
  it('바로 앞의 낱말(은·는·이·가·을·를·의)이 가리키는 것', () => {
    expect(label('가격은 12만 9천 원인데 저는 만족합니다.')).toBe('가격')
    expect(label('이로써 기준금리는 연 2.75%가 됐는데요.')).toBe('기준금리')
    expect(label('다만 물가는 여전히 2%대를 유지하고 있습니다.')).toBe('물가')
    expect(label('구독자가 10만 명을 넘었어요.')).toBe('구독자')
    expect(label('하루에 물을 2리터 마셔요.')).toBe('물')
    expect(label('매출의 30%를 차지해요.')).toBe('매출')
    expect(label('처음 1년은 정말 힘들었는데 지금은 단골손님이 하루 200명 정도 오세요.', 200)).toBe('단골손님')
  })

  it('조사 없이 바로 앞에 놓인 이름(월급 300만 원 · 직원 3명)', () => {
    expect(label('월급 300만 원 받는 직장인이 1년에 1,000만 원 모으는 방법 알려드릴게요.', 300)).toBe('월급')
    expect(label('직원 3명의 작은 회사예요.')).toBe('직원')
    expect(label('구독자 3만 명을 모았어요.')).toBe('구독자')
  })

  it('앞말이 풀이하는 말이면 화제(…는)를 쓰고, 화제가 없으면 앞말을 그대로', () => {
    expect(label('배터리는 한 번 충전하면 8시간 정도 가고요.')).toBe('배터리')
    expect(label('회사를 그만두고 가게를 연 지 3년 됐어요.')).toBe('가게를 연 지')
    expect(label('집에 충돌했을 때 3명이 안에 있었지만 그들 중 1명도 다치지 않았다.', 3)).toBe('집에 충돌했을 때')
  })

  it('숫자가 주어면 풀이말을 쓴다(15만 원은 비상금입니다 → 비상금)', () => {
    expect(label('남는 15만 원은 비상금입니다.')).toBe('비상금')
    expect(label('오늘은 5분 만에 만드는 계란 볶음밥이에요.')).toBe('계란 볶음밥')
    expect(label('그중 80%가 재구매합니다.')).toBe('재구매합니다')
  })

  it('퍼센트·배수가 꾸미는 말이면 숫자만 뺀 문장이 그대로 설명이 된다', () => {
    expect(label('대부분 37% 더 빨리 잠들어요.')).toBe('대부분 더 빨리 잠들어요')
    expect(label('매출이 42% 늘었어요.')).toBe('매출이 늘었어요')
    expect(label('한국은행이 기준금리를 0.25%포인트 내렸습니다.')).toBe('한국은행이 기준금리를 내렸습니다')
    expect(label('속도가 3배 정도 빨라졌어요.')).toBe('속도가 빨라졌어요')
  })

  it('숫자 뒤의 「의 ○○」(3개의 계정)', () => {
    expect(label('3개의 계정을 운영해요.')).toBe('계정')
  })

  it('설명에 다른 숫자나 깨진 조각이 남지 않는다', () => {
    for (const sentence of [
      '가격은 12만 9천 원인데 저는 만족합니다.',
      '월급 300만 원 받는 직장인이 1년에 1,000만 원 모으는 방법 알려드릴게요.',
      '오늘은 5분 만에 만드는 계란 볶음밥이에요.',
      '이로써 기준금리는 연 2.75%가 됐는데요.',
    ]) {
      for (const n of findNumbers(sentence)) {
        const text = statLabel(sentence, n)
        expect(text, sentence).not.toMatch(/\d/)
        expect(text, sentence).not.toMatch(/^(원|만에|대를|포인트|됐|정도)/)
      }
    }
  })
})

describe('숫자 설명(일본어)', () => {
  it('앞의 は·が·を·の 가 가리키는 것, 바로 앞에 놓인 이름', () => {
    expect(label('値段は39,800円でした。')).toBe('値段')
    expect(label('これで金利は0.75%になります。')).toBe('金利')
    expect(label('物価の上昇率は2%台が続いています。')).toBe('物価の上昇率')
    expect(label('売上は2倍になりました。')).toBe('売上')
    expect(label('手取り25万円で年間100万円貯める方法です。', 25)).toBe('手取り')
    expect(label('社員3人の小さな会社です。')).toBe('社員')
    expect(label('料金は月500円です。')).toBe('料金')
  })

  it('앞말이 풀이하는 말이면 화제(…は)를 쓴다', () => {
    expect(label('バッテリーは一回の充電で120分くらい持ちます。')).toBe('バッテリー')
    expect(label('これだけで一年後には96万円になります。')).toBe('一年後')
  })

  it('숫자 뒤의 「の○○」(約7000の島々 · 200人くらいのお客さん)', () => {
    expect(label('日本には約7000の島々があり、その最大は本州です。')).toBe('島々')
    expect(label('今は毎日200人くらいのお客さんが来てくれます。')).toBe('お客さん')
  })

  it('퍼센트·배수가 꾸미는 말이면 숫자만 뺀 문장', () => {
    expect(label('日本銀行は政策金利を0.25%引き上げました。')).toBe('日本銀行は政策金利を引き上げました')
  })

  it('숫자가 주어면 풀이말', () => {
    expect(label('そのうち80%がリピーターです。')).toBe('リピーター')
  })
})

describe('숫자 설명(영어)', () => {
  it('숫자가 세는 것이 뒤에 오면 그 말(5 nights a week · 20% of every paycheck)', () => {
    expect(label('And I cooked at home 5 nights a week.')).toBe('nights a week')
    expect(label('I put 20% of every paycheck into a separate account.')).toBe('of every paycheck')
    expect(label('The plan adds 40 miles of protected lanes over the next 3 years.', 40)).toBe('miles of protected lanes')
    expect(label('Critics worry about the 85 million dollar cost.')).toBe('cost')
    expect(label('He made 70 runs in just 41 balls by hitting 11 fours and 2 sixes.', 70)).toBe('runs')
    expect(label('We reached 2 million users in 3 months.', 2)).toBe('users')
  })

  it('숫자가 꾸미는 말이면 숫자만 뺀 문장(42% last year · 37% faster)', () => {
    expect(label('Our revenue grew 42% last year.')).toBe('Our revenue grew last year')
    expect(label('Most people fall asleep 37% faster.')).toBe('Most people fall asleep faster')
    expect(label('We grew 40%.')).toBe('We grew')
    expect(label('And 3x more users.')).toBe('more users')
  })

  it('그렇게 하면 다른 숫자가 남거나 너무 길 때는 앞말만', () => {
    expect(label('I cut my subscriptions from 9 down to 3.', 9)).toBe('I cut my subscriptions')
    expect(label('Out of 1,400 people polled before the 2010 election, support grew by 8% since 2008.', 8)).toBe('support grew')
    expect(label("Here's how I saved 10,000 dollars in one year on a normal salary.")).toBe('I saved')
  })

  it('마땅한 말이 없으면 비운다(깨진 조각을 쓰지 않는다)', () => {
    expect(label("For 349 dollars, I think it's worth it.")).toBe('')
  })
})

describe('막대 이름표', () => {
  it('숫자마다 바로 앞의 이름(조사는 뗀다)', () => {
    expect(items('월세랑 고정비로 120만 원, 생활비 80만 원, 그리고 저축은 85만 원씩 자동이체 하세요.')).toEqual(['고정비', '생활비', '저축'])
    expect(items('Apple 30%, Banana 50%, Cherry 20%.')).toEqual(['Apple', 'Banana', 'Cherry'])
    expect(items('家賃と固定費で11万円、生活費は6万円、貯金は毎月8万円を先に分けます。')).toEqual(['家賃と固定費', '生活費', '貯金'])
    expect(items('사과 30개, 바나나 50개')).toEqual(['사과', '바나나'])
  })

  it('이름이 아닌 말(때·중·1년에)은 이름표로 쓰지 않는다', () => {
    expect(items('집에 충돌했을 때 3명이 안에 있었지만 그들 중 1명도 다치지 않았다.')).toEqual(['', ''])
    // 숫자 셋: 300만 원(월급) · 1년 · 1,000만 원(바로 앞이 「1년에」라 이름이 없다)
    expect(items('월급 300만 원 받는 직장인이 1년에 1,000만 원 모으는 방법')).toEqual(['월급', '직장인', ''])
  })
})
