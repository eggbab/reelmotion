import { afterEach, describe, expect, it, vi } from 'vitest'
import { fromPage, sendContact } from './api'

const DRAFT = { kind: 'bug', body: '멈춰요', email: '', lang: 'ko', page: '/ko/app', website: '' } as const

afterEach(() => vi.unstubAllGlobals())

describe('문의 보내기', () => {
  it('서버의 답을 화면이 알아들을 말로', async () => {
    const answers: [number | null, string][] = [
      [200, 'ok'],
      [429, 'rate_limited'],
      [503, 'unavailable'],
      [404, 'unavailable'],
      [400, 'failed'],
      [500, 'failed'],
      [null, 'failed'],
    ]
    for (const [status, expected] of answers) {
      const fetch = vi.fn(async () => (status === null ? Promise.reject(new TypeError('offline')) : new Response('{}', { status })))
      vi.stubGlobal('fetch', fetch)
      expect(await sendContact({ ...DRAFT }), String(status)).toBe(expected)
    }
  })

  it('보내는 몸체', async () => {
    const fetch = vi.fn(async (_url: string, _init: RequestInit) => new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetch)
    await sendContact({ ...DRAFT })
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('/api/contact')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual(DRAFT)
  })

  it('같은 사이트에서 왔을 때만 쪽 주소를(물음표 뒤 빼고)', () => {
    expect(fromPage('https://reelmotion.test/ko/app?project=1#x', 'https://reelmotion.test')).toBe('/ko/app')
    expect(fromPage('https://elsewhere.example/page', 'https://reelmotion.test')).toBe('')
    expect(fromPage('', 'https://reelmotion.test')).toBe('')
  })
})
