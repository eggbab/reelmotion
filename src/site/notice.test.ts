import { describe, expect, it } from 'vitest'
import { isClosed, pickNoticeText } from './notice'
import type { Notice } from './notice'

const notice: Notice = { version: 1794736000000, level: 'warning', text: { ko: '11월 20일 점검', en: '', ja: '11月20日メンテナンス' } }

describe('공지', () => {
  it('지금 언어 → 영어 → 한국어 → 일본어 순으로 비어 있지 않은 글', () => {
    expect(pickNoticeText(notice, 'ja')).toBe('11月20日メンテナンス')
    expect(pickNoticeText(notice, 'ko')).toBe('11월 20일 점검')
    expect(pickNoticeText(notice, 'en')).toBe('11월 20일 점검')
    expect(pickNoticeText({ ...notice, text: { ko: '', en: '', ja: '' } }, 'ko')).toBe('')
  })

  it('닫은 판과 같을 때만 숨긴다(다시 저장하면 다시 보임)', () => {
    expect(isClosed(notice, String(notice.version))).toBe(true)
    expect(isClosed(notice, '1794735000000')).toBe(false)
    expect(isClosed(notice, null)).toBe(false)
  })
})
