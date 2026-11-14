import { describe, expect, it } from 'vitest'
import { LANGS } from '../i18n'
import { SITE_COPY } from './copy'

/** 값은 버리고 모양(항목 이름과 목록 길이)만 남긴다. */
function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, shape(v)]))
  }
  return typeof value
}

describe('SITE_COPY', () => {
  it('세 언어가 같은 항목과 같은 개수의 목록을 갖는다', () => {
    for (const { id } of LANGS) expect(shape(SITE_COPY[id])).toEqual(shape(SITE_COPY.ko))
  })

  it('빈 글이 없다', () => {
    const walk = (value: unknown): string[] =>
      typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(walk) : []
    for (const { id } of LANGS) expect(walk(SITE_COPY[id]).every((text) => text.trim().length > 0)).toBe(true)
  })

  it('쓰는 순서는 네 단계다', () => {
    for (const { id } of LANGS) expect(SITE_COPY[id].how.steps).toHaveLength(4)
  })
})
