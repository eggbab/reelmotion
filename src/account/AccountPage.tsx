import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useLang } from '../lang'
import { fill } from '../langs'
import { Footer, Header } from '../site/Chrome'
import { SITE_COPY } from '../site/copy'
import { formatDate } from '../site/legal/docs'
import { pageMeta } from '../site/meta'
import type { PlanId } from '../site/plans'
import { pagePath } from '../site/routes'
import { usePageMeta, useSiteBody } from '../site/usePageMeta'
import { deleteAccount, devLogin, loginUrl, logout } from './api'
import type { Account, Me } from './api'
import { ACCOUNT_COPY } from './copy'
import type { AccountCopy } from './copy'
import { refreshSession, useSession } from './session'

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10)

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

function LoginCard({ me, copy, lang, result }: { me: Me; copy: AccountCopy; lang: 'en' | 'ko' | 'ja'; result: string | null }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const submitDev = async (event: FormEvent) => {
    event.preventDefault()
    if (await devLogin(email, name)) await refreshSession()
  }
  return (
    <section className="account-card">
      <h2>{copy.loginTitle}</h2>
      <p>{copy.loginBody}</p>
      {result === 'failed' && <p className="account-note is-error">{copy.failed}</p>}
      {result === 'cancelled' && <p className="account-note">{copy.cancelled}</p>}
      {me.login.google ? (
        <a className="btn-google" href={loginUrl(pagePath('account', lang))}>
          <GoogleMark />
          {copy.google}
        </a>
      ) : (
        !me.login.dev && <p className="account-note">{copy.notReady}</p>
      )}
      {me.login.dev && (
        <form className="account-dev" onSubmit={(event) => void submitDev(event)}>
          <p className="label">{copy.devTitle}</p>
          <label>
            {copy.devEmail}
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            {copy.devName}
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <button type="submit" className="btn-ghost">
            {copy.devButton}
          </button>
        </form>
      )}
    </section>
  )
}

function Profile({ user, copy, lang, onDeleted }: { user: Account; copy: AccountCopy; lang: 'en' | 'ko' | 'ja'; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const site = SITE_COPY[lang]
  const planName = site.pricing.names[user.plan as PlanId] ?? user.plan
  const remove = async () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    if (await deleteAccount()) {
      onDeleted()
      await refreshSession()
    }
  }
  return (
    <>
      <section className="account-card">
        <h2>{copy.profile}</h2>
        <dl className="account-facts">
          <div>
            <dt>{copy.name}</dt>
            <dd>{user.name || '—'}</dd>
          </div>
          <div>
            <dt>{copy.email}</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>{copy.joined}</dt>
            <dd>{formatDate(isoDay(user.createdAt), lang)}</dd>
          </div>
        </dl>
      </section>
      <section className="account-card">
        <h2>{copy.plan}</h2>
        <p className="account-plan">
          <strong>{planName}</strong>
          {user.planUntil !== null && <span> · {fill(copy.planUntil, { date: formatDate(isoDay(user.planUntil), lang) })}</span>}
        </p>
        <p>{copy.planBeta}</p>
        <div className="account-actions">
          <Link to={pagePath('app', lang)} className="btn-mint">
            {copy.openEditor}
          </Link>
          <button
            type="button"
            className="btn-ghost"
            onClick={() =>
              void (async () => {
                await logout()
                await refreshSession()
              })()
            }
          >
            {copy.logout}
          </button>
        </div>
      </section>
      <section className="account-card is-danger">
        <h2>{copy.danger}</h2>
        <p>{copy.dangerBody}</p>
        <button type="button" className="btn-danger" onClick={() => void remove()}>
          {confirming ? copy.deleteConfirm : copy.deleteButton}
        </button>
      </section>
    </>
  )
}

/** 내 계정: 로그인(구글), 계정 정보, 요금제, 로그아웃, 탈퇴. 사람마다 달라 미리 그리지 않는다(routes.ts). */
export function AccountPage() {
  const { lang } = useLang()
  const site = SITE_COPY[lang]
  const copy = ACCOUNT_COPY[lang]
  const session = useSession()
  const [params] = useSearchParams()
  usePageMeta(pageMeta('account', lang))
  useSiteBody()
  const [deleted, setDeleted] = useState(false)
  const user = session.status === 'ready' ? session.me.user : null
  return (
    <div className="site">
      <Header copy={site} />
      <main id="main" className="legal account">
        <div className="glow glow--top" aria-hidden="true" />
        <div className="legal__inner">
          <p className="eyebrow">ReelMotion</p>
          <h1>{copy.title}</h1>
          {deleted && !user && <p className="account-note">{copy.deleted}</p>}
          {session.status === 'loading' && <p className="account-note">{copy.loading}</p>}
          {session.status === 'off' && <p className="account-note">{copy.off}</p>}
          {session.status === 'ready' &&
            (user ? <Profile user={user} copy={copy} lang={lang} onDeleted={() => setDeleted(true)} /> : <LoginCard me={session.me} copy={copy} lang={lang} result={params.get('login')} />)}
        </div>
      </main>
      <Footer copy={site} />
    </div>
  )
}
