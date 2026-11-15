import { describe, expect, it } from 'vitest'
import type { Graphic } from '../motion/types'
import { applyOps, compactGraphics, validateOps } from './assist'
import type { AssistState } from './assist'

const graphics: Graphic[] = [
  { id: 'g1', kind: 'title', start: 0.2, end: 3, text: 'Three habits' },
  { id: 'g2', kind: 'lowerThird', start: 0.5, end: 4, name: 'Mina Park', role: 'Researcher' },
  { id: 'g3', kind: 'stat', start: 4, end: 7, value: 37, prefix: '', suffix: '%', decimals: 0, label: 'faster' },
  { id: 'g4', kind: 'list', start: 7, end: 10, title: 'Tips', items: ['No screens', 'Same time'], itemTimes: [7.4, 8.2] },
  { id: 'g5', kind: 'captions', start: 0, end: 10, words: [{ text: 'Hello', start: 0, end: 0.5 }] },
]
const state: AssistState = { duration: 12, theme: 'neon', script: 'Hello there, teh world', graphics: compactGraphics(graphics) }

describe('compactGraphics (AI 에게 보내는 요약)', () => {
  it('자막 낱말·항목 시각은 빼고, 시간은 0.1초로', () => {
    const compact = compactGraphics([{ ...graphics[0], start: 0.234 }, graphics[3], graphics[4]])
    expect(compact[0]).toEqual({ id: 'g1', kind: 'title', start: 0.2, end: 3, text: 'Three habits' })
    expect(compact[1]).not.toHaveProperty('itemTimes')
    expect(compact[2]).toEqual({ id: 'g5', kind: 'captions', start: 0, end: 10 })
  })
})

describe('validateOps (AI 가 준 고치기 검사)', () => {
  it('놓이는 쪽(side)은 왼쪽·오른쪽만, 쪽을 고르는 그래픽에만', () => {
    const ops = validateOps(
      {
        ops: [
          { op: 'update', id: 'g3', fields: { side: 'left' } },
          { op: 'update', id: 'g1', fields: { side: 'top' } },
          { op: 'update', id: 'g5', fields: { side: 'right' } },
        ],
      },
      state,
    )
    expect(ops).toEqual([{ op: 'update', id: 'g3', fields: { side: 'left' } }])
    const after = applyOps({ graphics, theme: 'neon', script: '', duration: 12 }, ops, () => 'x')
    expect(after.graphics.find((graphic) => graphic.id === 'g3')?.side).toBe('left')
    expect(compactGraphics([{ ...graphics[2], side: 'right' }])[0]).toMatchObject({ side: 'right' })
  })

  it('바른 고치기는 남기고, 없는 그래픽·모르는 칸·틀린 값은 버린다', () => {
    const ops = validateOps(
      {
        ops: [
          { op: 'update', id: 'g1', fields: { text: 'Morning routine', color: 'red' } },
          { op: 'update', id: 'nope', fields: { text: 'x' } },
          { op: 'update', id: 'g3', fields: { value: 'many' } },
          { op: 'remove', id: 'g2' },
          { op: 'theme', theme: 'seoul' },
          { op: 'theme', theme: 'retro' },
          { op: 'replace', find: 'teh', replace: 'the' },
          { op: 'replace', find: 'absent', replace: 'x' },
          { op: 'fly' },
        ],
      },
      state,
    )
    expect(ops).toEqual([
      { op: 'update', id: 'g1', fields: { text: 'Morning routine' } },
      { op: 'remove', id: 'g2' },
      { op: 'theme', theme: 'seoul' },
      { op: 'replace', find: 'teh', replace: 'the' },
    ])
  })

  it('시간은 영상 길이 안으로, 너무 짧으면 버리고, 위치는 0~1 로', () => {
    const ops = validateOps(
      {
        ops: [
          { op: 'update', id: 'g1', fields: { start: -2, end: 40 } },
          { op: 'update', id: 'g2', fields: { start: 3, end: 3.1 } },
          { op: 'add', kind: 'callout', start: 2, end: 5, fields: { text: 'Look', x: 1.7, y: -1 } },
        ],
      },
      state,
    )
    expect(ops[0]).toEqual({ op: 'update', id: 'g1', fields: { start: 0, end: 12 } })
    // g2 는 0.1초라 시간을 버리고, 남은 칸이 없어 고치기 전체를 버린다.
    expect(ops[1]).toEqual({ op: 'add', kind: 'callout', start: 2, end: 5, fields: { text: 'Look', x: 1, y: 0 } })
    expect(ops).toHaveLength(2)
  })

  it('시작이나 끝 하나만 바꾸면 다른 하나는 지금 값으로', () => {
    expect(validateOps({ ops: [{ op: 'update', id: 'g2', fields: { start: 2.5 } }] }, state)).toEqual([{ op: 'update', id: 'g2', fields: { start: 2.5, end: 4 } }])
    expect(validateOps({ ops: [{ op: 'update', id: 'g3', fields: { end: 9 } }] }, state)).toEqual([{ op: 'update', id: 'g3', fields: { start: 4, end: 9 } }])
    // 끝보다 늦게 시작하게 되면 버린다
    expect(validateOps({ ops: [{ op: 'update', id: 'g2', fields: { start: 5 } }] }, state)).toEqual([])
  })

  it('목록·차트 항목은 글·숫자만, 8개까지', () => {
    const ops = validateOps(
      {
        ops: [
          { op: 'update', id: 'g4', fields: { items: ['A', 2, 'C'] } },
          { op: 'add', kind: 'bars', start: 1, end: 6, fields: { title: 'Share', items: [{ label: 'A', value: 50 }, { label: 'B', value: 'x' }] } },
          { op: 'update', id: 'g4', fields: { items: Array.from({ length: 12 }, (_, i) => `item ${i}`) } },
        ],
      },
      state,
    )
    expect(ops[0]).toEqual({ op: 'update', id: 'g4', fields: { items: ['A', 'C'] } })
    expect(ops[1]).toEqual({ op: 'add', kind: 'bars', start: 1, end: 6, fields: { title: 'Share', items: [{ label: 'A', value: 50 }] } })
    expect((ops[2] as unknown as { fields: { items: string[] } }).fields.items).toHaveLength(8)
  })

  it('형식이 틀리면 빈 목록, 고치기는 12개까지', () => {
    expect(validateOps('nope', state)).toEqual([])
    expect(validateOps({ ops: Array.from({ length: 20 }, () => ({ op: 'theme', theme: 'clean' })) }, state)).toHaveLength(12)
  })
})

