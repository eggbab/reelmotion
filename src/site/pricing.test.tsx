import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { LangProvider } from '../lang'
import type { Lang } from '../langs'
import { SITE_COPY } from './copy'
import { PLANS } from './plans'
import type { Plan } from './plans'
import { Pricing } from './Sections'

const render = (lang: Lang, plans: Plan[]) =>
  renderToString(
    <StaticRouter location={lang === 'en' ? '/' : `/${lang}`}>
      <LangProvider lang={lang} page="home">
        <Pricing copy={SITE_COPY[lang]} plans={plans} />
      </LangProvider>
    </StaticRouter>,
  )

describe('요금표 단추', () => {
  it('지금은 무료만 편집기로 가고, 유료는 「곧 나와요」', () => {
    const html = render('ko', PLANS)
    expect(html).toContain('href="/ko/app"')
    expect(html).not.toContain('/ko/account?plan=')
    expect(html.match(/곧 나와요/g)).toHaveLength(2)
  })

  it('결제를 열면(available) 유료 요금제는 내 계정에서 그 요금제를 고르게 한다', () => {
    const open = PLANS.map((plan) => ({ ...plan, available: true }))
    const ko = render('ko', open)
    expect(ko).toContain('href="/ko/account?plan=creator"')
    expect(ko).toContain('href="/ko/account?plan=pro"')
    expect(ko).toContain('크리에이터 시작하기')
    expect(render('en', open)).toContain('href="/account?plan=pro"')
    expect(render('ja', open)).toContain('href="/ja/account?plan=creator"')
  })
})
