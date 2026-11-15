import { afterEach, describe, expect, it, vi } from 'vitest'
import { findHighlights } from './aiPicks'
import type { HighlightSentence } from './highlights'

const sentences: HighlightSentence[] = [
  { text: 'Good morning everyone.', start: 0, end: 2.4 },
  { text: 'Coffee first, always.', start: 2.8, end: 4.4 },
  { text: 'Then I pack my lunch.', start: 4.8, end: 6.4 },
]
const request = { sentences, covered: [false, false, false], duration: 12 }

afterEach(() => vi.unstubAllGlobals())

function reply(status: number, body: unknown) {
  const calls: { url: string; body: unknown }[] = []
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)) })
    return Response.json(body, { status })
  })
  return calls
}

describe('AI 로 강조할 순간 찾기 — 편집기 쪽', () => {
  it('문장·덮인 표시·길이를 보내고, 받은 고르기를 한 번 더 검사한다', async () => {
    const calls = reply(200, { picks: [{ kind: 'list', from: 1, to: 2, title: '', items: ['Coffee', 'Lunch'] }, { kind: 'quote', from: 0, text: 'Never said this' }] })
    expect(await findHighlights(request)).toEqual({ ok: true, picks: [{ kind: 'list', from: 1, to: 2, title: '', items: ['Coffee', 'Lunch'] }] })
    expect(calls).toEqual([{ url: '/api/assist/highlights', body: request }])
  })

  it('서버의 답에 따라 까닭을 나눈다', async () => {
    const cases: [number, unknown, string][] = [
      [503, { error: 'assist_off' }, 'unavailable'],
      [503, { error: 'busy' }, 'busy'],
      [429, { error: 'rate_limited' }, 'limited'],
      [502, { error: 'bad_reply' }, 'failed'],
      [400, { error: 'bad_request' }, 'failed'],
      [200, { nope: true }, 'failed'],
    ]
    for (const [status, body, reason] of cases) {
      reply(status, body)
      expect(await findHighlights(request), `${status} ${JSON.stringify(body)}`).toEqual({ ok: false, reason })
    }
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch')
    })
    expect(await findHighlights(request)).toEqual({ ok: false, reason: 'failed' })
  })
})
