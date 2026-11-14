import { describe, expect, it } from 'vitest'
import { CAPTION_STYLES } from './captions/styles'
import { LANGS, MESSAGES, detectLang } from './i18n'

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

describe('MESSAGES', () => {
  it('세 언어가 같은 항목을 빠짐없이 갖는다', () => {
    const keys = Object.keys(MESSAGES.ko).sort()
    for (const { id } of LANGS) expect(Object.keys(MESSAGES[id]).sort()).toEqual(keys)
  })

  it('모든 자막 디자인에 언어마다 이름이 있다', () => {
    for (const { id } of LANGS) {
      for (const style of CAPTION_STYLES) expect(MESSAGES[id].styleNames[style.id]).toBeTruthy()
    }
  })
})
