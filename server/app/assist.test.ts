import { describe, expect, it } from 'vitest'
import type { AssistState } from '../../src/editor/assist'
import { createApp } from './app'
import { buildMessages, createRateLimiter, parseReply } from './assist'
import type { AssistModel } from './assist'
import { openDb } from './db'

const ORIGIN = 'https://reelmotion.test'
const state: AssistState = {
  duration: 10,
  theme: 'neon',
  script: 'Three habits for better sleep.',
  graphics: [{ id: 'g1', kind: 'title', start: 0, end: 3, text: 'Three habits' }],
}

function setup(answer: string | Error, ready = true) {
  let calls = 0
  const model: AssistModel = {
    ready: async () => ready,
    complete: async () => {
      calls += 1
      if (answer instanceof Error) throw answer
      return answer
    },
  }
  const app = createApp({ db: openDb(':memory:'), google: null, config: { siteOrigin: ORIGIN, secureCookies: true, devLogin: false }, assist: model })
  const edit = (body: unknown, ip = '203.0.113.5') =>
    app.request('/api/assist/edit', { method: 'POST', headers: { origin: ORIGIN, 'x-forwarded-for': `${ip}, 10.0.0.2` }, body: JSON.stringify(body) })
  return { app, edit, calls: () => calls }
}

describe('말로 고치기 API', () => {
  it('지시와 작업 요약을 보내면 검사한 고치기를 돌려준다', async () => {
    const { edit } = setup(JSON.stringify({ reply: '제목을 바꿨어요.', ops: [{ op: 'update', id: 'g1', fields: { text: '아침 루틴' } }, { op: 'remove', id: 'ghost' }] }))
    const response = await edit({ instruction: '제목을 아침 루틴으로', lang: 'ko', state })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ reply: '제목을 바꿨어요.', ops: [{ op: 'update', id: 'g1', fields: { text: '아침 루틴' } }], dropped: 1 })
  })

  it('지시가 비었거나 너무 길거나 요약이 틀리면 400', async () => {
    const { edit } = setup('{}')
    expect((await edit({ instruction: '', state })).status).toBe(400)
    expect((await edit({ instruction: 'x'.repeat(501), state })).status).toBe(400)
    expect((await edit({ instruction: 'hi', state: { ...state, theme: 'retro' } })).status).toBe(400)
  })

  it('모델이 엉뚱한 답을 하거나 실패하면 502, AI 가 없으면 503', async () => {
    expect((await setup('not json').edit({ instruction: 'hi', state })).status).toBe(502)
    expect((await setup(new Error('down')).edit({ instruction: 'hi', state })).status).toBe(502)
    const off = createApp({ db: openDb(':memory:'), google: null, config: { siteOrigin: ORIGIN, secureCookies: true, devLogin: false } })
    expect((await off.request('/api/assist/edit', { method: 'POST', headers: { origin: ORIGIN }, body: JSON.stringify({ instruction: 'hi', state }) })).status).toBe(503)
    expect(await (await off.request('/api/assist/health')).json()).toEqual({ ready: false })
  })

  it('같은 IP 는 10분에 20번까지(다른 IP 는 따로)', async () => {
    const { edit, calls } = setup(JSON.stringify({ reply: 'ok', ops: [] }))
    for (let i = 0; i < 20; i++) expect((await edit({ instruction: `try ${i}`, state })).status).toBe(200)
    expect((await edit({ instruction: 'one more', state })).status).toBe(429)
    expect((await edit({ instruction: 'other person', state }, '198.51.100.7')).status).toBe(200)
    expect(calls()).toBe(21)
  })

  it('다른 사이트에서 온 요청은 거절', async () => {
    const { app } = setup('{}')
    expect((await app.request('/api/assist/edit', { method: 'POST', headers: { origin: 'https://evil.example' }, body: JSON.stringify({ instruction: 'hi', state }) })).status).toBe(403)
  })
})

describe('프롬프트·답 읽기·횟수 세기', () => {
  it('언어마다 답을 그 언어로 쓰라고 하고, 예 하나를 보여 준 뒤 실제 작업을 보낸다', () => {
    const messages = buildMessages(state, '제목을 바꿔 줘', 'ko')
    expect(messages.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user'])
    expect(messages[0].content).toContain('in Korean')
    expect(messages[2].content).toContain('서울 스타일')
    expect(messages[3].content).toContain('"Three habits"')
    expect(messages[3].content).toContain('Instruction: 제목을 바꿔 줘')
  })

  it('JSON 이 아니면 null', () => {
    expect(parseReply('oops', state)).toBeNull()
  })

  it('시간 창이 지나면 다시 셀 수 있다', () => {
    let now = 0
    const limiter = createRateLimiter(2, 1000, () => now)
    expect([limiter.hit('a'), limiter.hit('a'), limiter.hit('a')]).toEqual([true, true, false])
    now = 1001
    expect(limiter.hit('a')).toBe(true)
  })
})
