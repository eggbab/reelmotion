/**
 * 요금제 값의 주인. 사용자 지시(2026-11-14): "너가 정해줘 적당한 가격(조사를 통해)".
 * 결제가 아직 없어 화면에는 「곧 나와요」로만 보이고, 베타 동안은 모든 기능이 무료다.
 *
 * 조사(2026-11-14·15, 각 사 요금 페이지): ChatCut 월 25달러(연 결제 시 21달러, 모션그래픽 포함) ·
 * Submagic 월 19달러(연 결제 시 12달러, 영상 15개·2분) · OpusClip 월 15·29달러 · 캡컷 스탠다드 9.99달러, 프로 19.99달러.
 * 정한 까닭(2026-11-15 다시 정함): 서비스의 중심이 자막에서 모션그래픽으로 바뀌어 값을 올렸다.
 * 크리에이터는 캡컷 스탠다드 수준(약 10달러), 프로는 ChatCut 보다 낮은 약 20달러.
 * 한도는 내보내기를 서버에서 할지 정할 때 실제 처리 비용으로 확정한다.
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
  { id: 'creator', monthlyWon: 14900, maxMinutes: 5, exportsPerMonth: 30, watermark: false, available: false },
  { id: 'pro', monthlyWon: 29900, maxMinutes: 30, exportsPerMonth: 100, watermark: false, available: false },
]

export function formatWon(won: number): string {
  return won.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
