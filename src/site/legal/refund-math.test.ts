import { describe, expect, it } from 'vitest'
import { PLANS } from '../plans'
import { REFUND_EXAMPLE, refundAfterWindow, refundPenalty, usedValue } from './refund-math'

describe('환불 계산', () => {
  it('쓴 날의 값은 결제한 금액을 날 수로 나눠 1원 미만을 버린다', () => {
    expect(usedValue(14900, 30, 10)).toBe(4966)
    expect(usedValue(14900, 30, 0)).toBe(0)
    expect(usedValue(14900, 30, 30)).toBe(14900)
  })

  it('남은 금액에서 위약금 10%(1원 미만 버림)를 빼고 돌려준다', () => {
    expect(refundPenalty(9934)).toBe(993)
    expect(refundAfterWindow(14900, 30, 10)).toBe(8941)
    expect(refundAfterWindow(29900, 31, 31)).toBe(0)
  })

  it('계산 예는 크리에이터 요금제의 실제 값으로 만든다', () => {
    const creator = PLANS.find((plan) => plan.id === 'creator')!
    expect(REFUND_EXAMPLE.paid).toBe(creator.monthlyWon)
    expect(REFUND_EXAMPLE.used + REFUND_EXAMPLE.remaining).toBe(REFUND_EXAMPLE.paid)
    expect(REFUND_EXAMPLE.remaining - REFUND_EXAMPLE.penalty).toBe(REFUND_EXAMPLE.amount)
    expect(REFUND_EXAMPLE.amount).toBe(refundAfterWindow(creator.monthlyWon, 30, 10))
  })
})
