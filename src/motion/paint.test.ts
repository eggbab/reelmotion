import { describe, expect, it } from 'vitest'
import { fitLine, fitLines, wrapText } from './paint'

/** 글자 하나를 10 으로 재는 가짜 붓(실제 글꼴 없이 줄 나누기만 본다) */
const ctx = { measureText: (text: string) => ({ width: [...text].length * 10 }) } as unknown as CanvasRenderingContext2D

describe('줄 나누기', () => {
  it('낱말 사이에서 나눈다', () => {
    expect(wrapText(ctx, 'drink a glass of water', 100)).toEqual(['drink a', 'glass of', 'water'])
  })
})

describe('정한 줄 수에 맞추기 — 넘치는 글을 말없이 버리지 않는다', () => {
  it('줄 수 안에 들어가면 그대로', () => {
    expect(fitLines(ctx, 'drink a glass of water', 100, 3)).toEqual(['drink a', 'glass of', 'water'])
  })

  it('넘치면 마지막 줄 끝에 … 을 붙여 잘렸음을 알린다', () => {
    const lines = fitLines(ctx, '계획을 너무 빡빡하게 세우지 마세요 그리고 꼭 쉬세요', 100, 2)
    expect(lines).toHaveLength(2)
    expect(lines[1].endsWith('…')).toBe(true)
    for (const line of lines) expect([...line].length * 10).toBeLessThanOrEqual(100)
  })

  it('한 줄에 맞추기: 넘치면 … 으로 줄인다', () => {
    expect(fitLine(ctx, '고정비', 100)).toBe('고정비')
    const cut = fitLine(ctx, '아주 긴 이름표가 들어온 경우입니다', 100)
    expect(cut.endsWith('…')).toBe(true)
    expect([...cut].length * 10).toBeLessThanOrEqual(100)
  })
})
