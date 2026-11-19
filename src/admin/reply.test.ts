import { describe, expect, it } from 'vitest'
import { QUOTE_CHARS, replyLink, replySubject } from './reply'

describe('메일로 답하기', () => {
  it('문의한 분의 언어로 된 제목', () => {
    expect(replySubject(7, 'ko')).toBe('Re: ReelMotion 문의 (#7)')
    expect(replySubject(7, 'ja')).toBe('Re: ReelMotion へのお問い合わせ (#7)')
    expect(replySubject(7, 'xx')).toBe('Re: your message to ReelMotion (#7)')
  })

  it('앞부분만 인용하고, 주소 속 ?&#% 는 바꿔 적는다', () => {
    const link = replyLink('a?b#c@example.com', 3, 'en', `first line\n${'x'.repeat(QUOTE_CHARS)}`)
    const url = new URL(link)
    expect(link.startsWith('mailto:a%3Fb%23c@example.com?')).toBe(true)
    expect(url.searchParams.get('subject')).toBe('Re: your message to ReelMotion (#3)')
    const body = url.searchParams.get('body')!
    expect(body.startsWith('\n\n> first line\n> x')).toBe(true)
    expect(body.endsWith('…')).toBe(true)
    expect([...body].length).toBeLessThan(QUOTE_CHARS + 12)
  })
})
