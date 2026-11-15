import { release } from './http'
import type { ClientEvent } from './pulseEvents'

const sent = new Set<ClientEvent>()

/**
 * 쓰임 숫자 하나를 서버에 알린다(편집기를 열었다·내보내기를 끝냈다 같은 이름만 — 누가, 무엇을 넣었는지는 보내지 않는다).
 * 서버는 날짜·이름·브라우저 종류마다 횟수만 센다(server/app/pulse.ts). 알리지 못해도 편집은 그대로다.
 * once: 화면을 연 동안 한 번만 센다(편집기 열기처럼 다시 그려질 때마다 세면 안 되는 것).
 */
export function pulse(event: ClientEvent, options: { once?: boolean } = {}): void {
  if (typeof fetch !== 'function') return
  if (options.once) {
    if (sent.has(event)) return
    sent.add(event)
  }
  try {
    void fetch('/api/pulse', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ event }), keepalive: true }).then(release, () => undefined)
  } catch {
    // 인터넷이 없거나 서버가 꺼져 있어도 아무 일도 하지 않는다
  }
}

export function resetPulseForTest(): void {
  sent.clear()
}
