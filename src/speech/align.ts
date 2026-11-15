import { segmentText } from '../captions/segment'
import type { Word } from '../captions/types'
import { estimatedSeconds } from './words'

/** 받아쓰기 서버(Qwen3-ForcedAligner)가 돌려주는 조각. 글자·숫자·작은따옴표만 남긴 낱말이나 형태소다. */
export type AsrToken = { text: string; start: number; end: number }

const KEPT = /[\p{L}\p{N}']/u

/**
 * 받아 적은 글(text)을 화면에 보일 낱말로 나누고(영어·한국어는 띄어쓰기, 일본어는 낱말 나누기),
 * 정렬 조각의 시간을 글자 위치로 맞춰 입힌다. 한국어처럼 조각이 어절보다 잘면 합치고,
 * 숫자 「1,400」처럼 조각에서 쉼표가 빠진 것도 글자 위치로 찾는다.
 */
export function alignTokensToWords(text: string, tokens: AsrToken[]): Word[] {
  // 1. 원문에서 정렬기가 남기는 글자만 뽑고, 원래 위치를 기억한다.
  const chars: string[] = []
  const at: number[] = []
  let index = 0
  for (const ch of text) {
    if (KEPT.test(ch)) {
      chars.push(ch.toLowerCase())
      at.push(index)
    }
    index += ch.length
  }

  // 2. 조각을 앞에서부터 차례로 원문 위치에 놓는다.
  const spans: { start: number; end: number; t0: number; t1: number }[] = []
  let cursor = 0
  for (const token of tokens) {
    const target = [...token.text.toLowerCase()].filter((ch) => KEPT.test(ch))
    if (target.length === 0) continue
    let found = -1
    for (let k = cursor; k + target.length <= chars.length; k++) {
      let same = true
      for (let j = 0; j < target.length; j++) {
        if (chars[k + j] !== target[j]) {
          same = false
          break
        }
      }
      if (same) {
        found = k
        break
      }
    }
    if (found < 0) continue
    const last = found + target.length - 1
    spans.push({ start: at[found], end: at[last] + chars[last].length, t0: token.start, t1: token.end })
    cursor = found + target.length
  }

  // 3. 화면 낱말마다 겹치는 조각들의 시간을 모은다.
  const segments = segmentText(text)
  const timed = segments.map((segment) => {
    const covering = spans.filter((span) => span.start < segment.end && span.end > segment.start)
    return {
      segment,
      start: covering.length ? Math.min(...covering.map((span) => span.t0)) : null,
      end: covering.length ? Math.max(...covering.map((span) => span.t1)) : null,
    }
  })

  // 4. 시간을 못 받은 낱말은 앞뒤 사이에 놓고, 시간이 늘 앞에서 뒤로 흐르게 고친다.
  const words: Word[] = []
  let previousEnd = 0
  timed.forEach((item, i) => {
    let start = item.start ?? previousEnd
    const nextStart = timed.slice(i + 1).find((next) => next.start !== null)?.start ?? null
    let end = item.end ?? (nextStart !== null ? Math.min(nextStart, start + estimatedSeconds(item.segment.text)) : start + estimatedSeconds(item.segment.text))
    start = Math.max(start, previousEnd)
    if (end <= start) end = start + 0.05
    const word: Word = { text: item.segment.text, start, end }
    if (item.segment.lineEnd) word.lineEnd = true
    if (item.segment.joinNext) word.joinNext = true
    words.push(word)
    previousEnd = end
  })
  return words
}
