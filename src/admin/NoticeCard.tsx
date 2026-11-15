import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { fill } from '../langs'
import type { Lang } from '../langs'
import { fetchAdminNotice, saveNotice } from './api'
import type { AdminNotice } from './api'
import type { AdminCopy } from './copy'

const LOCALE: Record<Lang, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP' }
const LANG_IDS = ['ko', 'en', 'ja'] as const

/** 공지 쓰기(관리자 화면). 저장하면 사이트 맨 위와 편집기 위에 보인다(src/site/notice.ts). */
export function NoticeCard({ copy, lang }: { copy: AdminCopy; lang: Lang }) {
  const [notice, setNotice] = useState<AdminNotice | 'loading' | 'failed'>('loading')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  useEffect(() => {
    let alive = true
    void fetchAdminNotice().then((value) => {
      if (alive) setNotice(value ?? 'failed')
    })
    return () => {
      alive = false
    }
  }, [])
  if (notice === 'loading') return null
  if (notice === 'failed') {
    return (
      <section className="account-card">
        <h2>{copy.notice}</h2>
        <p className="account-note is-error">{copy.failed}</p>
      </section>
    )
  }
  const update = (change: Partial<AdminNotice>) => setNotice({ ...notice, ...change })
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    const result = await saveNotice({ active: notice.active, level: notice.level, text: notice.text })
    setBusy(false)
    if (result.ok) {
      setNotice(result.notice)
      setMessage({ text: copy.noticeSaved, error: false })
    } else setMessage({ text: copy.noticeErrors[result.error], error: true })
  }
  return (
    <section className="account-card">
      <h2>{copy.notice}</h2>
      <p>{copy.noticeBody}</p>
      <form className="admin-notice" onSubmit={(event) => void submit(event)}>
        <label className="admin-check">
          <input type="checkbox" checked={notice.active} onChange={(event) => update({ active: event.target.checked })} />
          {copy.noticeOn}
        </label>
        <fieldset className="admin-levels">
          <legend>{copy.noticeLevel}</legend>
          {(['info', 'warning'] as const).map((level) => (
            <label key={level}>
              <input type="radio" name="notice-level" value={level} checked={notice.level === level} onChange={() => update({ level })} />
              {level === 'info' ? copy.levelInfo : copy.levelWarning}
            </label>
          ))}
        </fieldset>
        {LANG_IDS.map((id) => (
          <label key={id} className="admin-field">
            <span>{copy.noticeLangs[id]}</span>
            <textarea rows={2} maxLength={300} value={notice.text[id]} lang={id} onChange={(event) => update({ text: { ...notice.text, [id]: event.target.value } })} />
          </label>
        ))}
        <p className="account-hint">{copy.noticeHint}</p>
        <div className="admin-notice__actions">
          <button type="submit" className="btn-mint" disabled={busy}>
            {copy.noticeSave}
          </button>
          {notice.version > 0 && <small>{fill(copy.noticeUpdated, { time: new Date(notice.version).toLocaleString(LOCALE[lang]) })}</small>}
        </div>
        {message && (
          <p className={`account-note${message.error ? ' is-error' : ''}`} role="status">
            {message.text}
          </p>
        )}
      </form>
    </section>
  )
}
