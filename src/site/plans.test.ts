import { describe, expect, it } from 'vitest'
import { PLANS, formatWon } from './plans'

describe('PLANS', () => {
  it('무료 → 크리에이터 → 프로 순서로 값과 한도가 커진다', () => {
    expect(PLANS.map((plan) => plan.id)).toEqual(['free', 'creator', 'pro'])
    for (let i = 1; i < PLANS.length; i++) {
      expect(PLANS[i].monthlyWon).toBeGreaterThan(PLANS[i - 1].monthlyWon)
      expect(PLANS[i].maxMinutes).toBeGreaterThan(PLANS[i - 1].maxMinutes)
      expect(PLANS[i].exportsPerMonth).toBeGreaterThan(PLANS[i - 1].exportsPerMonth)
    }
  })

  it('결제를 받을 수 있기 전에는 유료 요금제를 살 수 있다고 하지 않는다', () => {
    expect(PLANS.filter((plan) => plan.monthlyWon > 0).every((plan) => !plan.available)).toBe(true)
  })
})

describe('formatWon', () => {
  it('세 자리마다 쉼표를 넣는다', () => {
    expect(formatWon(0)).toBe('0')
    expect(formatWon(9900)).toBe('9,900')
    expect(formatWon(1234567)).toBe('1,234,567')
  })
})
