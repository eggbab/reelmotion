import type { PlanId } from '../../src/site/plans'
import type { UserRow } from './db'

/**
 * 결제(카드) 연결 자리. 사용자 결정(2026-11-15): 「결제는 카드로 붙일 거고, 내가 나중에 붙일 것」.
 * 결제사를 정하면 이 모양에 맞는 구현 하나를 만들어 main.ts 에서 넘기면 된다(docs/operations.md 「결제 붙이기」):
 *  - startCheckout: 결제 화면 주소를 만든다(사용자·요금제·돌아올 주소).
 *  - handleWebhook: 결제사가 보내는 알림을 서명으로 확인하고, 결제가 끝나면 setPlan 으로 요금제와 끝나는 날을 적는다.
 * 그 전에는 null — 「결제 준비 중」이고, 요금제는 관리 명령(admin.ts 의 set-plan)으로 손으로 줄 수 있다.
 */
export interface BillingProvider {
  /** 화면에 보일 결제사 이름 */
  name: string
  startCheckout(input: { user: UserRow; plan: Exclude<PlanId, 'free'>; returnUrl: string }): Promise<{ url: string }>
  /** 결제사 알림. 처리했으면 200, 서명이 틀리면 400 을 돌려준다. */
  handleWebhook(request: Request, setPlan: (userId: string, plan: PlanId, until: number | null) => void): Promise<Response>
}
