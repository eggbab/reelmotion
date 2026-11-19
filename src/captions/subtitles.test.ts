import { describe, expect, it } from 'vitest'
import { scriptToWords } from './segment'
import { formatTime, toSrt, toVtt } from './subtitles'
import type { Word } from './types'

const words: Word[] = [
  { text: 'Hello', start: 0.2, end: 0.6 },
  { text: 'everyone.', start: 0.6, end: 1.2 },
  { text: 'Today', start: 1.5, end: 1.9 },
  { text: 'we', start: 1.9, end: 2.0 },
  { text: 'talk', start: 2.0, end: 2.4 },
  { text: 'about', start: 2.4, end: 2.7 },
  { text: 'sleep.', start: 2.7, end: 3.3 },
]

describe('자막 파일', () => {
  it('시각: SRT 는 쉼표, VTT 는 마침표로 밀리초', () => {
    expect(formatTime(0, ',')).toBe('00:00:00,000')
    expect(formatTime(3725.4567, ',')).toBe('01:02:05,457')
    expect(formatTime(59.9996, '.')).toBe('00:01:00.000')
  })

  it('SRT: 번호 · 시각 · 글, 화면 자막과 같은 곳에서 끊는다(문장 끝)', () => {
    expect(toSrt(words, 30)).toBe(['1', '00:00:00,200 --> 00:00:01,500', 'Hello everyone.', '', '2', '00:00:01,500 --> 00:00:03,700', 'Today we talk about sleep.', ''].join('\n'))
  })

  it('VTT: 머리 줄 WEBVTT', () => {
    expect(toVtt(words, 30)).toBe(['WEBVTT', '', '00:00:00.200 --> 00:00:01.500', 'Hello everyone.', '', '00:00:01.500 --> 00:00:03.700', 'Today we talk about sleep.', ''].join('\n'))
  })

  it('글이 끝난 뒤 잠깐 더 두되, 다음 자막과 겹치지 않는다', () => {
    const srt = toSrt(words, 30)
    // 첫 자막은 1.2초에 끝나지만 0.4초 더 두려다 다음 자막(1.5초)에서 멈춘다
    expect(srt).toContain('00:00:00,200 --> 00:00:01,500')
    // 마지막은 0.4초 더
    expect(srt).toContain('--> 00:00:03,700')
  })

  it('긴 문장은 글자 수에서 나누고, 일본어는 빈칸 없이 붙인다', () => {
    const long = scriptToWords('This is a very long sentence that keeps going and going without a stop', 10)
    const cues = toSrt(long, 30).split('\n\n').filter(Boolean)
    expect(cues.length).toBeGreaterThan(1)
    for (const cue of cues) expect(cue.split('\n')[2].length).toBeLessThanOrEqual(30)
    const ja = toSrt(scriptToWords('今日は朝六時に起きました。', 3), 30)
    expect(ja.split('\n')[2]).toBe('今日は朝六時に起きました。')
  })

  it('말이 없으면 빈 파일(VTT 는 머리 줄만)', () => {
    expect(toSrt([], 30)).toBe('')
    expect(toVtt([], 30)).toBe('WEBVTT\n')
  })
})
