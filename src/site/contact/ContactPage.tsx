import { Fragment, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { currentUser, useSession } from '../../account/session'
import { useLang } from '../../lang'
import { fill } from '../../langs'
import type { Lang } from '../../langs'
import { BUSINESS } from '../business'
import { Footer, Header } from '../Chrome'
import { SITE_COPY } from '../copy'
import { DOC_HEADS } from '../legal/heads'
import { pageMeta } from '../meta'
import { pagePath } from '../routes'
import { usePageMeta, useSiteBody } from '../usePageMeta'
import { fromPage, sendContact } from './api'
import { CONTACT_COPY } from './copy'
import { CONTACT_KINDS, MAX_BODY, charCount, isContactKind, isEmail } from './rules'
import type { ContactKind } from './rules'

/** 글 속 {help}·{privacy}·{email} 을 링크로 */
function Rich({ text, lang }: { text: string; lang: Lang }) {
  return (
    <>
      {text.split(/(\{\w+\})/).map((part, index) => {
        const token = /^\{(\w+)\}$/.exec(part)?.[1]
        if (token === 'help') {
          return (
            <Link key={index} to={pagePath('help', lang)}>
              {DOC_HEADS.help[lang].title}
            </Link>
          )
        }
        if (token === 'privacy') {
          return (
            <Link key={index} to={pagePath('privacy', lang)}>
              {DOC_HEADS.privacy[lang].title}
            </Link>
          )
        }
        if (token === 'email') {
          // 회사 메일을 아직 정하지 않았으면(business.ts) 자리만 비운다
          return BUSINESS.contactEmail ? (
            <a key={index} href={`mailto:${BUSINESS.contactEmail}`}>
              {BUSINESS.contactEmail}
            </a>
          ) : null
        }
        return <Fragment key={index}>{part}</Fragment>
      })}
    </>
  )
}

type Problem = { field: 'body' | 'email' | null; text: string }

const never = () => () => undefined

/**
 * 문의하기: 종류·내용·답장 받을 메일(선택)을 보내면 서버가 받아 두고 운영자에게 알린다(server/app/inbox.ts).
 * 미리 그린 HTML 에 양식이 들어 있다. ?kind=bug 처럼 종류를 골라 열 수 있고, 로그인했으면 계정 메일을 미리 적는다.
 */
export function ContactPage() {
  const { lang } = useLang()
  const site = SITE_COPY[lang]
  const copy = CONTACT_COPY[lang]
  usePageMeta(pageMeta('contact', lang))
  useSiteBody()
  const location = useLocation()
  const account = currentUser(useSession())
  // ?kind= 로 고른 종류. 미리 그린 HTML 은 늘 「질문」이라, 이어받는 동안에는 서버 값(null)을 쓰고 그 뒤에 주소를 읽는다.
  const queryKind = useSyncExternalStore(
    never,
    () => new URLSearchParams(window.location.search).get('kind'),
    () => null,
  )
  const [picked, setKind] = useState<ContactKind | null>(null)
  const kind: ContactKind = picked ?? (isContactKind(queryKind) ? queryKind : 'question')
  const [body, setBody] = useState('')
  // 손대기 전(null)에는 로그인한 계정의 메일을 보여 준다
  const [typedEmail, setEmail] = useState<string | null>(null)
  const email = typedEmail ?? account?.email ?? ''
  const [trap, setTrap] = useState('')
  const [sending, setSending] = useState(false)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [sent, setSent] = useState<{ email: string | null } | null>(null)
  const sentRef = useRef<HTMLDivElement>(null)
  const ids = useId()
  const id = (name: string) => `${ids}-${name}`

  useEffect(() => {
    if (sent) sentRef.current?.focus()
  }, [sent])

  const count = charCount(body.trim())
  const over = count > MAX_BODY

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (sending) return
    const text = body.trim()
    const address = email.trim()
    if (text === '') return setProblem({ field: 'body', text: copy.errors.empty })
    if (over) return setProblem({ field: 'body', text: fill(copy.errors.tooLong, { max: MAX_BODY.toLocaleString('en-US') }) })
    if (address !== '' && !isEmail(address)) return setProblem({ field: 'email', text: copy.errors.email })
    setProblem(null)
    setSending(true)
    const state = location.state as { from?: unknown } | null
    const page = typeof state?.from === 'string' ? state.from : fromPage(document.referrer, window.location.origin)
    const result = await sendContact({ kind, body: text, email: address, lang, page, website: trap })
    setSending(false)
    if (result === 'ok') {
      setSent({ email: address || null })
      setBody('')
    } else setProblem({ field: null, text: copy.errors[result] })
  }

  const again = () => {
    setSent(null)
    setProblem(null)
  }

  const invalid = (field: 'body' | 'email') => problem?.field === field
  const describedBy = (...names: (string | false)[]) => names.filter(Boolean).join(' ')

  return (
    <div className="site">
      <Header copy={site} />
      <main id="main" className="legal contact">
        <div className="glow glow--top" aria-hidden="true" />
        <article className="legal__inner">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className="legal__intro">
            <Rich text={copy.intro} lang={lang} />
          </p>
          {sent ? (
            <div className="account-card contact-sent" role="status" tabIndex={-1} ref={sentRef}>
              <h2>{copy.sent}</h2>
              <p>{sent.email ? fill(copy.sentReply, { email: sent.email }) : copy.sentNoReply}</p>
              <button type="button" className="btn-ghost" onClick={again}>
                {copy.again}
              </button>
            </div>
          ) : (
            <form className="contact-form" onSubmit={(event) => void submit(event)} noValidate>
              <fieldset className="contact-kinds">
                <legend>{copy.kind}</legend>
                <div className="contact-kinds__list">
                  {CONTACT_KINDS.map((value) => (
                    <label key={value} className="contact-kind">
                      <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} />
                      <span>{copy.kinds[value]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="contact-field">
                <label htmlFor={id('body')}>{copy.body}</label>
                <p id={id('body-hint')} className="contact-hint">
                  {copy.bodyHints[kind]}
                </p>
                <textarea
                  id={id('body')}
                  name="body"
                  rows={8}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  aria-invalid={invalid('body') || over || undefined}
                  aria-describedby={describedBy(id('body-hint'), id('count'), invalid('body') && id('problem'))}
                />
                <p id={id('count')} className={`contact-count${over ? ' is-over' : ''}`}>
                  {fill(copy.count, { n: count.toLocaleString('en-US'), max: MAX_BODY.toLocaleString('en-US') })}
                </p>
              </div>
              <div className="contact-field">
                <label htmlFor={id('email')}>{copy.email}</label>
                <input
                  id={id('email')}
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={invalid('email') || undefined}
                  aria-describedby={describedBy(id('email-hint'), invalid('email') && id('problem'))}
                />
                <p id={id('email-hint')} className="contact-hint">
                  {copy.emailHint}
                </p>
              </div>
              {/* 사람은 보지 못하는 칸 — 채워져 오면 자동 프로그램으로 보고 버린다(server/app/inbox.ts) */}
              <div className="contact-trap" aria-hidden="true">
                <label>
                  {copy.trap}
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" value={trap} onChange={(event) => setTrap(event.target.value)} />
                </label>
              </div>
              {problem && (
                <p id={id('problem')} className="account-note is-error" role="alert">
                  <Rich text={problem.text} lang={lang} />
                </p>
              )}
              <div className="contact-actions">
                <button type="submit" className="btn-mint" disabled={sending}>
                  {sending ? copy.sending : copy.send}
                </button>
              </div>
              <p className="contact-hint">
                <Rich text={copy.privacy} lang={lang} />
              </p>
              {BUSINESS.contactEmail && (
                <p className="contact-hint">
                  <Rich text={copy.mail} lang={lang} />
                </p>
              )}
            </form>
          )}
        </article>
      </main>
      <Footer copy={site} />
    </div>
  )
}
