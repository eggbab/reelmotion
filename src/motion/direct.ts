import type { Word } from '../captions/types'
import { findNumbers } from './numbers'
import { clampText } from './paint'
import type { Graphic } from './types'

export type Sentence = { words: Word[]; text: string; start: number; end: number }

const SENTENCE_END = /[.!?。！？]$/
const GAP_SECONDS = 0.7

export function splitSentences(words: Word[]): Sentence[] {
  const sentences: Sentence[] = []
  let current: Word[] = []
  const flush = () => {
    if (current.length === 0) return
    sentences.push({
      words: current,
      text: current.map((word) => word.text).join(' '),
      start: current[0].start,
      end: current[current.length - 1].end,
    })
    current = []
  }
  words.forEach((word, i) => {
    current.push(word)
    const next = words[i + 1]
    if (SENTENCE_END.test(word.text) || word.lineEnd || (next && next.start - word.end > GAP_SECONDS)) flush()
  })
  flush()
  return sentences
}

const NAME_PATTERNS: RegExp[] = [
  /\b(?:[Ii]['’]m|[Ii] am|[Mm]y name is|[Tt]his is)\s+(\p{Lu}[\p{L}'-]+(?:\s+\p{Lu}[\p{L}'-]+)?)/u,
  /(?:저는|제 이름은)\s*([가-힣]{2,5}?)(?:입니다|이에요|예요|이고|라고)/u,
  /(?:私は|僕は|わたしは|名前は)\s*([^\s、。]{1,8}?)(?:です|と申します)/u,
]
const ROLE_PATTERN = /,?\s*(?:i'm|i am)?\s*(?:a|an)\s+([\p{L}\s-]{2,40}?)(?:[.,!?]|$)/iu

function findIntro(text: string): { name: string; role: string } | null {
  for (const pattern of NAME_PATTERNS) {
    const match = text.match(pattern)
    if (!match) continue
    const name = match[1].trim()
    const rest = text.slice((match.index ?? 0) + match[0].length)
    const role = rest.match(ROLE_PATTERN)?.[1]?.trim() ?? ''
    return { name, role }
  }
  return null
}

const LIST_MARKERS: RegExp[] = [
  /^(?:first(?:ly)?|second(?:ly)?|third(?:ly)?|fourth|fifth|next|then|finally|lastly|number (?:one|two|three|four|five))\s*[,:]?\s*/i,
  /^\d+[.)]\s*/,
  /^(?:첫째|둘째|셋째|넷째|다섯째|첫 번째|두 번째|세 번째|네 번째|마지막으로|다음으로)\s*[,:]?\s*/,
  /^(?:まず|次に|最後に|一つ目|二つ目|三つ目|四つ目)\s*[、,:]?\s*/,
]

function stripMarker(text: string): string | null {
  for (const marker of LIST_MARKERS) {
    if (marker.test(text)) return text.replace(marker, '').replace(/[.!?。！？]+$/, '').trim()
  }
  return null
}

const QUOTE = /["“「『]([^"”」』]{4,120})["”」』]/

const CENTER: Graphic['kind'][] = ['title', 'stat', 'bars', 'list', 'quote']

const tidy = (text: string) =>
  text
    .replace(/\s+([,.!?。、])/g, '$1')
    .replace(/[,\s]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[,.\s]+/, '')
    .trim()

/**
 * 받아 적은 말(어절과 시간)에서 모션그래픽을 고른다.
 * 규칙 기반이다: 자기소개 → 이름 띠, 숫자 하나 → 큰 숫자, 숫자 여럿 → 막대 차트,
 * 첫째·둘째 → 목록, 따옴표 → 인용, 첫 문장 → 제목, 말 전체 → 자막.
 */
export function direct(words: Word[]): Graphic[] {
  if (words.length === 0) return []
  const sentences = splitSentences(words)
  const graphics: Graphic[] = []
  let serial = 0
  const id = () => `g${++serial}`
  const used = new Set<number>()
  const last = words[words.length - 1].end

  graphics.push({ id: id(), kind: 'captions', start: words[0].start, end: last, words })

  sentences.forEach((sentence, i) => {
    const intro = findIntro(sentence.text)
    if (intro) {
      graphics.push({ id: id(), kind: 'lowerThird', start: sentence.start, end: Math.min(last, Math.max(sentence.end, sentence.start + 3.6)), ...intro })
      used.add(i)
    }
  })

  // 목록: 표시가 붙은 문장이 둘 이상 이어지면
  for (let i = 0; i < sentences.length; i++) {
    const items: { text: string; at: number }[] = []
    let j = i
    while (j < sentences.length) {
      const item = stripMarker(sentences[j].text)
      if (item === null) break
      items.push({ text: clampText(item, 34), at: sentences[j].start })
      j++
    }
    if (items.length >= 2) {
      const prev = i > 0 ? sentences[i - 1] : null
      // 앞 문장이 숫자·인용·자기소개를 담고 있으면 그 그래픽을 살리고, 목록 머리글로 쓰지 않는다.
      const lead = prev && !used.has(i - 1) && findNumbers(prev.text).length === 0 && !QUOTE.test(prev.text) ? prev : null
      graphics.push({
        id: id(),
        kind: 'list',
        start: Math.max(0, items[0].at - 0.5),
        end: Math.min(last + 1.5, sentences[j - 1].end + 1.6),
        title: lead ? clampText(tidy(lead.text.replace(/[.:!?。]+$/, '')), 30) : '',
        items: items.map((item) => item.text),
        itemTimes: items.map((item) => item.at),
      })
      if (lead) used.add(i - 1)
      for (let k = i; k < j; k++) used.add(k)
      i = j - 1
    }
  }

  sentences.forEach((sentence, i) => {
    if (used.has(i)) return
    const quote = sentence.text.match(QUOTE)
    if (quote) {
      graphics.push({ id: id(), kind: 'quote', start: sentence.start, end: Math.max(sentence.end + 0.8, sentence.start + 3.2), text: quote[1].trim(), author: '' })
      used.add(i)
      return
    }
    const numbers = findNumbers(sentence.text)
    if (numbers.length >= 2) {
      const units = new Set(numbers.map((n) => n.suffix))
      const firstAt = numbers[0].index
      graphics.push({
        id: id(),
        kind: 'bars',
        start: sentence.start,
        end: Math.max(sentence.end + 1, sentence.start + 3.6),
        title: clampText(tidy(sentence.text.slice(0, firstAt).replace(numbers[0].before, '')), 30),
        unit: units.size === 1 ? numbers[0].suffix : '',
        items: numbers.slice(0, 5).map((n, k) => ({ label: clampText(n.before || `#${k + 1}`, 14), value: n.value })),
      })
      used.add(i)
    } else if (numbers.length === 1) {
      const [n] = numbers
      graphics.push({
        id: id(),
        kind: 'stat',
        start: sentence.start,
        end: Math.max(sentence.end + 0.8, sentence.start + 3),
        value: n.value,
        prefix: n.prefix,
        suffix: n.suffix,
        decimals: n.decimals,
        label: clampText(tidy(sentence.text.replace(n.raw, '').replace(/[.!?。！？]+$/, '')), 40),
      })
      used.add(i)
    }
  })

  // 제목: 앞쪽에서 아직 쓰지 않은 첫 문장
  const titleIndex = [0, 1].find((i) => i < sentences.length && !used.has(i))
  if (titleIndex !== undefined) {
    const sentence = sentences[titleIndex]
    const text = clampText(sentence.text, 60)
    const tokens = text.split(/\s+/)
    let emphasis = 0
    tokens.forEach((token, k) => {
      if (token.replace(/[^\p{L}\p{N}]/gu, '').length > tokens[emphasis].replace(/[^\p{L}\p{N}]/gu, '').length) emphasis = k
    })
    graphics.push({
      id: id(),
      kind: 'title',
      start: sentence.start,
      end: Math.min(last + 0.5, Math.max(sentence.start + 2.4, Math.min(sentence.end + 0.6, sentence.start + 4.5))),
      text,
      emphasis: tokens.length > 1 ? emphasis : undefined,
    })
  }

  return resolveOverlaps(graphics)
}

/** 화면 가운데를 쓰는 그래픽이 겹치면 앞의 것을 뒤의 것이 시작하기 전에 끝낸다 */
export function resolveOverlaps(graphics: Graphic[]): Graphic[] {
  const center = graphics.filter((g) => CENTER.includes(g.kind)).sort((a, b) => a.start - b.start)
  for (let i = 0; i < center.length - 1; i++) {
    const current = center[i]
    const next = center[i + 1]
    if (current.end > next.start) {
      if (next.start - current.start >= 1) current.end = next.start
      else next.start = current.end
    }
  }
  return graphics.filter((g) => g.end - g.start > 0.4).sort((a, b) => a.start - b.start)
}
