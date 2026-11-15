import { describe, expect, it } from 'vitest'
import { scriptToWords } from '../captions/segment'
import { direct } from './direct'
import { ORDINARY_SCRIPTS } from './ordinary-scripts'
import { scriptOf } from './text'
import type { Graphic } from './types'

/** 평범한 대본 하나에서 나온 그래픽(자막 빼고, 시간 빼고) */
function placed(script: string) {
  return direct(scriptToWords(script, 20))
    .filter((graphic) => graphic.kind !== 'captions')
    .map((graphic) => {
      const rest: Record<string, unknown> = { ...graphic }
      for (const key of ['id', 'start', 'end', 'itemTimes', 'emphasis']) delete rest[key]
      return rest as Record<string, unknown> & { kind: Graphic['kind'] }
    })
}

const all = Object.entries(ORDINARY_SCRIPTS).map(([name, script]) => ({ name, script, graphics: placed(script) }))
const length = (text: string) => [...text].length

describe('평범한 대본 24개로 재는 자동 배치', () => {
  it('제목·자막 말고도 그래픽이 나오는 대본이 20개 이상이다(처음 쟀을 때 15개)', () => {
    const rich = all.filter(({ graphics }) => graphics.some((graphic) => graphic.kind !== 'title'))
    expect(rich.length, `그래픽이 없는 대본: ${all.filter((item) => !rich.includes(item)).map((item) => item.name).join(', ')}`).toBeGreaterThanOrEqual(20)
  })

  it('숫자 설명에 다른 숫자·깨진 조각이 없고, 화면에 들어가는 길이다', () => {
    for (const { name, graphics } of all) {
      for (const graphic of graphics) {
        if (graphic.kind !== 'stat') continue
        const label = String(graphic.label)
        expect(label, `${name}: ${label}`).not.toMatch(/\d/)
        // 숫자를 뺀 자리에 남던 조각들(「원인데」「포인트 내렸」「대를 유지」「정도 가고」, 「円で」「でした」로 시작)
        expect(label, `${name}: ${label}`).not.toMatch(/^(원|만에|대를|포인트|됐|정도|円|でした|になり|dollars?\b)/)
        expect(label, `${name}: ${label}`).not.toMatch(/\s(원|원인데|원은|정도|대를)\s/)
        expect(length(label), `${name}: ${label}`).toBeLessThanOrEqual(scriptOf(label) === 'en' ? 36 : 22)
      }
    }
  })

  it('목록 항목·제목·인용은 화면에서 잘리지 않는 길이다', () => {
    for (const { name, graphics } of all) {
      for (const graphic of graphics) {
        if (graphic.kind === 'list') for (const item of graphic.items as string[]) expect(length(item), `${name}: ${item}`).toBeLessThanOrEqual(scriptOf(item) === 'en' ? 56 : 28)
        if (graphic.kind === 'title') expect(length(String(graphic.text)), name).toBeLessThanOrEqual(scriptOf(String(graphic.text)) === 'en' ? 60 : 30)
        if (graphic.kind === 'bars') for (const item of graphic.items as { label: string }[]) expect(item.label, name).not.toBe('')
      }
    }
  })

  it('무엇이 나오는지 그대로 적어 둔다 — 규칙을 바꾸면 여기서 달라진 것을 보고 좋아졌는지 판단한다', () => {
    expect(Object.fromEntries(all.map(({ name, graphics }) => [name, graphics]))).toMatchSnapshot()
  })
})
