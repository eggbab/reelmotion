import type { Word } from '../captions/types'

/**
 * 받아쓰기 서버는 한 번에 정해진 길이(기본 10분, ASR_MAX_SECONDS)까지만 받는다. 프로 요금제는 30분 영상까지 되므로,
 * 편집기가 긴 소리를 조용한 틈에서 나눠 차례로 보내고 낱말 시간을 이어 붙인다(server.ts 의 transcribeOnServer).
 * 낱말 가운데서 자르지 않으려고, 나눌 자리 앞 30초 안에서 가장 조용한 0.25초를 고른다.
 */
const MARGIN_SECONDS = 20
const SEARCH_SECONDS = 30
const WINDOW_SECONDS = 0.25

export type Piece = { start: number; end: number }

/** 소리 크기(제곱 평균) — window 칸마다 */
function loudness(audio: Float32Array, from: number, length: number): number {
  let sum = 0
  const end = Math.min(audio.length, from + length)
  for (let i = from; i < end; i++) sum += audio[i] * audio[i]
  return sum / Math.max(1, end - from)
}

/** 소리를 maxSeconds 이하의 조각들(표본 번호 [start, end))로 나눈다. 짧으면 한 조각 */
export function splitAudio(audio: Float32Array, sampleRate: number, maxSeconds: number): Piece[] {
  const max = Math.floor(maxSeconds * sampleRate)
  if (audio.length <= max) return [{ start: 0, end: audio.length }]
  // 한계보다 조금 앞을 겨누고(서버의 한계와 꼭 맞추지 않게), 그 앞의 일정 구간에서 조용한 곳을 찾는다
  const aim = Math.floor(Math.max(maxSeconds * 0.5, maxSeconds - MARGIN_SECONDS) * sampleRate)
  const search = Math.floor(Math.min(SEARCH_SECONDS, (aim / sampleRate) * 0.5) * sampleRate)
  const window = Math.max(1, Math.floor(WINDOW_SECONDS * sampleRate))
  const step = Math.max(1, Math.floor(window / 2))
  const pieces: Piece[] = []
  let start = 0
  while (audio.length - start > max) {
    const target = start + aim
    let best = target
    let quietest = Infinity
    for (let at = target - search; at + window <= target; at += step) {
      const level = loudness(audio, at, window)
      if (level < quietest) {
        quietest = level
        best = at + Math.floor(window / 2)
      }
    }
    pieces.push({ start, end: best })
    start = best
  }
  pieces.push({ start, end: audio.length })
  return pieces
}

/** 조각에서 받은 낱말의 시간을 그 조각이 영상에서 시작하는 때만큼 민다 */
export function offsetWords(words: Word[], seconds: number): Word[] {
  return words.map((word) => ({ ...word, start: word.start + seconds, end: word.end + seconds }))
}