describe('applyOps (편집기에 적용)', () => {
  it('글 바꾸기·지우기·더하기·스타일·낱말 고치기', () => {
    let next = 100
    const result = applyOps(
      { graphics, theme: 'neon', script: 'Hello there, teh world', duration: 12 },
      [
        { op: 'update', id: 'g1', fields: { text: 'Morning routine' } },
        { op: 'remove', id: 'g2' },
        { op: 'add', kind: 'quote', start: 8, end: 11, fields: { text: 'Sleep is a skill', author: 'Mina' } },
        { op: 'theme', theme: 'tokyo' },
        { op: 'replace', find: 'teh', replace: 'the' },
      ],
      () => `u${++next}`,
    )
    expect(result.theme).toBe('tokyo')
    expect(result.script).toBe('Hello there, the world')
    expect(result.graphics.find((g) => g.id === 'g1')).toMatchObject({ text: 'Morning routine' })
    expect(result.graphics.some((g) => g.id === 'g2')).toBe(false)
    expect(result.graphics.find((g) => g.id === 'u101')).toMatchObject({ kind: 'quote', start: 8, end: 11, text: 'Sleep is a skill', author: 'Mina' })
  })

  it('목록 항목이나 시간이 바뀌면 항목이 나타나는 시각을 다시 고른다', () => {
    const result = applyOps({ graphics, theme: 'neon', script: '', duration: 12 }, [{ op: 'update', id: 'g4', fields: { items: ['A', 'B', 'C'], start: 2, end: 6 } }], () => 'x')
    const list = result.graphics.find((g) => g.id === 'g4')
    expect(list).toMatchObject({ start: 2, end: 6, items: ['A', 'B', 'C'] })
    const times = (list as { itemTimes: number[] }).itemTimes
    expect(times).toHaveLength(3)
    expect(times[0]).toBeGreaterThanOrEqual(2)
    expect(times[2]).toBeLessThan(6)
  })
})
