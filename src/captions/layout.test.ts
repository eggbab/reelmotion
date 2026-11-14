import { describe, expect, it } from 'vitest'
import { layoutLines } from './layout'

describe('layoutLines', () => {
  it('폭 안에 들어가면 한 줄이다', () => {
    expect(layoutLines([100, 100], 10, 300)).toEqual([[0, 1]])
  })

  it('넘치면 어절 단위로 줄을 바꾼다', () => {
    expect(layoutLines([100, 100, 100], 10, 250)).toEqual([[0, 1], [2]])
  })

  it('한 어절이 폭보다 넓어도 한 줄을 차지하게 둔다', () => {
    expect(layoutLines([400, 50], 10, 300)).toEqual([[0], [1]])
  })

  it('두 줄이 되면 길이가 비슷하게 나눈다', () => {
    // 욕심껏 채우면 [0,1,2],[3] 이지만 보기 좋게 [0,1],[2,3]
    expect(layoutLines([100, 100, 100, 100], 0, 350)).toEqual([[0, 1], [2, 3]])
  })
})
