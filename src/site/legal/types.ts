import type { Lang } from '../../langs'

export type LegalPageId = 'terms' | 'privacy' | 'refund'

/**
 * 글 한 덩이. 문자열은 문단, list 는 점 목록, formula 는 식 상자, facts 는 「이름 — 값」 표,
 * 'agencies' 는 개인정보 침해 신고 기관 목록(LegalPage 가 그린다).
 * 문장 안의 {contact}·{terms}·{privacy}·{refund} 자리에는 문의 메일과 다른 규정의 링크가 들어간다.
 */
export type LegalBlock = string | { list: string[] } | { formula: string[] } | { facts: [string, string][] } | 'agencies'

/** id 를 주면 그 이름으로 바로 갈 수 있다(/help#install). 없으면 번호(s1, s2 …). */
export type LegalSection = { title: string; blocks: LegalBlock[]; id?: string }

export type LegalDoc = {
  title: string
  /** 검색 결과에 보이는 설명(160자 안팎) */
  description: string
  intro: string
  sections: LegalSection[]
}

export type LegalDocs = Record<Lang, LegalDoc>

/**
 * 세 규정의 시행일. 글을 바꾸면 날짜도 바꾸고, 바꾼 내용을 시행 7일 전(이용자에게 불리하면 30일 전)에 알린다.
 * 서비스를 정식으로 열 때 다시 확인한다(docs/service-scope.md).
 */
export const LEGAL_EFFECTIVE = '2026-11-15'
