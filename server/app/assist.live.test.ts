import { describe, expect, it } from 'vitest'
import { compactGraphics } from '../../src/editor/assist'
import type { AssistOp, AssistState } from '../../src/editor/assist'
import type { Lang } from '../../src/langs'
import type { Graphic } from '../../src/motion/types'
import { RESPONSE_SCHEMA, buildMessages, createLlamaModel, parseReply } from './assist'

/**
 * 실제 모델로 돌려 보는 시험(느리다). ASSIST_URL 이 있을 때만 돈다:
 *   ASSIST_URL=http://127.0.0.1:8090 npx vitest run server/app/assist.live.test.ts
 */
const url = process.env.ASSIST_URL
const graphics: Graphic[] = [
  { id: 'g1', kind: 'title', start: 0.2, end: 3, text: 'Three habits for better sleep' },
  { id: 'g2', kind: 'lowerThird', start: 0.5, end: 4, name: 'Mina Park', role: 'Sleep researcher' },
  { id: 'g3', kind: 'stat', start: 4, end: 7, value: 37, prefix: '', suffix: '%', decimals: 0, label: 'fall asleep faster' },
  { id: 'g4', kind: 'list', start: 7, end: 10, title: 'Tips', items: ['No screens after ten', 'Same wake time'], itemTimes: [7.4, 8.2] },
  { id: 'g5', kind: 'captions', start: 0, end: 10, words: [] },
]
const state: AssistState = {
  duration: 10,
  theme: 'neon',
  script: 'Three habits for better sleep. Hi, I am Mina Park, a sleep researcher. Most people fall asleep 37% faster. First, no screens after ten. Second, teh same wake time.',
  graphics: compactGraphics(graphics),
}

const cases: { lang: Lang; instruction: string; check: (ops: AssistOp[]) => boolean }[] = [
  { lang: 'ko', instruction: "제목을 '아침 루틴'으로 바꿔 줘", check: (ops) => ops.some((op) => op.op === 'update' && op.id === 'g1' && String(op.fields.text).includes('아침 루틴')) },
  { lang: 'en', instruction: 'Switch to the Tokyo style', check: (ops) => ops.some((op) => op.op === 'theme' && op.theme === 'tokyo') },
  { lang: 'ja', instruction: '名前を田中ゆいにして', check: (ops) => ops.some((op) => op.op === 'update' && op.id === 'g2' && String(op.fields.name).includes('田中')) },
  { lang: 'ko', instruction: '숫자를 50%로 바꿔', check: (ops) => ops.some((op) => op.op === 'update' && op.id === 'g3' && op.fields.value === 50) },
  { lang: 'en', instruction: 'Remove the checklist', check: (ops) => ops.some((op) => op.op === 'remove' && op.id === 'g4') },
  { lang: 'en', instruction: "Add a quote 'Sleep is a skill' from 5 to 8 seconds", check: (ops) => ops.some((op) => op.op === 'add' && op.kind === 'quote' && String(op.fields.text).includes('Sleep is a skill')) },
  { lang: 'ko', instruction: '자막에서 teh 를 the 로 고쳐 줘', check: (ops) => ops.some((op) => op.op === 'replace' && op.find.includes('teh')) },
  { lang: 'ko', instruction: '이름표를 2초 늦게 나오게 해 줘', check: (ops) => ops.some((op) => op.op === 'update' && op.id === 'g2' && Math.abs(Number(op.fields.start) - 2.5) < 0.3) },
]

describe.skipIf(!url)('말로 고치기 — 실제 모델', () => {
  const model = createLlamaModel(url ?? '')
  for (const item of cases) {
    it(`${item.lang}: ${item.instruction}`, { timeout: 240_000 }, async () => {
      const started = Date.now()
      const content = await model.complete(buildMessages(state, item.instruction, item.lang), RESPONSE_SCHEMA)
      const result = parseReply(content, state)
      console.log(`${((Date.now() - started) / 1000).toFixed(1)}s ${item.instruction} → ${content}`)
      expect(result).not.toBeNull()
      expect(item.check(result!.ops)).toBe(true)
    })
  }
})
