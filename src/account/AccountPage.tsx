import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useLang } from '../lang'
import { fill } from '../langs'
import type { Lang } from '../langs'
import { Footer, Header } from '../site/Chrome'
import { SITE_COPY } from '../site/copy'
import { planOf } from '../site/entitlements'
import { formatDate } from '../site/legal/docs'
import { pageMeta } from '../site/meta'
import { formatWon, PLANS } from '../site/plans'
import type { PlanId } from '../site/plans'
import { pagePath, safeNext } from '../site/routes'
import { usePageMeta, useSiteBody } from '../site/usePageMeta'
import { deleteAccount, devLogin, loginUrl, logout, startCheckout } from './api'
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

/** next: 로그인한 뒤 돌아갈 곳(편집기에서 왔으면 그 작업, 아니면 이 쪽 그대로). */
function LoginCard({ me, copy, next, toWork, result }: { me: Me; copy: AccountCopy; next: string; toWork: boolean; result: string | null }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const navigate = useNavigate()
  const submitDev = async (event: FormEvent) => {
    event.preventDefault()
    if (!(await devLogin(email, name))) return
    await refreshSession()
    if (toWork) navigate(next)
  }
  return (
    <section className="account-card">
      <h2>{copy.loginTitle}</h2>
      <p>{copy.loginBody}</p>
      {toWork && <p>{copy.backToWork}</p>}
      {result === 'failed' && <p className="account-note is-error">{copy.failed}</p>}
      {result === 'cancelled' && <p className="account-note">{copy.cancelled}</p>}
      {me.login.google ? (
        <a className="btn-google" href={loginUrl(next)}>
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

const PAID_PLANS = PLANS.filter((plan) => plan.monthlyWon > 0)

/** 요금제: 지금 요금제와 이번 달 사용량, 유료 요금제로 바꾸기(카드 결제 — 결제사를 붙이기 전에는 「곧 열려요」). */
function PlanCard({ me, user, copy, lang, chosen, checkoutDone }: { me: Me; user: Account; copy: AccountCopy; lang: Lang; chosen: string | null; checkoutDone: boolean }) {
  const pricing = SITE_COPY[lang].pricing
  const plan = planOf(user.plan)
  const used = me.usage?.exports ?? 0
  const [busy, setBusy] = useState<PlanId | null>(null)
  const [failed, setFailed] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const { hash } = useLocation()
  useEffect(() => {
    if (hash === '#plans' || chosen) ref.current?.scrollIntoView({ block: 'start' })
  }, [hash, chosen])
  // 결제사에서 돌아왔으면 결제 확인(알림)이 늦게 올 수 있어 조금 뒤 한 번 더 묻는다.
  useEffect(() => {
    if (!checkoutDone) return
    const timer = window.setTimeout(() => void refreshSession(), 4000)
    return () => window.clearTimeout(timer)
  }, [checkoutDone])

  const checkout = async (id: PlanId) => {
    setBusy(id)
    setFailed(false)
    const url = await startCheckout(id, `${pagePath('account', lang)}?checkout=done`)
    if (url) {
      window.location.assign(url)
      return
    }
    setBusy(null)
    setFailed(true)
  }

  return (
    <section className="account-card" id="plans" ref={ref}>
      <h2>{copy.plan}</h2>
      {checkoutDone && <p className="account-note">{copy.checkoutDone}</p>}
      <p className="account-plan">
        <strong>{pricing.names[plan.id]}</strong>
        {user.planUntil !== null && plan.id !== 'free' && <span> · {fill(copy.planUntil, { date: formatDate(isoDay(user.planUntil), lang) })}</span>}
      </p>
      {/* 큰 요금제에서 쓴 뒤 무료로 돌아오면 쓴 수가 한도보다 클 수 있다 — 「다 썼다」로 보이게 한도에서 멈춘다. */}
      <p className="account-usage">{me.billing.enforced ? fill(copy.usage, { used: Math.min(used, plan.exportsPerMonth), limit: plan.exportsPerMonth }) : fill(copy.usageBeta, { used })}</p>
      {!me.billing.enforced && <p>{copy.planBeta}</p>}
      <ul className="account-plans">
        {PAID_PLANS.map((item) => {
          const name = pricing.names[item.id]
          return (
            <li key={item.id} className={chosen === item.id ? 'is-chosen' : undefined}>
              <p className="account-plans__name">
                <strong>{name}</strong>
                <span>
                  {formatWon(item.monthlyWon)} {pricing.perMonth}
                </span>
              </p>
              <p className="account-plans__limits">
                {fill(pricing.maxMinutes, { n: item.maxMinutes })} · {fill(pricing.exports, { n: item.exportsPerMonth })} · {item.watermark ? pricing.watermark : pricing.noWatermark}
              </p>
              {plan.id === item.id ? (
                <span className="account-plans__current">{copy.current}</span>
              ) : me.billing.connected ? (
                <button type="button" className="btn-mint" disabled={busy !== null} onClick={() => void checkout(item.id)}>
                  {fill(copy.choose, { plan: name })}
                </button>
              ) : (
                <span className="account-plans__soon">{pricing.soon}</span>
              )}
            </li>
          )
        })}
      </ul>
      {!me.billing.connected && <p className="account-hint">{copy.billingSoon}</p>}
      {failed && <p className="account-note is-error">{copy.checkoutFailed}</p>}
      {plan.id !== 'free' && (
        <p className="account-hint">
          {copy.manage} <Link to={pagePath('refund', lang)}>{copy.refundLink}</Link>
        </p>
      )}
    </section>
  )
}

function Profile({ user, copy, lang, back, onDeleted, children }: { user: Account; copy: AccountCopy; lang: Lang; back: string | null; onDeleted: () => void; children: ReactNode }) {
  const [confirming, setConfirming] = useState(false)
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
        <div className="account-actions">
          <Link to={back ?? pagePath('app', lang)} className="btn-mint">
            {back ? copy.backToEditor : copy.openEditor}
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
      {children}
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
  // 편집기에서 내보낸 뒤 넘어오면 사용량이 바뀌었으므로 다시 묻는다(처음 열 때는 useSession 이 묻는다).
  const arrivedReady = useRef(session.status === 'ready')
  useEffect(() => {
    if (arrivedReady.current) void refreshSession()
  }, [])
  const user = session.status === 'ready' ? session.me.user : null
  // 편집기에서 왔으면(?next=) 로그인한 뒤 그 작업으로 돌아간다. 소개 페이지 요금표에서 왔으면(?plan=) 그 요금제를 보여 준다.
  const here = pagePath('account', lang)
  const back = params.has('next') ? safeNext(params.get('next'), here) : null
  const chosen = PAID_PLANS.some((plan) => plan.id === params.get('plan')) ? params.get('plan') : null
  const next = back ?? (chosen ? `${here}?plan=${chosen}` : here)
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
            (user ? (
              <Profile user={user} copy={copy} lang={lang} back={back === here ? null : back} onDeleted={() => setDeleted(true)}>
                <PlanCard me={session.me} user={user} copy={copy} lang={lang} chosen={chosen} checkoutDone={params.get('checkout') === 'done'} />
              </Profile>
            ) : (
              <LoginCard me={session.me} copy={copy} next={next} toWork={back !== null && back !== here} result={params.get('login')} />
            ))}
        </div>
      </main>
      <Footer copy={site} />
    </div>
  )
}
