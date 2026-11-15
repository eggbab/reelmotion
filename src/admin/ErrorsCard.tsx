import { useEffect, useState } from 'react'
import { fill } from '../langs'
import type { Lang } from '../langs'
import { agentLabel } from './agent'
import { clearErrors, fetchErrors } from './api'
import type { AdminError } from './api'
import type { AdminCopy } from './copy'

const LOCALE: Record<Lang, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP' }
const clock = (ms: number, lang: Lang) => new Date(ms).toLocaleString(LOCALE[lang], { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

/** 브라우저 오류: 편집기가 이용자의 브라우저에서 고장 났을 때 알려 온 것. 같은 오류는 한 줄에 모여 있다. */
export function ErrorsCard({ copy, lang }: { copy: AdminCopy; lang: Lang }) {
  const [errors, setErrors] = useState<AdminError[] | 'loading' | 'failed'>('loading')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let alive = true
    void fetchErrors().then((value) => {
      if (alive) setErrors(value ?? 'failed')
    })
    return () => {
      alive = false
    }
  }, [])
  if (errors === 'loading') return null
  const text = copy.errors
  if (errors === 'failed') {
    return (
      <section className="account-card">
        <h2>{text.title}</h2>
        <p className="account-note is-error">{copy.failed}</p>
      </section>
    )
  }
  const clear = async () => {
    setBusy(true)
    const done = await clearErrors()
    setBusy(false)
    if (done) setErrors([])
    setMessage(done ? text.cleared : copy.failed)
  }
  return (
    <section className="account-card">
      <h2>{text.title}</h2>
      <p className="account-note">{text.note}</p>
      {errors.length === 0 ? (
        <p className="account-note">{message ?? text.empty}</p>
      ) : (
        <>
          <ul className="admin-errors">
            {errors.map((error) => (
              <li key={error.fingerprint}>
                <strong>{error.message}</strong>
                <span>
                  {[fill(text.count, { n: error.count.toLocaleString('en-US') }), fill(text.last, { time: clock(error.lastAt, lang) }), error.page, agentLabel(error.agent, copy.pulse), error.version ? fill(text.version, { v: error.version }) : '']
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                {error.stack && (
                  <details>
                    <summary>{text.stack}</summary>
                    <pre className="admin-stack">{error.stack}</pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
          <p className="account-actions">
            <button type="button" className="btn-ghost" disabled={busy} onClick={() => void clear()}>
              {text.clear}
            </button>
          </p>
        </>
      )}
    </section>
  )
}
