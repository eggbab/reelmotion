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

describe('layoutLines 와 붙여 쓰는 낱말', () => {
  it('joins 가 참인 자리에는 빈칸 폭을 넣지 않는다', () => {
    // 100+100(빈칸 없음)=200 이라 폭 205 에 한 줄로 들어간다
    expect(layoutLines([100, 100], 10, 205, [true])).toEqual([[0, 1]])
    expect(layoutLines([100, 100], 10, 205)).toEqual([[0], [1]])
  })
})
