import { joinWords } from '../captions/segment'
import type { Word } from '../captions/types'
import { findNumbers } from './numbers'
import type { FoundNumber } from './numbers'
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
      text: joinWords(current),
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

/** 숫자 바로 앞에 와도 설명에서 빼는 영어 낱말(by 8% → 8%) */
const LEADING = new Set('a an the of in on at by to for from with about over under than just only nearly almost around roughly up down per'.split(' '))
/** 막대 이름표로 쓰지 않을 낱말(전치사·관사·대명사·때·중 같은 말) */
const STOP = new Set([
  ...LEADING,
  ...'and or but some those these that this is are was were be been has have had we i you they he she it its our my your percent more less since'.split(' '),
  ...'때 중 약 총 모두 그 이 저 또 및 등 단 겨우 무려 거의 약간 그리고 하지만 그래서 또는 더 덜 이미 이제 벌써 매 각 한 두 세 바로 오직 단지 무려 거기 여기'.split(' '),
  ...'約 計 全 その この あの また 及び 等 わずか ほぼ さらに もう ただ 時 中'.split(' '),
])
const isStop = (word: string) => STOP.has(word.toLowerCase())

/** 막대 이름표: 「70 runs」처럼 단위 없는 숫자 뒤에 이름이 오면 뒤 낱말, 아니면 앞 낱말. 마땅한 게 없으면 빈 글 */
function labelOf(n: FoundNumber): string {
  if (n.after && !n.suffix && !n.prefix && !isStop(n.after)) return n.after
  if (n.before && !isStop(n.before) && !/\d/.test(n.before)) return n.before
  return ''
}

// 숫자 바로 뒤에 붙어 남는 조사. 한국어는 뒤에 빈칸이 와야(「3명이 안에」), 일본어는 바로 이어져도(「7000の島々」) 뗀다.
const PARTICLE_AFTER = /^(?:(?:이|가|은|는|을|를|의|도|에|에서|만)(?=\s|$)|(?:が|は|の|を|も|に))/u
/** 숫자 바로 앞의 어림 말(약 3명, 約7000) */
const APPROX_BEFORE = /(約|およそ|ほぼ|약|대략|총)$/u
const CJK_EDGE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u

const STRONG_UNITS = new Set(['%', 'x', '배', '倍', 'M', 'B', 'K', '만', '억', '万', '億', '만원', '억원', '원', '円'])

/** 단위가 섞인 문장에서 하나만 고를 때: 퍼센트·배수·돈처럼 뜻이 분명한 숫자를 먼저 */
function pickNumber(numbers: FoundNumber[]): FoundNumber {
  return numbers.find((n) => n.prefix || STRONG_UNITS.has(n.suffix)) ?? numbers[0]
}

/** 숫자가 든 마디(쉼표로 나눈 부분)에서 숫자를 빼고 설명으로 쓴다. 숫자 바로 앞의 by·of 같은 낱말도 뺀다. */
function statLabel(text: string, n: FoundNumber): string {
  const clauses = text.split(/[,;:，、]/)
  const clause = clauses.find((part) => part.includes(n.raw)) ?? text
  const at = clause.indexOf(n.raw)
  const before = clause
    .slice(0, at)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  while (before.length > 0 && LEADING.has(before[before.length - 1].toLowerCase())) before.pop()
  const head = before.join(' ').replace(APPROX_BEFORE, '').trimEnd()
  const after = clause
    .slice(at + n.raw.length)
    .replace(PARTICLE_AFTER, '')
    .replace(/[.!?。！？]+\s*$/, '')
  // 일본어처럼 붙여 쓰는 말은 빈칸 없이 잇는다.
  const joined = CJK_EDGE.test(head.slice(-1)) && CJK_EDGE.test(after.trimStart().slice(0, 1)) ? `${head}${after.trimStart()}` : `${head} ${after}`
  return clampText(tidy(joined), 40)
}

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
    if (numbers.length === 0) return
    // 같은 단위끼리 묶어 가장 큰 묶음이 둘 이상이면 차트, 아니면 숫자 하나
    const groups = new Map<string, FoundNumber[]>()
    for (const n of numbers) groups.set(n.suffix, [...(groups.get(n.suffix) ?? []), n])
    const biggest = [...groups.values()].sort((a, b) => b.length - a.length)[0]
    const labels = biggest.map(labelOf)
    // 이름표가 뜻 있는 낱말인 숫자가 둘 이상일 때만 차트로 만든다(「3명이 … 그들 중 1명」은 차트가 아니다).
    if (biggest.length >= 2 && labels.filter(Boolean).length >= 2) {
      graphics.push({
        id: id(),
        kind: 'bars',
        start: sentence.start,
        end: Math.max(sentence.end + 1, sentence.start + 3.6),
        title: '',
        unit: biggest[0].suffix,
        items: biggest.slice(0, 5).map((n, k) => ({ label: clampText(labels[k] || `#${k + 1}`, 14), value: n.value })),
      })
    } else {
      const n = pickNumber(numbers)
      graphics.push({
        id: id(),
        kind: 'stat',
        start: sentence.start,
        end: Math.max(sentence.end + 0.8, sentence.start + 3),
        value: n.value,
        prefix: n.prefix,
        suffix: n.suffix,
        decimals: n.decimals,
        label: statLabel(sentence.text, n),
      })
    }
    used.add(i)
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
