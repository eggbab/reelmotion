import { describe, expect, it } from 'vitest'
import { openDb } from './db'
import { CONTACT_KINDS, KEEP_DAYS, MAX_BODY, contactAlert, createInbox, parseContact, pruneContacts } from './inbox'

describe('문의 읽기', () => {
  it('바른 문의', () => {
    expect(parseContact({ kind: 'bug', body: '  내보내기가 멈춰요\r\n두 번째 줄  ', email: ' me@example.com ', lang: 'ko', page: '/ko/app?project=x#y' })).toEqual({
      kind: 'bug',
      body: '내보내기가 멈춰요\n두 번째 줄',
      email: 'me@example.com',
      lang: 'ko',
      page: '/ko/app',
    })
    expect(parseContact({ kind: 'idea', body: 'More styles please', email: '', lang: 'de', page: 'https://evil.example/' })).toEqual({ kind: 'idea', body: 'More styles please', email: null, lang: 'en', page: '' })
  })

  it('틀린 것은 받지 않는다', () => {
    expect(parseContact(null)).toBeNull()
    expect(parseContact({ kind: 'spam', body: 'x' })).toBeNull()
    expect(parseContact({ kind: 'question', body: '   ' })).toBeNull()
    expect(parseContact({ kind: 'question', body: 'x'.repeat(MAX_BODY + 1) })).toBeNull()
    expect(parseContact({ kind: 'question', body: 'hi', email: 'not an email' })).toBeNull()
    expect(parseContact({ kind: 'question', body: 'hi', email: 'a@b.c\r\nBcc: x@y.z' })).toBeNull()
  })

  it('보이지 않는 조절 글자는 지우고 줄바꿈·탭은 둔다', () => {
    expect(parseContact({ kind: 'question', body: 'a\u0000b\u0007\tc\nd\u001b' })).toMatchObject({ body: 'ab\tc\nd' })
  })

  it('숨긴 칸을 채운 것은 자동 프로그램', () => {
    expect(parseContact({ kind: 'question', body: 'hi', website: 'http://spam' })).toBe('bot')
  })

  it('종류 넷', () => {
    expect([...CONTACT_KINDS]).toEqual(['question', 'bug', 'idea', 'billing'])
  })
})

describe('문의함', () => {
  it('넣고, 최근 것부터 보고, 답함 표시·되돌리기, 3년 지난 것은 지운다', () => {
    let now = 1_000_000
    const inbox = createInbox({ db: openDb(':memory:'), now: () => now })
    const first = inbox.add({ kind: 'question', body: 'a', email: null, lang: 'en', page: '/' })
    now += 1000
    const second = inbox.add({ kind: 'bug', body: 'b', email: 'x@y.co', lang: 'ko', page: '/ko/app' })
    expect(inbox.list().map((row) => row.id)).toEqual([second, first])
    expect(inbox.open()).toBe(2)
    expect(inbox.today()).toBe(2)
    expect(inbox.setDone(first, true)).toBe(true)
    expect(inbox.open()).toBe(1)
    expect(inbox.list().find((row) => row.id === first)?.doneAt).toBe(now)
    expect(inbox.setDone(first, false)).toBe(true)
    expect(inbox.setDone(999, true)).toBe(false)
    now = 1_000_000 + KEEP_DAYS * 24 * 60 * 60 * 1000 + 500
    // 3년이 갓 지난 첫 것만
    expect(inbox.prune()).toBe(1)
    expect(inbox.list().map((row) => row.id)).toEqual([second])
    expect(pruneContacts(openDb(':memory:'), now)).toBe(0)
    expect(inbox.remove(second)).toBe(true)
    expect(inbox.remove(second)).toBe(false)
    expect(inbox.list()).toEqual([])
  })

  it('알림 메일에는 문의한 분의 정보가 없다(번호·종류·메일이 있는지만)', () => {
    const alert = contactAlert({ id: 7, kind: 'billing', hasEmail: true, adminUrl: 'https://reelmotion.test/ko/admin', last: false })
    expect(alert.subject).toBe('[ReelMotion] 새 문의 #7 · 요금제·결제')
    expect(alert.text).toContain('https://reelmotion.test/ko/admin')
    expect(alert.text).toContain('답장 받을 메일 있음')
    expect(alert.text).not.toContain('알림 메일을 20통')
    expect(contactAlert({ id: 8, kind: 'bug', hasEmail: false, adminUrl: '/ko/admin', last: true }).text).toContain('알림 메일을 20통 보내서')
  })
})
