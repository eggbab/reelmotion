import { scriptTokens, spokenLength } from '../captions/segment'
import type { Word } from '../captions/types'
import { estimatedSeconds } from './words'

const MIN_SECONDS = 0.12

const normalize = (text: string) => text.replace(/[\p{P}\p{S}]/gu, '').toLowerCase() || text

/** 두 목록에서 순서를 지키며 서로 같은 항목의 짝(가장 긴 공통 부분열). */
function matchPairs(a: string[], b: string[]): [number, number][] {
  let head = 0
  while (head < a.length && head < b.length && a[head] === b[head]) head++
  let tail = 0
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++

  const n = a.length - head - tail
  const m = b.length - head - tail
  const width = m + 1
  const table = new Uint32Array((n + 1) * width)
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i * width + j] =
        a[head + i] === b[head + j]
          ? table[(i + 1) * width + j + 1] + 1
          : Math.max(table[(i + 1) * width + j], table[i * width + j + 1])
    }
  }

  const pairs: [number, number][] = []
  for (let k = 0; k < head; k++) pairs.push([k, k])
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[head + i] === b[head + j]) {
      pairs.push([head + i, head + j])
      i++
      j++
    } else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) i++
    else j++
  }
  for (let k = tail; k > 0; k--) pairs.push([a.length - k, b.length - k])
  return pairs
}

/**
 * 말소리 인식으로 얻은 어절 시간(base)을, 사용자가 고친 글(text)에 다시 입힌다.
 * 그대로인 어절은 시간을 지키고, 고친 어절은 원래 자리의 시간을, 새로 넣은 어절은 앞뒤 사이의 시간을 받는다.
 */
export function retime(base: Word[], text: string): Word[] {
  const tokens = scriptTokens(text)
  const pairs = matchPairs(
    base.map((word) => normalize(word.text)),
    tokens.map((token) => normalize(token.text)),
  )
  const out: Word[] = []
  const push = (token: { text: string; lineEnd: boolean }, start: number, end: number) => {
    out.push(token.lineEnd ? { text: token.text, start, end, lineEnd: true } : { text: token.text, start, end })
  }

  let prevBase = -1
  let prevToken = -1
  const fillBefore = (nextBase: number, nextToken: number) => {
    const group = tokens.slice(prevToken + 1, nextToken)
    if (group.length === 0) return
    const replaced = base.slice(prevBase + 1, nextBase)
    const prev = out[out.length - 1]
    const next = base[nextBase]
    let start: number
    let end: number
    if (replaced.length > 0) {
      start = replaced[0].start
      end = replaced[replaced.length - 1].end
    } else {
      start = prev ? prev.end : 0
      const natural = group.reduce((sum, token) => sum + estimatedSeconds(token.text), 0)
      end = next ? Math.min(next.start, start + natural) : start + natural
    }
    const need = MIN_SECONDS * group.length
    if (end - start < need && prev) {
      // 빈 시간이 모자라면 앞 어절의 뒷부분(최대 절반)을 나눠 받는다.
      const borrowed = Math.min((prev.end - prev.start) / 2, need - (end - start))
      prev.end -= borrowed
      start = prev.end
    }
    if (end - start < need) end = start + need

    const total = group.reduce((sum, token) => sum + spokenLength(token.text), 0)
    let cursor = start
    for (const token of group) {
      const span = ((end - start) * spokenLength(token.text)) / total
      push(token, cursor, cursor + span)
      cursor += span
    }
  }

  for (const [baseIndex, tokenIndex] of pairs) {
    fillBefore(baseIndex, tokenIndex)
    push(tokens[tokenIndex], base[baseIndex].start, base[baseIndex].end)
    prevBase = baseIndex
    prevToken = tokenIndex
  }
  fillBefore(base.length, tokens.length)

  // 드문 경우(맨 앞에 끼워 넣기 등)에 겹친 시간을 앞에서 뒤로 흐르게 고친다.
  let cursor = 0
  for (const word of out) {
    if (word.start < cursor) word.start = cursor
    if (word.end < word.start + 0.01) word.end = word.start + 0.01
    cursor = word.end
  }
  return out
}
