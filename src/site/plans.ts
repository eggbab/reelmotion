/**
 * 요금제 값의 주인. 사용자 지시(2026-11-14): "너가 정해줘 적당한 가격(조사를 통해)".
 * 아직 결제를 받을 수 없고 내보내기도 없으므로 화면에는 「준비 중」으로만 보인다.
 *
 * 조사(2026-11-14, 각 사 요금 페이지): Submagic 월 19달러(연 결제 시 월 12달러, 영상 15개·2분) ·
 * OpusClip 월 15·29달러 · 캡컷 스탠다드 월 9.99달러, 프로 19.99달러 · ChatCut 월 25달러(연 결제 시 21달러).
 * 정한 까닭: 지금은 자막만 하므로 자막 전문 도구(Submagic 19달러)와 캡컷 스탠다드(9.99달러)보다 낮게 시작한다.
 * 움직이는 그림·대화 편집이 붙으면 다시 정한다. 한도는 내보내기 서버를 만들 때 실제 처리 속도로 확정한다.
 */
export type PlanId = 'free' | 'creator' | 'pro'

export type Plan = {
  id: PlanId
  /** 한 달 값(원, 부가세 포함) */
  monthlyWon: number
  /** 영상 하나의 최대 길이(분) */
  maxMinutes: number
  /** 한 달에 내보낼 수 있는 영상 수 */
  exportsPerMonth: number
  watermark: boolean
  available: boolean
}

export const PLANS: Plan[] = [
  { id: 'free', monthlyWon: 0, maxMinutes: 1, exportsPerMonth: 3, watermark: true, available: true },
  { id: 'creator', monthlyWon: 9900, maxMinutes: 5, exportsPerMonth: 30, watermark: false, available: false },
  { id: 'pro', monthlyWon: 19900, maxMinutes: 30, exportsPerMonth: 100, watermark: false, available: false },
]

export function formatWon(won: number): string {
  return won.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
