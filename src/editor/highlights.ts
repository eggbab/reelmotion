import type { Word } from '../captions/types'
import { splitSentences } from '../motion/direct'
import { fitText, fitTitle, joinJapanese, scriptOf } from '../motion/text'
import type { Graphic, ListGraphic, QuoteGraphic, TitleGraphic } from '../motion/types'

/**
 * 「AI로 강조할 순간 찾기」: 숫자·순서·이름·인용이 없는 이야기(브이로그·요리 설명)는 규칙(direct.ts)으로는 제목과 자막만 나온다.
 * 우리 서버의 AI(server/app/highlights.ts)에게 문장과 시간을 보내 강조할 순간을 고르게 한다.
 * AI 는 **문장 번호**만 고른다 — 시간은 여기서 그 문장의 시간으로 정한다(AI 가 시간을 지어내지 않게).
 * AI 의 답은 믿지 않는다: 꼴·범위·덮인 문장·길이를 확인하고, 인용은 그 문장에 실제로 있는 말만 받는다.
 * 서버(답 검사)와 편집기(그래픽 만들기)가 함께 쓴다 — 브라우저 전용 코드를 넣지 않는다.
 */
export type HighlightSentence = { text: string; start: number; end: number }

export type HighlightPick =
  | { kind: 'title'; at: number; text: string }
  | { kind: 'list'; from: number; to: number; title: string; items: string[] }
  | { kind: 'quote'; at: number; text: string }

export const MAX_PICKS = 6
export const MAX_SENTENCES = 200
export const MAX_SENTENCE_CHARS = 300
/** 이 초마다 하나까지 — 짧은 영상에서 흔한 빠르기. 더 촘촘하면 영상이 그래픽으로 덮인다 */
const SECONDS_PER_PICK = 6
const LIST_MIN = 2
const LIST_MAX = 5

/** AI 의 답 꼴(llama.cpp 가 이 꼴 밖의 글자를 내지 못하게 막는다) */
export const HIGHLIGHT_SCHEMA = {
  type: 'object',
  properties: {
    picks: {
      type: 'array',
      maxItems: MAX_PICKS,
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['title', 'list', 'quote'] },
          from: { type: 'integer' },
          to: { type: 'integer' },
          text: { type: 'string' },
          title: { type: 'string' },
          items: { type: 'array', maxItems: LIST_MAX, items: { type: 'string' } },
        },
        required: ['kind', 'from'],
        additionalProperties: false,
      },
    },
  },
  required: ['picks'],
  additionalProperties: false,
}

export function maxPicks(duration: number): number {
  return Math.max(1, Math.min(MAX_PICKS, Math.floor(duration / SECONDS_PER_PICK)))
}

/** 받아 적은 말(낱말과 시간)을 문장으로(자동 배치와 같은 나누기) */
export function toSentences(words: Word[]): HighlightSentence[] {
  return splitSentences(words).map((sentence) => ({ text: sentence.text, start: sentence.start, end: sentence.end }))
}

const CENTER = new Set<Graphic['kind']>(['title', 'stat', 'bars', 'list', 'quote'])

/** 가운데 그래픽이 문장 시간의 절반 넘게 덮고 있으면 그 문장은 이미 덮인 것(AI 가 고르지 않는다) */
export function coveredSentences(sentences: HighlightSentence[], graphics: Graphic[]): boolean[] {
  const center = graphics.filter((graphic) => CENTER.has(graphic.kind))
  return sentences.map((sentence) => {
    const length = Math.max(0.01, sentence.end - sentence.start)
    return center.some((graphic) => Math.min(graphic.end, sentence.end) - Math.max(graphic.start, sentence.start) > length / 2)
  })
}

