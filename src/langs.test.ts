import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { LANG_STORAGE_KEY, detectLang, fill } from './langs'

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

describe('index.html 의 첫 화면 옮기기', () => {
  // 첫 화면(/)과 편집기(/app)로 들어오면, 고른 언어(없으면 브라우저 언어)가 한국어·일본어일 때 그 주소로 옮긴다.
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const source = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]).find((code) => code.includes('location.replace'))

  const run = (pathname: string, saved: string | null, languages: string[], extra: { search?: string; hash?: string; storageThrows?: boolean } = {}) => {
    let target: string | null = null
    const location = { pathname, search: extra.search ?? '', hash: extra.hash ?? '', replace: (url: string) => (target = url) }
    const localStorage = {
      getItem: (key: string) => {
        if (extra.storageThrows) throw new Error('blocked')
        return key === LANG_STORAGE_KEY ? saved : null
      },
    }
    const navigator = { languages, language: languages[0] ?? '' }
    new Function('location', 'localStorage', 'navigator', source!)(location, localStorage, navigator)
    return target
  }

  it('스크립트가 있고 기억 이름이 같다', () => {
    expect(source).toBeDefined()
    expect(source).toContain(`'${LANG_STORAGE_KEY}'`)
  })

  it('고른 언어가 없으면 브라우저 언어를 따른다', () => {
    expect(run('/', null, ['ko-KR', 'en'])).toBe('/ko')
    expect(run('/', null, ['fr', 'ja-JP'])).toBe('/ja')
    expect(run('/', null, ['en-US', 'ko'])).toBeNull()
    expect(run('/', null, [])).toBeNull()
  })

  it('고른 언어가 브라우저 언어보다 먼저다', () => {
    expect(run('/', 'en', ['ko-KR'])).toBeNull()
    expect(run('/', 'ja', ['en-US'])).toBe('/ja')
  })

  it('편집기 주소는 붙은 말(?script=)과 # 을 지킨다', () => {
    expect(run('/app', null, ['ko'], { search: '?script=hi', hash: '#x' })).toBe('/ko/app?script=hi#x')
    expect(run('/app/', 'ja', [])).toBe('/ja/app')
    expect(run('/', null, ['ko'], { hash: '#pricing' })).toBe('/ko#pricing')
  })

  it('다른 쪽은 그대로 둔다', () => {
    expect(run('/terms', 'ko', ['ko'])).toBeNull()
    expect(run('/ko', 'ja', ['ja'])).toBeNull()
    expect(run('/nope', 'ko', ['ko'])).toBeNull()
  })

  it('저장소를 못 써도 브라우저 언어로 옮긴다', () => {
    expect(run('/', null, ['ja'], { storageThrows: true })).toBe('/ja')
  })
})
