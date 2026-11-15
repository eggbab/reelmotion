import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { LANGS } from '../../langs'
import { LEGAL_DOCS, LEGAL_PAGES, formatDate } from './docs'
import { HELP } from './help'
import type { LegalBlock, LegalDocs } from './types'

/** 원문(한국어)과 번역의 구성을 맞춰 보는 글: 약관 셋 + 도움말 */
const DOCS: [string, LegalDocs][] = [...LEGAL_PAGES.map((page) => [page, LEGAL_DOCS[page]] as [string, LegalDocs]), ['help', HELP]]

const shape = (block: LegalBlock): string => {
  if (typeof block === 'string') return block === 'agencies' ? 'agencies' : 'p'
  if ('list' in block) return `list:${block.list.length}`
  if ('formula' in block) return `formula:${block.formula.length}`
  return `facts:${block.facts.length}`
}

const allText = (block: LegalBlock): string[] => {
  if (typeof block === 'string') return [block]
  if ('list' in block) return block.list
  if ('formula' in block) return block.formula
  return block.facts.flat()
}

describe('약관·정책 글', () => {
  it('번역은 원문(한국어)과 절·문단 구성이 같다', () => {
    for (const [page, docs] of DOCS) {
      const original = docs.ko.sections.map((section) => section.blocks.map(shape).join(','))
      for (const { id } of LANGS) {
        expect(docs[id].sections.map((section) => section.blocks.map(shape).join(',')), `${page}/${id}`).toEqual(original)
      }
    }
  })

  it('자리 표시는 정해진 것만 쓰고, 메일 주소를 글에 직접 적지 않는다(문의 메일은 business.ts 한 곳에서)', () => {
    for (const [, docs] of DOCS) {
      for (const { id } of LANGS) {
        const doc = docs[id]
        const texts = [doc.intro, ...doc.sections.flatMap((section) => section.blocks.flatMap(allText))]
        for (const text of texts) {
          for (const [, token] of text.matchAll(/\{(\w+)\}/g)) expect(['contact', 'terms', 'privacy', 'refund', 'account', 'pricing', 'mcp']).toContain(token)
          expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.\w+/)
        }
      }
    }
  })

  it('검색 결과 설명은 너무 길지 않다', () => {
    for (const [page, docs] of DOCS) for (const { id } of LANGS) expect(docs[id].description.length, `${page}/${id}`).toBeLessThanOrEqual(170)
  })

  it('받아쓰기 한도(10분)는 서버 설정과 같다', () => {
    const compose = readFileSync(new URL('../../../deploy/compose.yml', import.meta.url), 'utf8')
    const app = readFileSync(new URL('../../../server/asr/reelmotion_asr/app.py', import.meta.url), 'utf8')
    expect(compose).toContain('ASR_MAX_SECONDS: "600"')
    expect(app).toContain('max_seconds: float = 600.0')
    expect(LEGAL_DOCS.terms.ko.sections.flatMap((section) => section.blocks.flatMap(allText)).join(' ')).toContain('10분')
  })

  it('날짜를 언어마다 바르게 쓴다', () => {
    expect(formatDate('2026-11-05', 'ko')).toBe('2026년 11월 5일')
    expect(formatDate('2026-11-05', 'ja')).toBe('2026年11月5日')
    expect(formatDate('2026-01-15', 'en')).toBe('January 15, 2026')
  })
})
