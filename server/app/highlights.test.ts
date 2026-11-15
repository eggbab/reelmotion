import { describe, expect, it } from 'vitest'
import type { HighlightSentence } from '../../src/editor/highlights'
import { ASSIST_LIMIT, createApp } from './app'
import type { AssistModel, ChatMessage } from './assist'
import { openDb } from './db'
import { highlightMessages, parseHighlightRequest } from './highlights'

const ORIGIN = 'https://reelmotion.test'
const SENTENCES: HighlightSentence[] = [
  { text: 'This is the easiest pasta you will ever make.', start: 0, end: 4.1 },
  { text: 'Boil your spaghetti in salted water.', start: 4.5, end: 7.6 },
  { text: 'While that cooks, melt butter with garlic in a pan.', start: 8, end: 11.9 },
  { text: "Toss the pasta in, add parmesan and black pepper, and you're done.", start: 12.3, end: 16 },
]

function setup(answer: string | Error) {
  const seen: ChatMessage[][] = []
  const model: AssistModel = {
    ready: async () => true,
    complete: async (messages) => {
      seen.push(messages)
      if (answer instanceof Error) throw answer
      return answer
    },
  }
  const db = openDb(':memory:')
  const app = createApp({ db, google: null, config: { siteOrigin: ORIGIN, secureCookies: true, devLogin: false }, assist: model })
  const ask = (body: unknown, ip = '203.0.113.5') =>
    app.request('/api/assist/highlights', { method: 'POST', headers: { origin: ORIGIN, 'content-type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify(body) })
  return { db, app, ask, seen }
}

const body = { sentences: SENTENCES, covered: [true, false, false, false], duration: 16 }

describe('AI 로 강조할 순간 찾기 API', () => {
  it('문장을 보내면 검사한 고르기를 돌려준다(덮인 문장·지어낸 인용은 버린다)', async () => {
    const { ask, db } = setup(
      JSON.stringify({
        picks: [
          { kind: 'title', from: 0, text: 'Covered already' },
          { kind: 'list', from: 1, to: 3, title: 'Easy pasta', items: ['Boil spaghetti', 'Melt butter with garlic', 'Toss with parmesan'] },
          { kind: 'quote', from: 2, text: 'Pasta is life' },
        ],
      }),
    )
    const response = await ask(body)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ picks: [{ kind: 'list', from: 1, to: 3, title: 'Easy pasta', items: ['Boil spaghetti', 'Melt butter with garlic', 'Toss with parmesan'] }] })
    // 쓰임 숫자에 하나(누가 했는지는 없이)
    expect(db.prepare("select sum(count) as n from pulse_daily where event = 'ai_highlights'").get()).toEqual({ n: 1 })
  })

  it('AI 에게는 번호 붙은 문장·시간·덮인 표시·고를 수 있는 수를 보낸다(대본의 말로 된 예와 함께)', async () => {
    const { ask, seen } = setup('{"picks":[]}')
    await ask(body)
    const user = seen[0][seen[0].length - 1].content
    expect(user).toContain('0 [0.0–4.1s] [has graphic] This is the easiest pasta you will ever make.')
    expect(user).toContain('1 [4.5–7.6s] Boil your spaghetti in salted water.')
    expect(user).toMatch(/at most 2 moments/)
    // 한국어 대본이면 한국어 예를 보여 준다(작은 모델이 말을 따라 바꾸지 않게)
    const ko = highlightMessages({ sentences: [{ text: '오늘은 아침 여섯 시에 일어났어요.', start: 0, end: 3 }], covered: [false], duration: 12 })
    expect(ko.some((message) => message.role === 'assistant' && message.content.includes('만드는 순서'))).toBe(true)
  })

  it('틀린 요청은 400 — 문장이 없거나 많거나 길거나, 시간이 틀리면', async () => {
    const { ask } = setup('{"picks":[]}')
    for (const bad of [
      {},
      { ...body, sentences: [] },
      { ...body, sentences: Array.from({ length: 201 }, (_, i) => ({ text: 'x', start: i, end: i + 0.5 })), duration: 400 },
      { ...body, sentences: [{ text: 'x'.repeat(301), start: 0, end: 1 }], covered: [false] },
      { ...body, sentences: [{ text: 'ok', start: 2, end: 1 }], covered: [false] },
      { ...body, duration: 0 },
      { ...body, duration: 4000 },
      { ...body, covered: [true] },
    ]) {
      expect((await ask(bad)).status, JSON.stringify(bad).slice(0, 60)).toBe(400)
    }
    expect(parseHighlightRequest({ sentences: SENTENCES, duration: 16 })).toMatchObject({ covered: [false, false, false, false] })
  })

  it('AI 가 엉뚱한 글을 주면 502, 꺼져 있으면 503, 말로 고치기와 같은 횟수 한도(10분에 20번)', async () => {
    expect((await setup('not json').ask(body)).status).toBe(502)
    expect((await setup(new Error('down')).ask(body)).status).toBe(502)
    const off = createApp({ db: openDb(':memory:'), google: null, config: { siteOrigin: ORIGIN, secureCookies: true, devLogin: false } })
    expect((await off.request('/api/assist/highlights', { method: 'POST', headers: { origin: ORIGIN, 'content-type': 'application/json' }, body: JSON.stringify(body) })).status).toBe(503)
    const { ask } = setup('{"picks":[]}')
    let limited = 0
    for (let i = 0; i < ASSIST_LIMIT + 2; i++) if ((await ask(body, '198.51.100.7')).status === 429) limited += 1
    expect(limited).toBe(2)
  })
})
