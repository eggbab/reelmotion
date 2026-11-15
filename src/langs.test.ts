import { describe, expect, it } from 'vitest'
import { detectLang, fill } from './langs'

describe('detectLang', () => {
  it('브라우저가 원하는 순서대로 지원하는 첫 언어를 고른다', () => {
    expect(detectLang(['ko-KR', 'en-US'])).toBe('ko')
    expect(detectLang(['fr-FR', 'ja'])).toBe('ja')
  })

  it('지원하지 않는 언어뿐이면 영어다', () => {
    expect(detectLang(['fr-FR'])).toBe('en')
    expect(detectLang([])).toBe('en')
  })
})

describe('fill', () => {
  it('이름 붙은 자리에 값을 넣고, 모르는 자리는 그대로 둔다', () => {
    expect(fill('{n}% · {x}', { n: 42 })).toBe('42% · {x}')
  })
})
