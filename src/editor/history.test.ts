import { describe, expect, it } from 'vitest'
import type { Graphic } from '../motion/types'
import { COALESCE_MS, HISTORY_LIMIT, changeKey, emptyHistory, record, redo, undo } from './history'
import type { Snapshot } from './history'

const stat: Graphic = { id: 's', kind: 'stat', start: 2, end: 5, value: 37, prefix: '', suffix: '%', decimals: 0, label: '' }
const at = (value: number): Snapshot => ({ graphics: [{ ...stat, value }], script: 'x', recognized: null, theme: 'neon' })

describe('되돌리기·다시 하기', () => {
  it('바꾸기 전의 모습으로 돌아가고, 다시 하기로 앞으로 간다', () => {
    let history = record(emptyHistory(), at(1), null, 0)
    history = record(history, at(2), null, 5000)
    // 지금은 3
    const back = undo(history, at(3))!
    expect(back.snapshot).toEqual(at(2))
    const back2 = undo(back.history, back.snapshot)!
    expect(back2.snapshot).toEqual(at(1))
    expect(undo(back2.history, back2.snapshot)).toBeNull()
    const forward = redo(back2.history, back2.snapshot)!
    expect(forward.snapshot).toEqual(at(2))
    const forward2 = redo(forward.history, forward.snapshot)!
    expect(forward2.snapshot).toEqual(at(3))
    expect(redo(forward2.history, forward2.snapshot)).toBeNull()
  })

  it('되돌린 뒤 새로 고치면 다시 하기는 사라진다', () => {
    let history = record(emptyHistory(), at(1), null, 0)
    const back = undo(history, at(2))!
    history = record(back.history, back.snapshot, null, 9000)
    expect(redo(history, at(5))).toBeNull()
  })

  it('같은 칸을 잇달아 고치면(글자 치기·끌기) 한 번으로 묶는다 — 잠깐 멈추면 따로', () => {
    let history = record(emptyHistory(), at(1), 's:value', 0)
    history = record(history, at(2), 's:value', 300)
    history = record(history, at(3), 's:value', 300 + COALESCE_MS - 1)
    expect(history.past).toEqual([at(1)])
    // 멈췄다가 다시 고치면 새 칸
    history = record(history, at(4), 's:value', 600 + COALESCE_MS * 3)
    expect(history.past).toEqual([at(1), at(4)])
    // 다른 칸을 고치면 바로 새 칸
    history = record(history, at(5), 's:label', 600 + COALESCE_MS * 3 + 10)
    expect(history.past).toEqual([at(1), at(4), at(5)])
    // 이름 없는 고치기(그래픽 만들기·지우기 등)는 늘 따로
    history = record(history, at(6), null, 600 + COALESCE_MS * 3 + 20)
    history = record(history, at(7), null, 600 + COALESCE_MS * 3 + 30)
    expect(history.past.length).toBe(5)
  })

  it('되돌린 다음의 고치기는 앞의 묶음에 붙지 않는다', () => {
    let history = record(emptyHistory(), at(1), 's:value', 0)
    const back = undo(history, at(2))!
    history = record(back.history, back.snapshot, 's:value', 100)
    expect(history.past).toEqual([at(1)])
  })

  it(`${HISTORY_LIMIT}번까지만 기억한다`, () => {
    let history = emptyHistory()
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) history = record(history, at(i), null, i * 10000)
    expect(history.past.length).toBe(HISTORY_LIMIT)
    expect(history.past[0]).toEqual(at(20))
  })

  it('고친 칸의 이름: 그래픽 번호와 바뀐 칸들', () => {
    expect(changeKey({ ...stat }, { ...stat, value: 40 })).toBe('s:value')
    expect(changeKey({ ...stat }, { ...stat, start: 3, end: 6 })).toBe('s:end,start')
    expect(changeKey({ ...stat }, { ...stat })).toBe('s:')
    expect(changeKey({ ...stat, side: 'right' }, { ...stat, side: 'left' })).toBe('s:side')
  })
})
