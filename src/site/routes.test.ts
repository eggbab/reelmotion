import { describe, expect, it } from 'vitest'
import { langOfPath, matchPage, normalizePath, pagePath, renderKey, SITE_PAGES } from './routes'

describe('pagePath', () => {
  it('영어는 앞말 없이, 한국어·일본어는 /ko·/ja 를 붙인다', () => {
    expect(pagePath('home', 'en')).toBe('/')
    expect(pagePath('home', 'ko')).toBe('/ko')
    expect(pagePath('terms', 'en')).toBe('/terms')
    expect(pagePath('privacy', 'ja')).toBe('/ja/privacy')
    expect(pagePath('app', 'ko')).toBe('/ko/app')
  })
})

describe('matchPage', () => {
  it('주소에서 쪽과 언어를 찾는다', () => {
    expect(matchPage('/')).toEqual({ page: 'home', lang: 'en' })
    expect(matchPage('/ko')).toEqual({ page: 'home', lang: 'ko' })
    expect(matchPage('/ja/refund')).toEqual({ page: 'refund', lang: 'ja' })
    expect(matchPage('/app')).toEqual({ page: 'app', lang: 'en' })
    expect(matchPage('/ko/help')).toEqual({ page: 'help', lang: 'ko' })
    expect(matchPage('/licenses')).toEqual({ page: 'licenses', lang: 'en' })
    expect(matchPage('/ja/account')).toEqual({ page: 'account', lang: 'ja' })
  })

  it('끝의 / 와 index.html 은 같은 쪽으로 본다', () => {
    expect(matchPage('/ko/')).toEqual({ page: 'home', lang: 'ko' })
    expect(matchPage('/terms/')).toEqual({ page: 'terms', lang: 'en' })
    expect(matchPage('/ko/index.html')).toEqual({ page: 'home', lang: 'ko' })
    expect(matchPage('/index.html')).toEqual({ page: 'home', lang: 'en' })
  })

  it('없는 주소는 null', () => {
    expect(matchPage('/en')).toBeNull()
    expect(matchPage('/home')).toBeNull()
    expect(matchPage('/ko/nope')).toBeNull()
    expect(matchPage('/terms/extra')).toBeNull()
    expect(matchPage('/KO')).toBeNull()
  })

  it('모든 쪽의 주소를 다시 읽으면 같은 쪽이 나온다', () => {
    for (const { page, lang, path } of SITE_PAGES) expect(matchPage(path)).toEqual({ page, lang })
  })
})

describe('langOfPath / renderKey', () => {
  it('없는 주소의 언어는 앞말을 따르고, 앞말이 없으면 영어', () => {
    expect(langOfPath('/ko/nope')).toBe('ko')
    expect(langOfPath('/ja')).toBe('ja')
    expect(langOfPath('/nope')).toBe('en')
    expect(langOfPath('/kor/nope')).toBe('en')
  })

  it('있는 쪽은 바른 주소, 없는 주소는 언어별 404', () => {
    expect(renderKey('/ko/')).toBe('/ko')
    expect(renderKey('/ko/nope')).toBe('404:ko')
    expect(renderKey('/x/y')).toBe('404:en')
  })

  it('normalizePath', () => {
    expect(normalizePath('')).toBe('/')
    expect(normalizePath('//')).toBe('/')
    expect(normalizePath('/ja/terms//')).toBe('/ja/terms')
  })
})

describe('SITE_PAGES', () => {
  it('쪽 여덟 × 언어 셋, 주소가 겹치지 않는다', () => {
    expect(SITE_PAGES).toHaveLength(24)
    expect(new Set(SITE_PAGES.map((item) => item.path)).size).toBe(24)
  })
})
