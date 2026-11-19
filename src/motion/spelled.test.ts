import { describe, expect, it } from 'vitest'
import { spellNumbers } from './spelled'

const same = (text: string, opening = false) => expect(spellNumbers(text, opening)).toBe(text)

describe('글로 적은 숫자를 숫자로(영어)', () => {
  it('퍼센트·돈·배수는 늘 바꾼다', () => {
    expect(spellNumbers('Sales grew thirty percent this year.')).toBe('Sales grew 30 percent this year.')
    expect(spellNumbers('It costs two hundred dollars.')).toBe('It costs 200 dollars.')
    expect(spellNumbers('It is three times faster than before.')).toBe('It is 3 times faster than before.')
    expect(spellNumbers('Rates rose two point five percent.')).toBe('Rates rose 2.5 percent.')
    expect(spellNumbers('The deal was worth eighty-five million dollars.')).toBe('The deal was worth 85 million dollars.')
    expect(spellNumbers('One hundred percent of them agreed.', true)).toBe('100 percent of them agreed.')
  })

  it('기간은 첫 문장(제목 자리)이 아닐 때, 큰 수는 늘', () => {
    expect(spellNumbers('I have been designing apps for eight years.')).toBe('I have been designing apps for 8 years.')
    same('So I have been using this desk for about three months now.', true)
    expect(spellNumbers('Then it is a twelve hour shift on the ward.')).toBe('Then it is a 12 hour shift on the ward.')
    expect(spellNumbers('Then it is a twelve-hour shift.')).toBe('Then it is a 12-hour shift.')
    expect(spellNumbers('It took one hundred and twenty days.', true)).toBe('It took 120 days.')
    expect(spellNumbers('A hundred people showed up.', true)).toBe('100 people showed up.')
    expect(spellNumbers('We now have twenty-five thousand users.')).toBe('We now have 25 thousand users.')
  })

  it('작은 개수·시각·서수·한 개·이어진 수는 그대로', () => {
    same('Three habits for better sleep.', true)
    same('Here are three habits for better sleep.')
    same('I tried three times.')
    same('I start my shift at seven, so I am up by five thirty.')
    same('No one came. One of them left.')
    same('It happened in the twenty-first century.')
    same('We met at eleven o’clock.')
    same('Twenty twenty-four was a good year.')
    same('Someone often says nothing.')
  })
})

describe('글로 적은 숫자를 숫자로(한국어)', () => {
  it('퍼센트·돈·배수', () => {
    expect(spellNumbers('매출이 삼십 퍼센트 늘었어요.')).toBe('매출이 30퍼센트 늘었어요.')
    expect(spellNumbers('속도가 두 배 빨라졌어요.', true)).toBe('속도가 2배 빨라졌어요.')
    expect(spellNumbers('가격은 오십만 원이에요.')).toBe('가격은 50만 원이에요.')
    expect(spellNumbers('모두 삼억 오천만 원이 들었어요.')).toBe('모두 3억 5000만 원이 들었어요.')
    expect(spellNumbers('단돈 만 원이에요.')).toBe('단돈 1만 원이에요.')
  })

  it('기간·나이·큰 수', () => {
    expect(spellNumbers('그리고 삼십 분 정도 책을 읽어요.')).toBe('그리고 30분 정도 책을 읽어요.')
    expect(spellNumbers('하루에 열두 시간 일해요.', true)).toBe('하루에 12시간 일해요.')
    expect(spellNumbers('벌써 서른 살이에요.')).toBe('벌써 30살이에요.')
    expect(spellNumbers('구독자가 삼천 명이에요.')).toBe('구독자가 3000명이에요.')
    expect(spellNumbers('하루에 여섯 시간은 자요.')).toBe('하루에 6시간은 자요.')
    same('잠은 최소 여섯 시간은 자야 해요.', true)
  })

  it('시각·작은 개수·한 개·말 속 글자는 그대로', () => {
    same('오늘은 아침 여섯 시에 일어났어요.')
    same('잠이 잘 오는 세 가지 습관.', true)
    same('계란 두 개를 풀어서 넣어요.')
    same('이 무선 이어폰 한 달 써 봤는데요.')
    same('세 분이 오셨어요.')
    same('백화점에 갔다가 천천히 걸었어요. 만약에 비가 오면요.')
    same('이 년 동안 오만했어요.')
    same('그것만 해도 충분해요.')
    same('새해에 세배 했어요.')
    // 숫자로 적은 수에 붙은 큰 단위는 numbers.ts 가 읽는다(「12만 9천 원」의 「9천 원」을 따로 바꾸지 않는다)
    same('가격은 12만 9천 원인데 저는 만족합니다.')
    same('월세랑 고정비로 120만 원, 생활비 80만 원이에요.')
    same('100만 원에서 500만 원으로 늘었어요.')
  })
})

describe('글로 적은 숫자를 숫자로(일본어)', () => {
  it('割合·お金·倍', () => {
    expect(spellNumbers('売上が三割伸びました。')).toBe('売上が3割伸びました。')
    expect(spellNumbers('値段は五千円でした。')).toBe('値段は5000円でした。')
    expect(spellNumbers('二倍の速さです。', true)).toBe('2倍の速さです。')
    expect(spellNumbers('全部で三億五千万円です。')).toBe('全部で3億5000万円です。')
  })

  it('期間・大きな数', () => {
    expect(spellNumbers('お店を始めて三年になります。')).toBe('お店を始めて3年になります。')
    expect(spellNumbers('三十分くらい本を読みます。', true)).toBe('30分くらい本を読みます。')
    expect(spellNumbers('十分くらい休みます。')).toBe('10分くらい休みます。')
    expect(spellNumbers('毎日二百人くらい来ます。')).toBe('毎日200人くらい来ます。')
    same('このロボット掃除機を二か月使ってみました。', true)
  })

  it('時刻・小さな数・一・言葉の一部はそのまま', () => {
    same('今日は朝六時に起きました。')
    same('それで十分です。')
    same('卵を二個入れて、大さじ一杯。')
    same('一緒に八百屋へ行きました。')
    same('三日坊主にならないように。')
    same('第三回の会議です。')
    same('手取り25万円で、1億2000万円の家を買いました。')
  })
})
