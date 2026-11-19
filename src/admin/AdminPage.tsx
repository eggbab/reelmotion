import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { useSession } from '../account/session'
import { useLang } from '../lang'
import { fill } from '../langs'
import type { Lang } from '../langs'
import { Footer, Header } from '../site/Chrome'
import { SITE_COPY } from '../site/copy'
import { pageMeta } from '../site/meta'
import { PLANS } from '../site/plans'
import type { PlanId } from '../site/plans'
import { pagePath } from '../site/routes'
import { usePageMeta, useSiteBody } from '../site/usePageMeta'
import { backupUrl, changePlan, fetchOverview, findUsers, sendTestAlert } from './api'
import type { AdminOverview, AdminUser } from './api'
import { ADMIN_COPY } from './copy'
import type { AdminCopy } from './copy'
import { ErrorsCard } from './ErrorsCard'
import { MessagesCard } from './MessagesCard'
import { NoticeCard } from './NoticeCard'
import { PulseCard } from './PulseCard'

const LOCALE: Record<Lang, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP' }
const clock = (ms: number, lang: Lang) => new Date(ms).toLocaleString(LOCALE[lang], { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
const day = (ms: number, lang: Lang) => new Date(ms).toLocaleDateString(LOCALE[lang], { year: 'numeric', month: 'numeric', day: 'numeric' })
const size = (bytes: number) => (bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`)
const planName = (plan: string, lang: Lang) => SITE_COPY[lang].pricing.names[plan as PlanId] ?? plan

type Props = { copy: AdminCopy; lang: Lang }

function StatusCard({ copy, lang, status }: Props & { status: AdminOverview['status'] }) {
  return (
    <section className="account-card">
      <h2>{copy.status}</h2>
      <p className="account-hint">{status.checkedAt === null ? copy.notChecked : fill(copy.checkedAt, { time: clock(status.checkedAt, lang) })}</p>
      <ul className="admin-checks">
        {status.checks.map((check) => (
          <li key={check.id}>
            <span className={`admin-pill ${check.ok ? 'is-ok' : 'is-bad'}`}>{check.ok ? copy.ok : copy.problem}</span>
            <strong>{copy.checks[check.id]}</strong>
            <span className="admin-detail">
              {check.detail}
              {!check.ok && ` · ${fill(copy.since, { time: clock(check.since, lang) })}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function NumbersCard({ copy, lang, data }: Props & { data: AdminOverview }) {
  const settings = data.settings
  return (
    <section className="account-card">
      <h2>{copy.numbers}</h2>
      <dl className="admin-stats">
        <div>
          <dt>{copy.users}</dt>
          <dd>{data.users.total}</dd>
          <small>{fill(copy.newThisMonth, { n: data.users.thisMonth })}</small>
        </div>
        <div>
          <dt>{copy.plans}</dt>
          <dd className="admin-stats__plans">
            {PLANS.map((plan) => (
              <span key={plan.id}>
                {planName(plan.id, lang)} <b>{data.plans[plan.id]}</b>
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt>{copy.exportsThisMonth}</dt>
          <dd>{data.exports.total}</dd>
          <small>{data.exports.month}</small>
        </div>
      </dl>
      <ul className="admin-settings" aria-label={copy.settings}>
        <li className={settings.enforced ? 'is-on' : undefined}>{settings.enforced ? copy.limitsOn : copy.limitsOff}</li>
        <li className={settings.billing ? 'is-on' : undefined}>{settings.billing ? copy.billingOn : copy.billingOff}</li>
        <li className={settings.googleLogin ? 'is-on' : undefined}>{settings.googleLogin ? copy.googleOn : copy.googleOff}</li>
        <li className={settings.connector ? 'is-on' : undefined}>{settings.connector ? copy.connectorOn : copy.connectorOff}</li>
      </ul>
    </section>
  )
}

function PlanForm({ copy, lang, user, onDone, onCancel }: Props & { user: AdminUser; onDone: (message: string, error: boolean) => void; onCancel: () => void }) {
  const [plan, setPlan] = useState(user.plan)
  const [days, setDays] = useState('30')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    const result = await changePlan(user.email, plan, plan === 'free' ? undefined : Number(days))
    setBusy(false)
    if (result.ok) onDone(fill(copy.saved, { email: user.email, plan: planName(plan, lang) }), false)
    else onDone(copy.planErrors[result.error], true)
  }
  return (
    <form className="admin-plan" onSubmit={(event) => void submit(event)}>
      <select value={plan} onChange={(event) => setPlan(event.target.value)} aria-label={copy.plan}>
        {PLANS.map((item) => (
          <option key={item.id} value={item.id}>
            {planName(item.id, lang)}
          </option>
        ))}
      </select>
      {plan !== 'free' && (
        <label>
          <input type="number" min={1} max={3660} step={1} value={days} onChange={(event) => setDays(event.target.value)} />
          {copy.days}
        </label>
      )}
      <button type="submit" className="btn-mint" disabled={busy}>
        {copy.save}
      </button>
      <button type="button" className="btn-ghost" onClick={onCancel}>
        {copy.cancel}
      </button>
    </form>
  )
}

function PeopleCard({ copy, lang, recent, onChanged }: Props & { recent: AdminUser[]; onChanged: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AdminUser[] | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const search = async (text: string) => {
    setResults(text.trim() === '' ? null : ((await findUsers(text)) ?? []))
  }
  const list = results ?? recent
  return (
    <section className="account-card">
      <h2>{copy.people}</h2>
      <form
        className="admin-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          void search(query)
        }}
      >
        <input type="search" value={query} placeholder={copy.search} aria-label={copy.search} onChange={(event) => setQuery(event.target.value)} />
        <button type="submit" className="btn-ghost">
          {copy.searchButton}
        </button>
      </form>
      {results === null && <p className="account-hint">{copy.recent}</p>}
      {message && (
        <p className={`account-note${message.error ? ' is-error' : ''}`} role="status">
          {message.text}
        </p>
      )}
      {list.length === 0 ? (
        <p className="account-hint">{copy.noResults}</p>
      ) : (
        <ul className="admin-people">
          {list.map((user) => (
            <li key={user.id}>
              <div className="admin-person">
                <strong>{user.email}</strong>
                <span>
                  {user.name || '—'} · {planName(user.plan, lang)}
                  {user.plan !== 'free' && user.planUntil !== null && ` (${fill(copy.until, { date: day(user.planUntil, lang) })})`}
                </span>
                <small>
                  {copy.joined} {day(user.createdAt, lang)} · {copy.exports} {user.exports} · {copy.projects} {user.projects}
                </small>
              </div>
              {editing === user.id ? (
                <PlanForm
                  copy={copy}
                  lang={lang}
                  user={user}
                  onCancel={() => setEditing(null)}
                  onDone={(text, error) => {
                    setMessage({ text, error })
                    if (error) return
                    setEditing(null)
                    onChanged()
                    if (results !== null) void search(query)
                  }}
                />
              ) : (
                <button type="button" className="btn-ghost" onClick={() => setEditing(user.id)}>
                  {copy.change}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function BackupsCard({ copy, backups }: Props & { backups: AdminOverview['backups'] }) {
  return (
    <section className="account-card">
      <h2>{copy.backups}</h2>
      <p>{copy.backupsBody}</p>
      {backups.length === 0 ? (
        <p className="account-hint">{copy.noBackups}</p>
      ) : (
        <ul className="admin-backups">
          {backups.map((backup) => (
            <li key={backup.name}>
              <span>{backup.name}</span>
              <small>{size(backup.bytes)}</small>
              <a href={backupUrl(backup.name)} download={backup.name}>
                {copy.download}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function AlertsCard({ copy, alerts }: Props & { alerts: AdminOverview['alerts'] }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ text: string; error: boolean } | null>(null)
  const test = async () => {
    setBusy(true)
    const sent = await sendTestAlert()
    setBusy(false)
    if (sent.ok) setResult({ text: fill(copy.testSent, { email: alerts.email ?? '' }), error: false })
    else setResult({ text: sent.reason === 'not_set_up' ? copy.testNotSetUp : fill(copy.testFailed, { message: sent.message }), error: true })
  }
  return (
    <section className="account-card">
      <h2>{copy.alerts}</h2>
      <p>{fill(copy.alertsTo, { email: alerts.email ?? '—' })}</p>
      <p className={alerts.mail ? 'account-hint' : 'account-note'}>{alerts.mail ? copy.mailOn : copy.mailOff}</p>
      <button type="button" className="btn-ghost" disabled={!alerts.mail || busy} onClick={() => void test()}>
        {copy.testMail}
      </button>
      {result && (
        <p className={`account-note${result.error ? ' is-error' : ''}`} role="status">
          {result.text}
        </p>
      )}
    </section>
  )
}

function AdminBoard({ copy, lang }: Props) {
  const [data, setData] = useState<AdminOverview | 'loading' | 'failed'>('loading')
  // 다시 불러오기(요금제를 바꾼 뒤·실패 뒤)는 판 번호를 올려서.
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let alive = true
    void fetchOverview().then((overview) => {
      if (alive) setData(overview ?? 'failed')
    })
    return () => {
      alive = false
    }
  }, [version])
  const reload = () => setVersion((value) => value + 1)
  if (data === 'loading') return <p className="account-note">{copy.loading}</p>
  if (data === 'failed') {
    return (
      <p className="account-note is-error">
        {copy.failed}{' '}
        <button
          type="button"
          className="admin-link"
          onClick={() => {
            setData('loading')
            reload()
          }}
        >
          {copy.retry}
        </button>
      </p>
    )
  }
  return (
    <>
      <StatusCard copy={copy} lang={lang} status={data.status} />
      <MessagesCard copy={copy} lang={lang} />
      <NumbersCard copy={copy} lang={lang} data={data} />
      <PulseCard copy={copy} />
      <ErrorsCard copy={copy} lang={lang} />
      <PeopleCard copy={copy} lang={lang} recent={data.recent} onChanged={reload} />
      <NoticeCard copy={copy} lang={lang} />
      <BackupsCard copy={copy} lang={lang} backups={data.backups} />
      <AlertsCard copy={copy} lang={lang} alerts={data.alerts} />
    </>
  )
}

/** 관리자 화면: 서버 상태·숫자·사람(요금제 바꾸기)·공지·백업·장애 알림. 관리자 메일(ADMIN_EMAILS)로 로그인한 사람만. */
export function AdminPage() {
  const { lang } = useLang()
  const site = SITE_COPY[lang]
  const copy = ADMIN_COPY[lang]
  const session = useSession()
  usePageMeta(pageMeta('admin', lang))
  useSiteBody()
  const user = session.status === 'ready' ? session.me.user : null
  const admin = session.status === 'ready' && session.me.admin === true
  return (
    <div className="site">
      <Header copy={site} />
      <main id="main" className="legal account admin">
        <div className="glow glow--top" aria-hidden="true" />
        <div className="legal__inner">
          <p className="eyebrow">ReelMotion</p>
          <h1>{copy.title}</h1>
          {session.status === 'loading' && <p className="account-note">{copy.loading}</p>}
          {session.status === 'off' && <p className="account-note">{copy.off}</p>}
          {session.status === 'ready' && !user && (
            <section className="account-card">
              <p>{copy.needLogin}</p>
              <Link className="btn-mint" to={`${pagePath('account', lang)}?next=${encodeURIComponent(pagePath('admin', lang))}`}>
                {copy.loginButton}
              </Link>
            </section>
          )}
          {user && !admin && <p className="account-note">{copy.forbidden}</p>}
          {admin && <AdminBoard copy={copy} lang={lang} />}
        </div>
      </main>
      <Footer copy={site} />
    </div>
  )
}
