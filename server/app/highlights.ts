import { MAX_SENTENCES, MAX_SENTENCE_CHARS, maxPicks, validatePicks } from '../../src/editor/highlights'
import type { HighlightPick, HighlightSentence } from '../../src/editor/highlights'
import { scriptOf } from '../../src/motion/text'
import type { Script } from '../../src/motion/text'
import type { ChatMessage } from './assist'

/**
 * 「AI로 강조할 순간 찾기」의 AI 쪽(말로 고치기와 같은 우리 서버의 오픈 모델 — assist.ts).
 * 번호 붙은 문장과 시간을 보내고, AI 는 문장 번호와 글만 고른다. 답은 src/editor/highlights.ts 의 validatePicks 로 검사한다.
 * 보낸 글은 저장하지 않고 학습에 쓰지 않는다(개인정보처리방침의 「말로 고치기·AI 그래픽 찾기에 보낸 글」).
 */
export const MAX_DURATION = 30 * 60

export type HighlightRequest = { sentences: HighlightSentence[]; covered: boolean[]; duration: number }

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

/** 편집기가 보낸 요청을 검사한다. 틀리면 null(400) */
export function parseHighlightRequest(body: unknown): HighlightRequest | null {
  if (typeof body !== 'object' || body === null) return null
  const raw = body as { sentences?: unknown; covered?: unknown; duration?: unknown }
  if (!finite(raw.duration) || raw.duration <= 0 || raw.duration > MAX_DURATION) return null
  const duration = raw.duration
  if (!Array.isArray(raw.sentences) || raw.sentences.length === 0 || raw.sentences.length > MAX_SENTENCES) return null
  const sentences: HighlightSentence[] = []
  for (const item of raw.sentences) {
    if (typeof item !== 'object' || item === null) return null
    const { text, start, end } = item as { text?: unknown; start?: unknown; end?: unknown }
    if (typeof text !== 'string' || text.trim() === '' || text.length > MAX_SENTENCE_CHARS) return null
    if (!finite(start) || !finite(end) || start < 0 || end < start || end > duration + 1) return null
    sentences.push({ text: text.trim(), start, end })
  }
  let covered = sentences.map(() => false)
  if (raw.covered !== undefined) {
    if (!Array.isArray(raw.covered) || raw.covered.length !== sentences.length || !raw.covered.every((value) => typeof value === 'boolean')) return null
    covered = raw.covered as boolean[]
  }
  return { sentences, covered, duration }
}

const SYSTEM = `You choose moments in a talking video where a motion graphic would help the viewer. You get the sentences of the video, numbered, with their times. Answer with JSON only: {"picks": [...]}

Kinds:
- {"kind":"title","from":N,"text":"..."} a short headline where a new topic starts at sentence N. Sum up what comes next in 2 to 6 words (at most 15 characters in Korean or Japanese). Do not copy the whole sentence.
- {"kind":"list","from":N,"to":M,"title":"...","items":["...","..."]} when sentences N to M (2 to 5 sentences in a row) go through steps or several points. One short item per sentence in the speaker's words, without words like "first" or "then". The title says what the steps are for.
- {"kind":"quote","from":N,"text":"..."} the single most memorable line, copied exactly from sentence N. At most one quote.

Rules:
- Pick at most the number of moments you are told. Fewer good picks are better than weak ones; answer {"picks": []} if nothing stands out.
- Never pick a sentence marked [has graphic], and use each sentence only once.
- Write every text in the language of the sentences.
- Keep list items under 6 words (under 12 characters in Korean or Japanese).`

/** 한 번 보여 주는 예 — 대본과 같은 말로(작은 모델이 예의 말을 따라 쓰지 않게) */
const EXAMPLES: Record<Script, { sentences: string[]; picks: object[] }> = {
  en: {
    sentences: ['Let me show you my quick breakfast.', 'Crack two eggs into a bowl.', 'Whisk them with a pinch of salt.', 'Pour them into a hot pan and stir.', "That's honestly all it takes."],
    picks: [
      { kind: 'title', from: 0, text: 'Quick breakfast' },
      { kind: 'list', from: 1, to: 3, title: 'How to make it', items: ['Crack two eggs', 'Whisk with salt', 'Stir in a hot pan'] },
      { kind: 'quote', from: 4, text: "That's honestly all it takes" },
    ],
  },
  ko: {
    sentences: ['제 아침 메뉴를 알려 드릴게요.', '계란 두 개를 그릇에 깨 주세요.', '소금을 조금 넣고 저어 주세요.', '달군 팬에 붓고 저으면서 익혀요.', '정말 이게 다예요.'],
    picks: [
      { kind: 'title', from: 0, text: '간단 아침 메뉴' },
      { kind: 'list', from: 1, to: 3, title: '만드는 순서', items: ['계란 두 개 깨기', '소금 넣고 젓기', '달군 팬에 익히기'] },
      { kind: 'quote', from: 4, text: '정말 이게 다예요' },
    ],
  },
  ja: {
    sentences: ['簡単な朝ごはんを紹介します。', '卵を二個ボウルに割ります。', '塩を少し入れて混ぜます。', '熱したフライパンで混ぜながら焼きます。', '本当にこれだけです。'],
    picks: [
      { kind: 'title', from: 0, text: '簡単朝ごはん' },
      { kind: 'list', from: 1, to: 3, title: '作り方', items: ['卵を二個割る', '塩を入れて混ぜる', 'フライパンで焼く'] },
      { kind: 'quote', from: 4, text: '本当にこれだけです' },
    ],
  },
}

const time = (value: number) => value.toFixed(1)

function describe(request: HighlightRequest): string {
  const lines = request.sentences.map((sentence, i) => `${i} [${time(sentence.start)}–${time(sentence.end)}s]${request.covered[i] ? ' [has graphic]' : ''} ${sentence.text}`)
  return `Video length: ${time(request.duration)} seconds. Pick at most ${maxPicks(request.duration)} moments.\n\nSentences:\n${lines.join('\n')}`
}

export function highlightMessages(request: HighlightRequest): ChatMessage[] {
  const script = scriptOf(request.sentences.map((sentence) => sentence.text).join(' '))
  const example = EXAMPLES[script]
  const exampleRequest: HighlightRequest = {
    sentences: example.sentences.map((text, i) => ({ text, start: i * 3, end: i * 3 + 2.6 })),
    covered: example.sentences.map(() => false),
    duration: 18,
  }
  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: describe(exampleRequest) },
    { role: 'assistant', content: JSON.stringify({ picks: example.picks }) },
    { role: 'user', content: describe(request) },
  ]
}

/** AI 의 답(JSON 글)을 검사한 고르기로. JSON 이 아니면 null */
export function parseHighlights(content: string, request: HighlightRequest): HighlightPick[] | null {
  let raw: unknown
  try {
    raw = JSON.parse(content)
  } catch {
    return null
  }
  if (typeof raw !== 'object' || raw === null || !Array.isArray((raw as { picks?: unknown }).picks)) return null
  return validatePicks(raw, request.sentences, request.covered, request.duration)
}
