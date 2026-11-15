import { describe, expect, it } from 'vitest'
import { BUSINESS, render } from './entry-server'
import { prerenderPlan } from './seo/template'

describe('빌드 때 미리 그리기', () => {
  it('미리 그리는 쪽은 모두 오류 없이 그려지고 제목(h1)이 하나 있다', () => {
    for (const item of prerenderPlan().filter((entry) => entry.key !== null)) {
      const html = render(item.url)
      expect(html.match(/<h1[\s>]/g), item.url).toHaveLength(1)
    }
  })

  it('도움말과 오픈소스 라이선스 쪽', () => {
    expect(render('/ko/help')).toContain('그래픽 만들기')
    expect(render('/ja/help')).toContain('書き出し')
    const licenses = render('/licenses')
    expect(licenses).toContain('Mediabunny')
    expect(licenses).toContain('href="/licenses.txt"')
    expect(licenses).toContain('SIL Open Font License 1.1')
    // 도움말의 계정·요금제 절은 내 계정과 요금 안내로 잇는다.
    expect(render('/ko/help')).toContain('href="/ko/account"')
    expect(render('/ko/help')).toContain('href="/ko#pricing"')
    expect(render('/help')).toContain('href="/#pricing"')
    expect(render('/ja/help')).toContain('href="/ja/account"')
    expect(render('/ko')).toContain('href="/ko/help"')
    expect(render('/ko')).toContain('href="/ko/licenses"')
  })

  it('언어는 주소 앞말을 따른다', () => {
    expect(render('/ko/terms')).toContain('이용약관')
    expect(render('/ja/privacy')).toContain('プライバシーポリシー')
    expect(render('/refund')).toContain('Refund Policy')
    expect(render('/ko')).toContain('에 모션을.')
    // 자주 묻는 질문: 계정·말로 고치기·무료 요금제
    expect(render('/ko')).toContain('계정이 있어야 하나요?')
    expect(render('/')).toContain('How does chat editing work?')
    expect(render('/ja')).toContain('無料プランはどうなりますか?')
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

  it('문의 메일이 있으면 약관·정책과 바닥글에 메일 링크, 없으면 「정식 공개 전」 자리 표시', () => {
    for (const path of ['/ko/terms', '/privacy', '/ja/refund']) {
      const html = render(path)
      if (BUSINESS.contactEmail) expect(html).toContain(`href="mailto:${BUSINESS.contactEmail}"`)
      else expect(html).toContain('legal__pending')
    }
  })
})