/** 띄어 쓰는 말과 붙여 쓰는 말(한국어·일본어)은 같은 자리에 들어가는 글자 수가 다르다 */
const limit = (text: string, latin: number, cjk: number) => (scriptOf(text) === 'en' ? latin : cjk)
/** 비교용: 따옴표·문장 부호·빈칸·대소문자를 가리지 않는다 */
const bare = (text: string) => text.toLowerCase().replace(/[\p{P}\p{S}\s]+/gu, '')
const clean = (text: string) =>
  joinJapanese(
    text
      .trim()
      .replace(/^["“'‘「『]+|["”'’」』]+$/g, '')
      .replace(/[.。!！?？]+$/, '')
      .trim(),
  )
const isIndex = (value: unknown, count: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < count

/** AI 의 답에서 쓸 수 있는 고르기만 남긴다. 쓸 수 없는 것은 말없이 버린다(그래픽이 덜 나올 뿐 틀린 그래픽은 나오지 않는다). */
export function validatePicks(raw: unknown, sentences: HighlightSentence[], covered: boolean[], duration: number): HighlightPick[] {
  const list = typeof raw === 'object' && raw !== null && Array.isArray((raw as { picks?: unknown }).picks) ? ((raw as { picks: unknown[] }).picks) : []
  const taken = new Set<number>()
  const picks: HighlightPick[] = []
  const free = (index: number) => !covered[index] && !taken.has(index)
  for (const item of list) {
    if (picks.length >= maxPicks(duration)) break
    if (typeof item !== 'object' || item === null) continue
    const pick = item as Record<string, unknown>
    if (!isIndex(pick.from, sentences.length) || !free(pick.from)) continue
    const from = pick.from
    if (pick.kind === 'title') {
      const text = typeof pick.text === 'string' ? clean(pick.text) : ''
      if (!text) continue
      picks.push({ kind: 'title', at: from, text: fitTitle(text, limit(text, 40, 20)) })
      taken.add(from)
    } else if (pick.kind === 'quote') {
      const text = typeof pick.text === 'string' ? clean(pick.text) : ''
      // 그 문장에 실제로 있는 말만 인용으로 쓴다 — 말하지 않은 말을 사람의 말처럼 보이면 안 된다
      if (bare(text).length < 4 || !bare(sentences[from].text).includes(bare(text))) continue
      picks.push({ kind: 'quote', at: from, text: fitText(text, limit(text, 120, 64)) })
      taken.add(from)
    } else if (pick.kind === 'list') {
      if (!isIndex(pick.to, sentences.length)) continue
      const to = pick.to
      const span = to - from + 1
      if (span < LIST_MIN || span > LIST_MAX) continue
      const range = Array.from({ length: span }, (_, k) => from + k)
      if (!range.every(free)) continue
      const items = (Array.isArray(pick.items) ? pick.items : []).filter((value): value is string => typeof value === 'string').map(clean).filter(Boolean)
      if (items.length < LIST_MIN || items.length > LIST_MAX) continue
      const title = typeof pick.title === 'string' ? clean(pick.title) : ''
      picks.push({ kind: 'list', from, to, title: title ? fitTitle(title, limit(title, 30, 16)) : '', items: items.map((text) => fitText(text, limit(text, 56, 28))) })
      for (const index of range) taken.add(index)
    }
  }
  return picks
}

/** 고른 순간을 그래픽으로: 그 문장을 말하는 때에 놓는다(자동 배치와 같은 길이 규칙) */
export function picksToGraphics(picks: HighlightPick[], sentences: HighlightSentence[], duration: number, makeId: (n: number) => string): Graphic[] {
  const end = (value: number) => Math.min(duration, value)
  return picks.map((pick, index): Graphic => {
    const id = makeId(index + 1)
    if (pick.kind === 'title') {
      const sentence = sentences[pick.at]
      const graphic: TitleGraphic = { id, kind: 'title', start: sentence.start, end: end(Math.max(sentence.start + 2.4, Math.min(sentence.end + 0.6, sentence.start + 4.5))), text: pick.text }
      return graphic
    }
    if (pick.kind === 'quote') {
      const sentence = sentences[pick.at]
      const graphic: QuoteGraphic = { id, kind: 'quote', start: sentence.start, end: end(Math.max(sentence.end + 0.8, sentence.start + 3.2)), text: pick.text, author: '' }
      return graphic
    }
    const first = sentences[pick.from]
    const last = sentences[pick.to]
    const span = pick.to - pick.from + 1
    // 항목이 문장마다 하나면 그 문장을 말할 때, 아니면 그 사이에 고르게 나타난다
    const itemTimes =
      pick.items.length === span
        ? pick.items.map((_, k) => sentences[pick.from + k].start)
        : pick.items.map((_, k) => first.start + ((last.start - first.start) * k) / Math.max(1, pick.items.length - 1))
    const graphic: ListGraphic = { id, kind: 'list', start: Math.max(0, first.start - 0.5), end: end(last.end + 1.6), title: pick.title, items: pick.items, itemTimes }
    return graphic
  })
}
