import { describe, expect, it } from 'vitest'
import { render } from './entry-server'
import { prerenderPlan } from './seo/template'

describe('빌드 때 미리 그리기', () => {
  it('미리 그리는 쪽은 모두 오류 없이 그려지고 제목(h1)이 하나 있다', () => {
    for (const item of prerenderPlan().filter((entry) => entry.key !== null)) {
      const html = render(item.url)
      expect(html.match(/<h1[\s>]/g), item.url).toHaveLength(1)
    }
  })

  it('언어는 주소 앞말을 따른다', () => {
    expect(render('/ko/terms')).toContain('이용약관')
    expect(render('/ja/privacy')).toContain('プライバシーポリシー')
    expect(render('/refund')).toContain('Refund Policy')
    expect(render('/ko')).toContain('에 모션을.')
  })

  it('없는 주소는 그 언어의 404 화면', () => {
    expect(render('/ko/404')).toContain('없는 페이지예요')
    expect(render('/ja/nope/deeper')).toContain('このページは見つかりません')
    expect(render('/nope')).toContain('This page doesn’t exist')
  })

  it('링크는 지금 언어의 주소로 간다(바닥글 약관·편집기)', () => {
    const html = render('/ko/refund')
    expect(html).toContain('href="/ko/privacy"')
    expect(html).toContain('href="/ko/app"')
    expect(html).toContain('href="/ko#pricing"')
    expect(render('/')).toContain('href="/terms"')
  })

  it('번역본은 한국어 원문으로 가는 링크를 단다', () => {
    expect(render('/ja/terms')).toContain('href="/ko/terms"')
    expect(render('/ja/terms')).toContain('韓国語の原文を読む')
    expect(render('/ko/terms')).not.toContain('Read the Korean original')
  })
})
