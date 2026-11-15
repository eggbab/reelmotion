import { PLANS } from '../plans'

/**
 * 환불 기준. 같은 사업자(브이미랩스)의 AllMails 환불 안내(2026-11-06 사용자 결정)를 따른다.
 * - 결제한 날부터 7일 안: 썼더라도 결제한 금액 전부(전자상거래법 제17조 청약철회 7일).
 * - 7일이 지난 뒤: 쓴 날의 값을 빼고, 남은 금액에서 위약금 10%를 뺀다. ReelMotion 은 1개월 결제만 있어 할인을 되돌리는 계산은 없다.
 *   「7일 뒤 환불 없음」은 쓰지 않는다: 1개월 이상 이어지는 결제는 방문판매법의 계속거래라 언제든 해지할 수 있고
 *   쓰지 않은 기간의 돈을 돌려줘야 하며, 그것을 막는 약관은 무효다(제31·32·52조).
 * - 안내와 다르게 동작했으면: 열린 날부터 3개월 안, 안 날부터 30일 안에 전액(전자상거래법 제17조 3항).
 * - 돌려 드리는 때: 3영업일 안(전자상거래법 제18조).
 * 바꾸면 refund.ts(환불 규정 글)도 함께 고친다.
 */
export const REFUND_WINDOW_DAYS = 7
export const REFUND_PENALTY_PERCENT = 10
export const REFUND_BUSINESS_DAYS = 3

/** 쓴 날의 값: 결제한 금액 × 쓴 날 수 ÷ 요금제 전체 날 수, 1원 미만은 버린다(버린 만큼 손님이 더 받는다). */
export function usedValue(paid: number, totalDays: number, usedDays: number): number {
  return Math.floor((paid * usedDays) / totalDays)
}

/** 위약금: 남은 금액의 10%, 1원 미만은 버린다. */
export function refundPenalty(remaining: number): number {
  return Math.floor((remaining * REFUND_PENALTY_PERCENT) / 100)
}

/** 7일이 지난 뒤 돌려 드리는 금액 */
export function refundAfterWindow(paid: number, totalDays: number, usedDays: number): number {
  const remaining = Math.max(0, paid - usedValue(paid, totalDays, usedDays))
  return remaining - refundPenalty(remaining)
}

const creator = PLANS.find((plan) => plan.id === 'creator')!
const EXAMPLE_DAYS = 30
const EXAMPLE_USED = 10
const exampleUsed = usedValue(creator.monthlyWon, EXAMPLE_DAYS, EXAMPLE_USED)
const exampleRemaining = creator.monthlyWon - exampleUsed

/** 환불 규정의 계산 예: 크리에이터 1개월(30일)을 10일 쓰고 그만둘 때 */
export const REFUND_EXAMPLE = {
  plan: creator.id,
  paid: creator.monthlyWon,
  totalDays: EXAMPLE_DAYS,
  usedDays: EXAMPLE_USED,
  used: exampleUsed,
  remaining: exampleRemaining,
  penalty: refundPenalty(exampleRemaining),
  amount: refundAfterWindow(creator.monthlyWon, EXAMPLE_DAYS, EXAMPLE_USED),
} as const
