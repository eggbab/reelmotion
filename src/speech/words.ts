import { spokenLength } from '../captions/segment'
import type { Word } from '../captions/types'

/** 말소리 인식이 돌려주는 조각 하나. 끝 시간은 없을 수 있다. */
export type SpeechChunk = { text: string; timestamp: [number | null, number | null] }

const MIN_SECONDS = 0.1
/** 한 어절이 이보다 길면 뒤따르는 침묵까지 붙은 것으로 보고 줄인다. */
export const longestSeconds = (text: string) => 0.6 + 0.25 * spokenLength(text)
export const estimatedSeconds = (text: string) => 0.2 + 0.12 * spokenLength(text)

const isTime = (value: number | null): value is number => typeof value === 'number' && Number.isFinite(value)

/** 빈칸 없이 앞 낱말에 이어 붙는 조각(숫자 뒷부분·기호·문장 부호)인지 */
const CONTINUES = /^[\p{P}\p{S}\p{N}]/u
const ENDS_WORDLIKE = /[\p{L}\p{N}]$/u

/**
 * 인식 결과를 자막이 쓰는 어절 목록으로 바꾼다. 시간은 항상 앞에서 뒤로 흐르게 고친다.
 * Whisper 는 「1,400」을 「 1」「,400」으로, 「8%」를 「 8」「%」로 쪼개서 준다 — 새 낱말은 빈칸으로 시작하므로,
 * 빈칸 없이 숫자·기호로 시작하는 조각은 앞 낱말에 붙인다. 글자로 시작하는 조각(일본어 등)은 붙이지 않는다.
 */
export function chunksToWords(chunks: SpeechChunk[]): Word[] {
  const words: Word[] = []
  let cursor = 0
  for (const chunk of chunks) {
    const text = chunk.text.trim()
    if (!text) continue
    const prev = words[words.length - 1]
    if (prev && !/^\s/.test(chunk.text) && CONTINUES.test(text) && ENDS_WORDLIKE.test(prev.text)) {
      const [, glueEnd] = chunk.timestamp
      prev.text += text
      prev.end = Math.min(Math.max(prev.end, isTime(glueEnd) ? glueEnd : prev.end), prev.start + longestSeconds(prev.text))
      cursor = prev.end
      continue
    }
    const [rawStart, rawEnd] = chunk.timestamp
    const start = Math.max(isTime(rawStart) ? rawStart : cursor, cursor)
    let end = isTime(rawEnd) ? rawEnd : start + estimatedSeconds(text)
    end = Math.min(end, start + longestSeconds(text))
    if (end <= start) end = start + MIN_SECONDS
    words.push({ text, start, end })
    cursor = end
  }
  return words
}
