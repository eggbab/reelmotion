import { Fragment } from 'react'
import { Link } from 'react-router'
import { useLang } from '../../lang'
import type { Lang } from '../../langs'
import { BUSINESS } from '../business'
import { Footer, Header } from '../Chrome'
import { SITE_COPY } from '../copy'
import { pageMeta } from '../meta'
import { pagePath } from '../routes'
import { usePageMeta, useSiteBody } from '../usePageMeta'
import { AGENCIES, LEGAL_DOCS, LEGAL_UI, formatDate } from './docs'
import { LEGAL_EFFECTIVE } from './types'
import type { LegalBlock, LegalPageId } from './types'

function Contact({ lang }: { lang: Lang }) {
  if (BUSINESS.contactEmail) return <a href={`mailto:${BUSINESS.contactEmail}`}>{BUSINESS.contactEmail}</a>
  return <span className="legal__pending">{LEGAL_UI[lang].contactPending}</span>
}

/** 문장 안의 {contact}·{terms}·{privacy}·{refund} 를 링크로 바꾼다. */
function Rich({ text, lang }: { text: string; lang: Lang }) {
  return (
    <>
      {text.split(/(\{\w+\})/).map((part, index) => {
        const token = /^\{(\w+)\}$/.exec(part)?.[1]
        if (token === 'contact') return <Contact key={index} lang={lang} />
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

/** 이용약관·개인정보처리방침·환불 규정. 글은 terms.ts·privacy.ts·refund.ts 에 있고 여기서는 그리기만 한다. */
export function LegalPage({ page }: { page: LegalPageId }) {
  const { lang } = useLang()
  const copy = SITE_COPY[lang]
  const doc = LEGAL_DOCS[page][lang]
  const ui = LEGAL_UI[lang]
  usePageMeta(pageMeta(page, lang))
  useSiteBody()
  return (
    <div className="site">
      <Header copy={copy} />
      <main id="main" className="legal">
        <div className="glow glow--top" aria-hidden="true" />
        <article className="legal__inner">
          <p className="eyebrow">{ui.eyebrow}</p>
          <h1>{doc.title}</h1>
          <p className="legal__meta">
            {ui.effective} <time dateTime={LEGAL_EFFECTIVE}>{formatDate(LEGAL_EFFECTIVE, lang)}</time>
          </p>
          {lang !== 'ko' && (
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
            <section key={section.title} id={`s${index + 1}`} aria-labelledby={`s${index + 1}-title`}>
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
