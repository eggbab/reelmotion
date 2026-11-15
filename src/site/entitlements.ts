import { PLANS } from './plans'
import type { Plan } from './plans'

/**
 * 요금제 한도: 영상 길이·한 달 내보내기 횟수·워터마크(plans.ts). 서버(server/app)와 편집기가 같은 판단을 쓴다.
 * 베타 동안은 끈다(앱 서버의 ENFORCE_PLANS). 결제를 붙이는 날 켠다 — 그 전에는 누구나 제한 없이, 워터마크 없이.
 * 내보내기는 브라우저 안에서 하므로 이 확인은 정직한 사용자를 위한 것이다(코드를 고치면 피할 수 있다 — docs/operations.md).
 */
export type ExportCheck = { ok: true; watermark: boolean; remaining: number | null } | { ok: false; reason: 'login' | 'too_long' | 'limit' }

export function planOf(id: string): Plan {
  return PLANS.find((plan) => plan.id === id) ?? PLANS[0]
}

/** 사용량을 세는 달(서울 시간 'YYYY-MM'). */
export function monthKey(now: number): string {
  const seoul = new Date(now + 9 * 60 * 60 * 1000)
  return `${seoul.getUTCFullYear()}-${String(seoul.getUTCMonth() + 1).padStart(2, '0')}`
}

export function checkExport(input: { enforced: boolean; plan: string | null; durationSeconds: number; usedThisMonth: number }): ExportCheck {
  if (!input.enforced) return { ok: true, watermark: false, remaining: null }
  if (input.plan === null) return { ok: false, reason: 'login' }
  const plan = planOf(input.plan)
  // 영상 길이는 0.5초 넘게 남는 것까지 봐준다(1분 영상이 60.2초로 읽히는 경우).
  if (input.durationSeconds > plan.maxMinutes * 60 + 0.5) return { ok: false, reason: 'too_long' }
  if (input.usedThisMonth >= plan.exportsPerMonth) return { ok: false, reason: 'limit' }
  return { ok: true, watermark: plan.watermark, remaining: plan.exportsPerMonth - input.usedThisMonth - 1 }
}
