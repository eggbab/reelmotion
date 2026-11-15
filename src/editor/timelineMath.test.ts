import { describe, expect, it } from 'vitest'
import { MAX_PPS, MIN_PPS, basePps, dragMode, scrollToShow, tickLabel, tickStep, zoomPps } from './timelineMath'

describe('타임라인 배율(1초가 몇 픽셀인지)', () => {
  it('짧은 영상은 화면에 꼭 맞게, 긴 영상은 최소 배율로(가로로 밀어 본다)', () => {
    expect(basePps(900, 10)).toBe(90)
    expect(basePps(300, 60)).toBe(MIN_PPS)
    expect(basePps(300, 0)).toBe(0)
    expect(basePps(0, 10)).toBe(0)
  })

  it('축소는 화면에 꼭 맞을 때까지, 확대는 정한 한도까지', () => {
    // 휴대폰(300px)에서 60초 영상: 꼭 맞는 배율은 5
    let pps = basePps(300, 60)
    const seen: number[] = []
    for (let i = 0; i < 10; i++) {
      pps = zoomPps(pps, -1, 300, 60)
      seen.push(pps)
    }
    expect(seen.at(-1)).toBe(5)
    expect(seen.every((value, index) => index === 0 || value <= seen[index - 1])).toBe(true)
    for (let i = 0; i < 20; i++) pps = zoomPps(pps, 1, 300, 60)
    expect(pps).toBe(MAX_PPS)
  })

  it('아주 짧은 영상은 꼭 맞는 배율이 한도보다 커서 바꿀 것이 없다', () => {
    expect(zoomPps(450, 1, 900, 2)).toBe(450)
    expect(zoomPps(450, -1, 900, 2)).toBe(450)
  })
})

describe('블록을 누른 곳에 따라: 옮기기 / 앞 끝 / 뒤 끝', () => {
  it('마우스는 양 끝 8px 이 길이 바꾸기', () => {
    expect(dragMode(3, 120, false)).toBe('start')
    expect(dragMode(60, 120, false)).toBe('move')
    expect(dragMode(115, 120, false)).toBe('end')
  })

  it('손가락은 끝 영역이 넓다(20px). 좁은 블록은 가운데 옮기기 자리를 먼저 남긴다', () => {
    expect(dragMode(15, 120, true)).toBe('start')
    expect(dragMode(22, 120, true)).toBe('move')
    expect(dragMode(104, 120, true)).toBe('end')
    // 폭 48px: 끝 영역은 16px 씩, 가운데 16px 은 옮기기
    expect(dragMode(10, 48, true)).toBe('start')
    expect(dragMode(24, 48, true)).toBe('move')
    expect(dragMode(40, 48, true)).toBe('end')
    // 아주 좁으면 옮기기만(길이는 확대하거나 숫자로 바꾼다)
    expect(dragMode(2, 14, true)).toBe('move')
    expect(dragMode(12, 14, true)).toBe('move')
  })
})

describe('눈금', () => {
  it('글자가 겹치지 않게 간격을 고른다(44px 이상)', () => {
    expect(tickStep(90)).toBe(1)
    expect(tickStep(MIN_PPS)).toBe(2)
    expect(tickStep(5)).toBe(10)
    expect(tickStep(0.5)).toBe(120)
    expect(tickStep(0)).toBe(1)
  })

  it('1분 미만은 초, 그 뒤는 분:초', () => {
    expect(tickLabel(0)).toBe('0s')
    expect(tickLabel(45)).toBe('45s')
    expect(tickLabel(60)).toBe('1:00')
    expect(tickLabel(605)).toBe('10:05')
  })
})

describe('재생 머리가 보이게 밀기', () => {
  it('보이는 범위 안이면 그대로(null), 벗어나면 머리가 왼쪽 10% 자리에 오게', () => {
    expect(scrollToShow(150, 0, 300)).toBeNull()
    expect(scrollToShow(310, 0, 300)).toBe(280)
    expect(scrollToShow(50, 200, 300)).toBe(20)
    expect(scrollToShow(10, 200, 300)).toBe(0)
  })
})
