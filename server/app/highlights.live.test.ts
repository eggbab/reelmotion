import { describe, expect, it } from 'vitest'
import { scriptToWords } from '../../src/captions/segment'
import { coveredSentences, toSentences } from '../../src/editor/highlights'
import { direct } from '../../src/motion/direct'
import { ORDINARY_SCRIPTS } from '../../src/motion/ordinary-scripts'
import { scriptOf } from '../../src/motion/text'
import { HIGHLIGHT_SCHEMA } from '../../src/editor/highlights'
import { createLlamaModel } from './assist'
import { highlightMessages, parseHighlights } from './highlights'

/**
 * 실제 모델로 「AI로 강조할 순간 찾기」를 평범한 대본에 돌려 본다(느리다). ASSIST_URL 이 있을 때만:
 *   ASSIST_URL=http://<assist 주소>:8080 npx vitest run server/app/highlights.live.test.ts
 * 규칙(direct.ts)이 제목·자막만 낸 대본 넷과, 규칙이 이미 그래픽을 낸 대본 둘(겹치지 않는지).
 */
const url = process.env.ASSIST_URL
const NAMES = ['en-vlog', 'en-cooking', 'ko-vlog', 'ja-cooking', 'ko-tips', 'en-motivation']

describe.skipIf(!url)('AI 로 강조할 순간 찾기 — 실제 모델', () => {
  const model = createLlamaModel(url ?? '')
  for (const name of NAMES) {
    it(name, { timeout: 300_000 }, async () => {
      const script = ORDINARY_SCRIPTS[name].replace(/([.!?])\s+/g, '$1\n').replace(/。\s*/g, '。\n').trim()
      const duration = 20
      const words = scriptToWords(script, duration)
      const sentences = toSentences(words)
      const covered = coveredSentences(sentences, direct(words))
      const request = { sentences, covered, duration }
      const started = Date.now()
      const content = await model.complete(highlightMessages(request), HIGHLIGHT_SCHEMA)
      const picks = parseHighlights(content, request)
      const raw = (JSON.parse(content) as { picks: unknown[] }).picks.length
      console.log(`${name} ${((Date.now() - started) / 1000).toFixed(1)}s  answered ${raw} · kept ${picks?.length}\n  ${JSON.stringify(picks)}`)
      expect(picks).not.toBeNull()
      // 글은 대본과 같은 말로
      for (const pick of picks ?? []) {
        const texts = pick.kind === 'list' ? [pick.title, ...pick.items].filter(Boolean) : [pick.text]
        for (const text of texts) expect(scriptOf(text), `${name}: ${text}`).toBe(scriptOf(script))
      }
      // 규칙이 비어 있던 대본은 적어도 하나를 더한다
      if (covered.every((value, i) => !value || i === 0) && ['en-vlog', 'en-cooking', 'ko-vlog', 'ja-cooking'].includes(name)) expect(picks?.length ?? 0).toBeGreaterThanOrEqual(1)
    })
  }
})
