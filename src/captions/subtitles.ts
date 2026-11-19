import { joinWords, wordsToCues } from './segment'
import type { Cue, Word } from './types'

/**
 * 자막 파일(SRT · WebVTT): 유튜브·인스타그램 등에 올릴 때 쓰는 글 파일. 받아쓴 말(낱말과 시간)에서 이 브라우저 안에서 만든다.
 * 자막 한 덩어리는 영상에 넣는 자막 그래픽과 같은 곳에서 끊는다(wordsToCues — 문장 끝·줄바꿈·글자 수·긴 쉼).
 */

/** 말이 끝난 뒤 자막을 더 두는 시간(화면 자막과 같다 — segment.ts 의 HOLD_SECONDS). 다음 자막과는 겹치지 않게 */
const HOLD_SECONDS = 0.4

/** 초 → 「시:분:초,밀리초」(SRT 는 쉼표, VTT 는 마침표) */
export function formatTime(seconds: number, mark: ',' | '.'): string {
  const total = Math.max(0, Math.round(seconds * 1000))
  const ms = total % 1000
  const s = Math.floor(total / 1000) % 60
  const m = Math.floor(total / 60000) % 60
  const h = Math.floor(total / 3600000)
  const pad = (value: number, size = 2) => String(value).padStart(size, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}${mark}${pad(ms, 3)}`
}

function timed(words: Word[], maxChars: number): { cue: Cue; end: number }[] {
  const cues = wordsToCues(words, { maxChars })
  return cues.map((cue, i) => ({ cue, end: Math.min(cue.end + HOLD_SECONDS, cues[i + 1]?.start ?? Infinity) }))
}

/** SRT 파일의 글. maxChars: 한 덩어리의 글자 수(화면 자막과 같게 — 가로 30, 세로 16) */
export function toSrt(words: Word[], maxChars: number): string {
  return timed(words, maxChars)
    .map(({ cue, end }, i) => `${i + 1}\n${formatTime(cue.start, ',')} --> ${formatTime(end, ',')}\n${joinWords(cue.words)}\n`)
    .join('\n')
}

/** WebVTT 파일의 글 */
export function toVtt(words: Word[], maxChars: number): string {
  const body = timed(words, maxChars)
    .map(({ cue, end }) => `${formatTime(cue.start, '.')} --> ${formatTime(end, '.')}\n${joinWords(cue.words)}\n`)
    .join('\n')
  return `WEBVTT\n${body ? `\n${body}` : ''}`
}
