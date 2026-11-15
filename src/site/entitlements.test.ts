import { describe, expect, it } from 'vitest'
import { checkExport, monthKey, planOf } from './entitlements'

describe('요금제 한도', () => {
  it('한도를 켜기 전(베타)에는 누구나 길이·횟수 제한 없이, 워터마크 없이', () => {
    expect(checkExport({ enforced: false, plan: null, durationSeconds: 3600, usedThisMonth: 999 })).toEqual({ ok: true, watermark: false, remaining: null })
  })

  it('한도를 켜면 로그인해야 하고, 요금제마다 길이·횟수·워터마크', () => {
    expect(checkExport({ enforced: true, plan: null, durationSeconds: 10, usedThisMonth: 0 })).toEqual({ ok: false, reason: 'login' })
    expect(checkExport({ enforced: true, plan: 'free', durationSeconds: 60, usedThisMonth: 2 })).toEqual({ ok: true, watermark: true, remaining: 0 })
    expect(checkExport({ enforced: true, plan: 'free', durationSeconds: 61, usedThisMonth: 0 })).toEqual({ ok: false, reason: 'too_long' })
    expect(checkExport({ enforced: true, plan: 'free', durationSeconds: 30, usedThisMonth: 3 })).toEqual({ ok: false, reason: 'limit' })
    expect(checkExport({ enforced: true, plan: 'creator', durationSeconds: 300, usedThisMonth: 29 })).toEqual({ ok: true, watermark: false, remaining: 0 })
    expect(checkExport({ enforced: true, plan: 'pro', durationSeconds: 1800, usedThisMonth: 0 })).toEqual({ ok: true, watermark: false, remaining: 99 })
  })

  it('모르는 요금제는 무료로', () => {
    expect(planOf('gold').id).toBe('free')
  })

  it('달은 서울 시간으로 센다', () => {
    expect(monthKey(Date.UTC(2026, 10, 30, 14, 59))).toBe('2026-11')
    expect(monthKey(Date.UTC(2026, 10, 30, 15, 0))).toBe('2026-12')
  })
})
