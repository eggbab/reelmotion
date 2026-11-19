import { describe, expect, it } from 'vitest'
import { offsetWords, splitAudio } from './chunks'

const RATE = 1000

/** 소리(크기 0.5 의 소음) 가운데 조용한 틈을 둔 신호 */
function signal(seconds: number, quiet: [number, number][]): Float32Array {
  const audio = new Float32Array(seconds * RATE)
  for (let i = 0; i < audio.length; i++) {
    const t = i / RATE
    audio[i] = quiet.some(([a, b]) => t >= a && t < b) ? 0.001 : 0.5 * Math.sin(i * 1.7)
  }
  return audio
}

describe('긴 소리 나누기(받아쓰기 서버는 한 번에 정해진 길이까지)', () => {
  it('짧으면 나누지 않는다', () => {
    expect(splitAudio(signal(50, []), RATE, 60)).toEqual([{ start: 0, end: 50 * RATE }])
  })

  it('길면 한계보다 조금 앞의 조용한 틈에서 나누고, 조각은 모두 한계 안이며 빈틈없이 이어진다', () => {
    const audio = signal(150, [
      [35, 35.5],
      [75, 75.5],
    ])
    const pieces = splitAudio(audio, RATE, 60)
    expect(pieces.length).toBeGreaterThanOrEqual(3)
    expect(pieces[0].start).toBe(0)
    expect(pieces[pieces.length - 1].end).toBe(audio.length)
    for (let i = 1; i < pieces.length; i++) expect(pieces[i].start).toBe(pieces[i - 1].end)
    for (const piece of pieces) expect((piece.end - piece.start) / RATE).toBeLessThanOrEqual(60)
    // 첫 두 자리는 조용한 틈 안
    expect(pieces[0].end / RATE).toBeGreaterThanOrEqual(35)
    expect(pieces[0].end / RATE).toBeLessThanOrEqual(35.5)
    expect(pieces[1].end / RATE).toBeGreaterThanOrEqual(75)
    expect(pieces[1].end / RATE).toBeLessThanOrEqual(75.5)
  })

  it('조용한 틈이 없어도(음악이 깔린 영상) 한계 안에서 나눈다', () => {
    const pieces = splitAudio(signal(200, []), RATE, 60)
    for (const piece of pieces) expect((piece.end - piece.start) / RATE).toBeLessThanOrEqual(60)
    expect(pieces[pieces.length - 1].end).toBe(200 * RATE)
  })

  it('조각의 낱말 시간을 그 조각이 시작하는 때만큼 민다', () => {
    expect(offsetWords([{ text: 'hi', start: 0.5, end: 0.9, lineEnd: true }], 600)).toEqual([{ text: 'hi', start: 600.5, end: 600.9, lineEnd: true }])
  })
})
