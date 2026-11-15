import type { Cue, Word } from './types'

/** 줄바꿈·문장 끝에서 쉬는 시간의 크기(글자 수로 환산). */
const PAUSE_WEIGHT = 2
/** 말이 이만큼(초) 끊기면 자막을 새로 시작한다. */
const MAX_GAP_SECONDS = 0.6
/** 말이 끝난 뒤 자막을 남겨 두는 시간(초). */
const HOLD_SECONDS = 0.4

const SENTENCE_END = /[.!?…。！？]$/

/** 문장 부호를 뺀 글자 수(최소 1). 말하는 데 걸리는 시간을 어림할 때 쓴다. */
export function spokenLength(text: string): number {
  return Math.max(1, text.replace(/[\p{P}\p{S}]/gu, '').length)
}

/** 원문에서 잘라 낸 낱말 하나와 그 글자 위치(원문 기준 [start, end)) */
export type Segment = { text: string; start: number; end: number; lineEnd: boolean; joinNext: boolean }

const KANA = /[\p{Script=Hiragana}\p{Script=Katakana}]/u
const SMALL_HIRAGANA = /^[\p{Script=Hiragana}ー]{1,2}$/u
const JA_SENTENCE_END = /[。！？!?]$/

let segmenter: Intl.Segmenter | null = null

/**
 * 일본어처럼 띄어쓰기가 없는 덩어리를 낱말로 나눈다(브라우저에 든 Intl.Segmenter).
 * 너무 잘게 나뉘지 않도록 두 글자 이하 히라가나(조사·어미)와 문장 부호는 앞 낱말에 붙인다: 今日は|いい → 今日はいい.
 */
function splitJapanese(piece: string, offset: number): { text: string; start: number; end: number }[] {
  segmenter ??= new Intl.Segmenter('ja', { granularity: 'word' })
  const out: { text: string; start: number; end: number }[] = []
  for (const part of segmenter.segment(piece)) {
    const start = offset + part.index
    const end = start + part.segment.length
    const prev = out[out.length - 1]
    const glue = prev && !JA_SENTENCE_END.test(prev.text) && (!part.isWordLike || SMALL_HIRAGANA.test(part.segment))
    if (glue || (prev && !part.isWordLike)) {
      prev.text += part.segment
      prev.end = end
    } else if (part.segment.trim()) {
      out.push({ text: part.segment, start, end })
    }
  }
  return out
}

/** 대본을 낱말로 나누고 원문 위치를 함께 돌려준다. 줄의 마지막 낱말에는 lineEnd 를 남긴다. */
export function segmentText(script: string): Segment[] {
  const out: Segment[] = []
  const lines = script.split('\n')
  let offset = 0
  for (const line of lines) {
    const before = out.length
    for (const match of line.matchAll(/\S+/g)) {
      const pieceStart = offset + (match.index ?? 0)
      if (KANA.test(match[0])) {
        const parts = splitJapanese(match[0], pieceStart)
        parts.forEach((part, i) => out.push({ ...part, lineEnd: false, joinNext: i < parts.length - 1 }))
      } else {
        out.push({ text: match[0], start: pieceStart, end: pieceStart + match[0].length, lineEnd: false, joinNext: false })
      }
    }
    if (out.length > before) out[out.length - 1].lineEnd = true
    offset += line.length + 1
  }
  return out
}

/** 대본을 낱말로 나눈다. */
export function scriptTokens(script: string): { text: string; lineEnd: boolean; joinNext: boolean }[] {
  return segmentText(script).map(({ text, lineEnd, joinNext }) => ({ text, lineEnd, joinNext }))
}

/** 낱말들을 다시 글로 잇는다(붙여 쓰는 낱말 사이에는 빈칸을 넣지 않는다). */
export function joinWords(words: { text: string; joinNext?: boolean }[]): string {
  return words.map((word, i) => word.text + (i < words.length - 1 && !word.joinNext ? ' ' : '')).join('')
}

/**
 * 대본을 어절로 나눠 영상 길이에 글자 수 비율로 놓는다.
 * 실제 말소리를 듣고 맞춘 시간이 아니라 어림값이다 — 말소리 인식을 하기 전까지만 쓴다.
 */
export function scriptToWords(script: string, duration: number): Word[] {
  if (!(duration > 0)) return []
  const tokens = scriptTokens(script).map((token) => ({
    ...token,
    weight: spokenLength(token.text),
    pause: token.lineEnd || SENTENCE_END.test(token.text) ? PAUSE_WEIGHT : 0,
  }))
  if (tokens.length === 0) return []
  tokens[tokens.length - 1].pause = 0

  const total = tokens.reduce((sum, t) => sum + t.weight + t.pause, 0)
  const unit = duration / total
  let cursor = 0
  return tokens.map((t) => {
    const start = cursor
    const end = start + t.weight * unit
    cursor = end + t.pause * unit
    const word: Word = { text: t.text, start, end }
    if (t.lineEnd) word.lineEnd = true
    if (t.joinNext) word.joinNext = true
    return word
  })
}

export function wordsToCues(words: Word[], options: { maxChars: number }): Cue[] {
  const cues: Cue[] = []
  let current: Word[] = []
  let chars = 0
  const flush = () => {
    if (current.length === 0) return
    cues.push({ words: current, start: current[0].start, end: current[current.length - 1].end })
    current = []
    chars = 0
  }
  for (const word of words) {
    const prev = current[current.length - 1]
    if (prev) {
      const gap = prev.joinNext ? 0 : 1
      const overflows = chars + gap + word.text.length > options.maxChars
      const longGap = word.start - prev.end > MAX_GAP_SECONDS
      if (overflows || longGap || prev.lineEnd || SENTENCE_END.test(prev.text)) flush()
    }
    chars += (current.length > 0 && !current[current.length - 1].joinNext ? 1 : 0) + word.text.length
    current.push(word)
  }
  flush()
  return cues
}

/** 시각 t 에 화면에 떠 있어야 할 자막. 없으면 null. */
export function cueAt(cues: Cue[], t: number): Cue | null {
  let found: Cue | null = null
  for (const cue of cues) {
    if (cue.start > t) break
    found = cue
  }
  if (!found || t >= found.end + HOLD_SECONDS) return null
  return found
}

/** 자막 안에서 시각 t 에 말하고 있는(또는 마지막으로 말한) 어절의 순번. */
export function activeWordIndex(cue: Cue, t: number): number {
  let index = 0
  cue.words.forEach((word, i) => {
    if (word.start <= t) index = i
  })
  return index
}
