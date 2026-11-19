import { Fragment, useSyncExternalStore } from 'react'
import { Link } from 'react-router'
import { useLang } from '../../lang'
import type { Lang } from '../../langs'
import { BUSINESS } from '../business'
import { CONTACT_COPY } from '../contact/copy'
import { Footer, Header } from '../Chrome'
import { SITE_COPY } from '../copy'
import { pageMeta } from '../meta'
import { pagePath } from '../routes'
import { usePageMeta, useSiteBody } from '../usePageMeta'
import { AGENCIES, LEGAL_DOCS, LEGAL_UI, formatDate } from './docs'
import { HELP, HELP_EYEBROW } from './help'
import { LEGAL_EFFECTIVE } from './types'
import type { LegalBlock, LegalPageId } from './types'

function Contact({ lang }: { lang: Lang }) {
  if (BUSINESS.contactEmail) return <a href={`mailto:${BUSINESS.contactEmail}`}>{BUSINESS.contactEmail}</a>
  return <span className="legal__pending">{LEGAL_UI[lang].contactPending}</span>
}

const never = () => () => undefined

/**
 * Claude·ChatGPT 커넥터 주소({mcp}). 미리 그릴 때는 사이트 주소를 모르므로 /mcp 만 적고,
 * 브라우저에서 지금 사이트 주소를 붙인다(https://도메인/mcp) — 그대로 복사해 쓸 수 있게.
 */
function McpAddress() {
  const origin = useSyncExternalStore(
    never,
    () => window.location.origin,
    () => '',
  )
  return <code className="legal__code">{`${origin}/mcp`}</code>
}

/** 문장 안의 {contact}(메일)·{inquiry}(문의하기 쪽)·{terms}·{privacy}·{refund}·{account}·{pricing}·{mcp} 를 링크(주소)로 바꾼다. */
function Rich({ text, lang }: { text: string; lang: Lang }) {
  return (
    <>
      {text.split(/(\{\w+\})/).map((part, index) => {
        const token = /^\{(\w+)\}$/.exec(part)?.[1]
        if (token === 'contact') return <Contact key={index} lang={lang} />
        if (token === 'mcp') return <McpAddress key={index} />
        if (token === 'inquiry') {
          return (
            <Link key={index} to={pagePath('contact', lang)}>
              {CONTACT_COPY[lang].title}
            </Link>
          )
        }
        if (token === 'account') {
          return (
            <Link key={index} to={pagePath('account', lang)}>
              {LEGAL_UI[lang].account}
            </Link>
          )
        }
        // 소개 페이지의 구역으로 가는 링크는 바닥글처럼 보통 링크로 — 브라우저가 그 구역까지 내려간다.
        if (token === 'pricing') {
          return (
            <a key={index} href={`${pagePath('home', lang)}#pricing`}>
              {LEGAL_UI[lang].pricing}
            </a>
          )
        }
        if (token === 'terms' || token === 'privacy' || token === 'refund') {
          return (
            <Link key={index} to={pagePath(token, lang)}>
              {LEGAL_DOCS[token][lang].title}
            </Link>
          )
        }
        return <Fragment key={index}>{part}</Fragment>
      })}
    </>
  )
}

/** 「이름: 설명」 꼴의 목록 줄은 이름을 굵게 */
function Item({ text, lang }: { text: string; lang: Lang }) {
  const at = text.indexOf(': ')
  if (at <= 0 || at > 24) return <Rich text={text} lang={lang} />
  return (
    <>
      <strong>{text.slice(0, at)}</strong> <Rich text={text.slice(at + 2)} lang={lang} />
    </>
  )
}

function Block({ block, lang }: { block: LegalBlock; lang: Lang }) {
  if (block === 'agencies') {
    return (
      <ul className="legal__agencies">
        {AGENCIES.map((agency) => (
          <li key={agency.site}>
            <strong>{agency.name[lang]}</strong>
            <span>
              <a href={`https://${agency.site}`} target="_blank" rel="noreferrer">
                {agency.site}
              </a>
              <span aria-hidden="true"> · </span>
              <span className="nowrap">{agency.phone[lang]}</span>
            </span>
          </li>
        ))}
      </ul>
    )
  }
  if (typeof block === 'string') {
    return (
      <p>
        <Rich text={block} lang={lang} />
      </p>
    )
  }
  if ('list' in block) {
    return (
      <ul>
        {block.list.map((item) => (
          <li key={item}>
            <Item text={item} lang={lang} />
          </li>
        ))}
      </ul>
    )
  }
  if ('formula' in block) {
    return (
      <div className="legal__formula">
        {block.formula.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    )
  }
  return (
    <dl className="legal__facts">
      {block.facts.map(([name, value]) => (
        <div key={name}>
          <dt>{name}</dt>
          <dd>
            <Rich text={value} lang={lang} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** 이용약관·개인정보처리방침·환불 규정과 도움말. 글은 terms.ts·privacy.ts·refund.ts·help.ts 에 있고 여기서는 그리기만 한다. */
export function LegalPage({ page }: { page: LegalPageId | 'help' }) {
  const { lang } = useLang()
  const copy = SITE_COPY[lang]
  const legal = page !== 'help'
  const doc = legal ? LEGAL_DOCS[page][lang] : HELP[lang]
  const ui = LEGAL_UI[lang]
  usePageMeta(pageMeta(page, lang))
  useSiteBody()
  return (
    <div className="site">
      <Header copy={copy} />
      <main id="main" className="legal">
        <div className="glow glow--top" aria-hidden="true" />
        <article className="legal__inner">
          <p className="eyebrow">{legal ? ui.eyebrow : HELP_EYEBROW[lang]}</p>
          <h1>{doc.title}</h1>
          {legal && (
            <p className="legal__meta">
              {ui.effective} <time dateTime={LEGAL_EFFECTIVE}>{formatDate(LEGAL_EFFECTIVE, lang)}</time>
            </p>
          )}
          {legal && lang !== 'ko' && (
            <p className="legal__note">
              {ui.translation}{' '}
              <Link to={pagePath(page, 'ko')} hrefLang="ko" lang="ko">
                {ui.original} →
              </Link>
            </p>
          )}
          <p className="legal__intro">
            <Rich text={doc.intro} lang={lang} />
          </p>
          {doc.sections.map((section, index) => (
            <section key={section.title} id={section.id ?? `s${index + 1}`} aria-labelledby={`s${index + 1}-title`}>
              <h2 id={`s${index + 1}-title`}>
                <span className="legal__num">{index + 1}.</span> {section.title}
              </h2>
              {section.blocks.map((block, blockIndex) => (
                <Block key={blockIndex} block={block} lang={lang} />
              ))}
            </section>
          ))}
        </article>
      </main>
      <Footer copy={copy} />
    </div>
  )
}
