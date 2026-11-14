import { spokenLength } from '../captions/segment'
import type { Word } from '../captions/types'

/** 말소리 인식이 돌려주는 조각 하나. 끝 시간은 없을 수 있다. */
export type SpeechChunk = { text: string; timestamp: [number | null, number | null] }

const MIN_SECONDS = 0.1
/** 한 어절이 이보다 길면 뒤따르는 침묵까지 붙은 것으로 보고 줄인다. */
export const longestSeconds = (text: string) => 0.6 + 0.25 * spokenLength(text)
export const estimatedSeconds = (text: string) => 0.2 + 0.12 * spokenLength(text)

const isTime = (value: number | null): value is number => typeof value === 'number' && Number.isFinite(value)

/** 인식 결과를 자막이 쓰는 어절 목록으로 바꾼다. 시간은 항상 앞에서 뒤로 흐르게 고친다. */
export function chunksToWords(chunks: SpeechChunk[]): Word[] {
  const words: Word[] = []
  let cursor = 0
  for (const chunk of chunks) {
    const text = chunk.text.trim()
    if (!text) continue
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
