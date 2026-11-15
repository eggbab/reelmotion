import { describe, expect, it } from 'vitest'
import { PULSE_EVENTS } from '../pulseEvents'
import { agentLabel } from './agent'
import { ADMIN_COPY } from './copy'

describe('관리자 화면의 쓰임 숫자', () => {
  it('세는 사건마다 세 언어의 이름이 있다(사건을 더하고 이름을 빠뜨리면 여기서 잡힌다)', () => {
    for (const lang of ['ko', 'en', 'ja'] as const) {
      const names = ADMIN_COPY[lang].pulse.events
      expect(Object.keys(names).sort(), lang).toEqual([...PULSE_EVENTS].sort())
      for (const event of PULSE_EVENTS) expect(names[event].trim(), `${lang} ${event}`).not.toBe('')
    }
  })

  it('브라우저 종류를 사람이 읽는 이름으로', () => {
    const copy = ADMIN_COPY.ko.pulse
    expect(agentLabel('chrome-windows', copy)).toBe('크롬 · 윈도우')
    expect(agentLabel('safari-ios', copy)).toBe('사파리 · 아이폰·아이패드')
    expect(agentLabel('inapp-android', copy)).toBe('앱 안 브라우저 · 안드로이드')
    expect(agentLabel('chrome-linux', copy)).toBe('크롬 · 리눅스')
    expect(agentLabel('chrome-chromeos', copy)).toBe('크롬 · 크롬북')
    expect(agentLabel('connector', copy)).toBe('Claude·ChatGPT')
    expect(agentLabel('bot', copy)).toBe('자동 프로그램')
    expect(agentLabel('weird-thing', copy)).toBe('weird-thing')
  })
})
