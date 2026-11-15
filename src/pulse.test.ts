import { afterEach, describe, expect, it, vi } from 'vitest'
import { pulse, resetPulseForTest } from './pulse'

afterEach(() => {
  vi.unstubAllGlobals()
  resetPulseForTest()
})

function stubFetch(reply: () => Promise<Response> = async () => new Response(null, { status: 204 })) {
  const calls: { url: string; body: unknown; keepalive: unknown }[] = []
  vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)), keepalive: init.keepalive })
    return reply()
  })
  return calls
}

describe('쓰임 숫자 알리기', () => {
  it('이름만 보낸다(누가 했는지·무엇을 넣었는지는 보내지 않는다)', () => {
    const calls = stubFetch()
    pulse('export_done')
    expect(calls).toEqual([{ url: '/api/pulse', body: { event: 'export_done' }, keepalive: true }])
  })

  it('once 는 화면을 연 동안 한 번만', () => {
    const calls = stubFetch()
    pulse('editor_open', { once: true })
    pulse('editor_open', { once: true })
    pulse('graphics_made')
    pulse('graphics_made')
    expect(calls.map((call) => (call.body as { event: string }).event)).toEqual(['editor_open', 'graphics_made', 'graphics_made'])
  })

  it('서버가 없거나 인터넷이 끊겨도 아무 일도 일어나지 않는다', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch')
    })
    expect(() => pulse('video_added')).not.toThrow()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
})
