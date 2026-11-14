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

/** 대본을 어절로 나눈다. 줄의 마지막 어절에는 lineEnd 를 남긴다. */
export function scriptTokens(script: string): { text: string; lineEnd: boolean }[] {
  const tokens: { text: string; lineEnd: boolean }[] = []
  for (const line of script.split(/\n+/)) {
    const parts = line.trim().split(/\s+/).filter(Boolean)
    parts.forEach((text, i) => tokens.push({ text, lineEnd: i === parts.length - 1 }))
  }
  return tokens
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
    return t.lineEnd ? { text: t.text, start, end, lineEnd: true } : { text: t.text, start, end }
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
      const overflows = chars + 1 + word.text.length > options.maxChars
      const longGap = word.start - prev.end > MAX_GAP_SECONDS
      if (overflows || longGap || prev.lineEnd || SENTENCE_END.test(prev.text)) flush()
    }
    chars += (current.length > 0 ? 1 : 0) + word.text.length
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
