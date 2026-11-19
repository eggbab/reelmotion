// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { transcribeAudioOnServer } from './server'
import type { ServerProgress } from './server'

afterEach(() => vi.unstubAllGlobals())

describe('받아쓰기 서버로 보내기', () => {
  it('한계보다 긴 소리는 조각마다 보내고, 낱말 시간을 조각이 시작하는 때만큼 밀어 이어 붙인다', async () => {
    const calls: number[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: { body: Blob }) => {
        calls.push((init.body.size - 44) / 2 / 16000)
        return new Response(JSON.stringify({ text: 'hello world', tokens: [{ text: 'hello', start: 0.1, end: 0.4 }, { text: 'world', start: 0.5, end: 0.9 }] }), { status: 200 })
      }),
    )
    // 150초짜리(조용한 틈 없음), 서버 한계 60초
    const audio = new Float32Array(150 * 16000).map((_, i) => 0.3 * Math.sin(i / 7))
    const progress: ServerProgress[] = []
    const words = await transcribeAudioOnServer(audio, { language: 'en', onProgress: (p) => progress.push(p), maxSeconds: 60 })
    expect(calls.length).toBeGreaterThanOrEqual(3)
    for (const seconds of calls) expect(seconds).toBeLessThanOrEqual(60)
    expect(calls.reduce((a, b) => a + b, 0)).toBeCloseTo(150, 3)
    expect(words).toHaveLength(calls.length * 2)
    // 둘째 조각의 첫 낱말은 첫 조각 길이만큼 뒤에
    expect(words[2].start).toBeCloseTo(calls[0] + 0.1, 3)
    // 시간이 앞으로만 간다
    for (let i = 1; i < words.length; i++) expect(words[i].start).toBeGreaterThan(words[i - 1].start)
    expect(progress.filter((p) => p.stage === 'uploading').map((p) => (p.stage === 'uploading' ? p.part : null))).toEqual(calls.map((_, i) => ({ index: i + 1, count: calls.length })))
  })

  it('짧은 소리는 한 번에 보내고 조각 표시가 없다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ text: 'hi', tokens: [{ text: 'hi', start: 0, end: 0.2 }] }), { status: 200 })))
    const progress: ServerProgress[] = []
    const words = await transcribeAudioOnServer(new Float32Array(16000), { language: null, onProgress: (p) => progress.push(p), maxSeconds: 600 })
    expect(words.map((word) => word.text)).toEqual(['hi'])
    expect(progress).toEqual([{ stage: 'uploading', part: undefined }])
  })
})
