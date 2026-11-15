/**
 * 운영자가 「쓰이고 있는지, 어디서 막히는지」를 보는 숫자의 이름. 누가 했는지는 남기지 않는다 —
 * 서울 날짜 · 사건 이름 · 브라우저 종류마다 횟수만 센다(server/app/pulse.ts, 개인정보처리방침에 적었다).
 * 화면이 알리는 것(CLIENT)과 서버가 스스로 세는 것(SERVER)을 나눈다: 화면은 CLIENT 만 보낼 수 있다.
 * 사건을 더하면 관리자 화면의 이름(src/admin/copy.ts 의 pulse.events)도 함께 더한다(시험이 잡는다).
 */
export const CLIENT_EVENTS = [
  'editor_open',
  'video_added',
  'sample_opened',
  'draft_opened',
  'transcribe_ok',
  'transcribe_failed',
  'graphics_made',
  'export_started',
  'export_done',
  'export_failed',
  'export_unsupported',
] as const
export const SERVER_EVENTS = ['chat_edit', 'connector_plan', 'connector_link'] as const

export type ClientEvent = (typeof CLIENT_EVENTS)[number]
export type PulseEvent = ClientEvent | (typeof SERVER_EVENTS)[number]
export const PULSE_EVENTS: readonly PulseEvent[] = [...CLIENT_EVENTS, ...SERVER_EVENTS]

export function isClientEvent(value: unknown): value is ClientEvent {
  return typeof value === 'string' && (CLIENT_EVENTS as readonly string[]).includes(value)
}
