import { useEffect, useRef, useState } from 'react'
import { fill } from '../langs'
import type { Lang } from '../langs'
import { fetchMessages, markMessage, removeMessage } from './api'
import type { AdminMessage } from './api'
import type { AdminCopy } from './copy'
import { replyLink } from './reply'

const LOCALE: Record<Lang, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP' }
const clock = (ms: number, lang: Lang) => new Date(ms).toLocaleString(LOCALE[lang], { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

/**
 * 문의(문의하기 쪽 — server/app/inbox.ts): 답 안 한 것을 먼저 보이고, 메일로 답하기·답함 표시·지우기.
 * 알림 메일의 링크(/ko/admin#messages)로 오면 이 칸으로 내려온다.
 */
export function MessagesCard({ copy, lang }: { copy: AdminCopy; lang: Lang }) {
  const [data, setData] = useState<{ messages: AdminMessage[]; open: number } | 'loading' | 'failed'>('loading')
  const [showDone, setShowDone] = useState(false)
  const [busy, setBusy] = useState<number | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const card = useRef<HTMLElement>(null)
  const text = copy.messages

  useEffect(() => {
    let alive = true
    void fetchMessages().then((value) => {
      if (alive) setData(value ?? 'failed')
    })
    return () => {
      alive = false
    }
  }, [])

  // 이 칸은 불러온 뒤에 생기므로, 주소의 #messages 로는 브라우저가 내려오지 못한다
  const loaded = data !== 'loading'
  useEffect(() => {
    if (loaded && window.location.hash === '#messages') card.current?.scrollIntoView({ block: 'start' })
  }, [loaded])

  if (data === 'loading') return null
  if (data === 'failed') {
    return (
      <section className="account-card" id="messages">
        <h2>{text.title}</h2>
        <p className="account-note is-error">{copy.failed}</p>
      </section>
    )
  }

  const update = (messages: AdminMessage[]) => setData({ messages, open: messages.filter((message) => message.doneAt === null).length })

  const toggle = async (message: AdminMessage) => {
    setBusy(message.id)
    const done = message.doneAt === null
    const ok = await markMessage(message.id, done)
    setBusy(null)
    if (ok) update(data.messages.map((item) => (item.id === message.id ? { ...item, doneAt: done ? Date.now() : null } : item)))
    setNote(ok ? null : copy.failed)
  }

  const remove = async (message: AdminMessage) => {
    if (!window.confirm(text.confirmRemove)) return
    setBusy(message.id)
    const ok = await removeMessage(message.id)
    setBusy(null)
    if (ok) update(data.messages.filter((item) => item.id !== message.id))
    setNote(ok ? text.removed : copy.failed)
  }

  const shown = data.messages.filter((message) => showDone || message.doneAt === null)
  return (
    <section className="account-card" id="messages" ref={card}>
      <h2>
        {text.title}
        {data.open > 0 && <span className="admin-messages__count"> · {fill(text.open, { n: data.open })}</span>}
      </h2>
      <p className="account-note">{text.note}</p>
      {data.messages.some((message) => message.doneAt !== null) && (
        <label className="admin-check">
          <input type="checkbox" checked={showDone} onChange={(event) => setShowDone(event.target.checked)} />
          {text.showDone}
        </label>
      )}
      {shown.length === 0 ? (
        <p className="account-note">{data.messages.length === 0 ? text.empty : text.allDone}</p>
      ) : (
        <ul className="admin-messages">
          {shown.map((message) => (
            <li key={message.id} className={message.doneAt !== null ? 'is-done' : undefined} data-message={message.id}>
              <span className="admin-messages__meta">
                {[`#${message.id}`, text.kinds[message.kind], clock(message.createdAt, lang), copy.noticeLangs[message.lang as Lang] ?? message.lang, message.page].filter(Boolean).join(' · ')}
              </span>
              <p className="admin-messages__body" lang={message.lang}>
                {message.body}
              </p>
              <span className="admin-messages__meta">
                {message.email ? (
                  <>
                    {message.email} · <a href={replyLink(message.email, message.id, message.lang, message.body)}>{text.reply}</a>
                  </>
                ) : (
                  text.noEmail
                )}
              </span>
              <span className="admin-messages__actions">
                <button type="button" className="btn-ghost" disabled={busy === message.id} onClick={() => void toggle(message)}>
                  {message.doneAt === null ? text.done : text.reopen}
                </button>
                <button type="button" className="btn-ghost" disabled={busy === message.id} onClick={() => void remove(message)}>
                  {text.remove}
                </button>
                {message.doneAt !== null && <small>{fill(text.doneAt, { time: clock(message.doneAt, lang) })}</small>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {note && (
        <p className="account-note" role="status">
          {note}
        </p>
      )}
    </section>
  )
}
