import { Send, Undo2 } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { release } from '../http'
import type { Lang } from '../langs'
import type { Graphic, ThemeId } from '../motion/types'
import { compactGraphics, MAX_INSTRUCTION, validateOps } from './assist'
import type { AssistOp } from './assist'
import type { EditorCopy } from './copy'

/** 편집기가 말로 고치기에 넘겨주는 지금 작업. */
export type ChatDoc = { graphics: Graphic[]; theme: ThemeId; script: string; duration: number }

/** 대화 한 줄. 고친 답에는 되돌릴 때 쓸 고치기 전 상태(before)와 고친 뒤 상태(after)를 둔다. */
export type ChatEntry =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string; partial: boolean; before?: ChatDoc; after?: ChatDoc; undone?: boolean }
  | { role: 'error'; text: string }

type Props = {
  copy: EditorCopy
  lang: Lang
  doc: ChatDoc
  ready: boolean | null
  entries: ChatEntry[]
  onEntries: (update: (entries: ChatEntry[]) => ChatEntry[]) => void
  /** 고치기를 지금(답이 온 때의) 작업에 적용하고, 적용 전·후 작업을 돌려준다(되돌리기용). */
  onApply: (ops: AssistOp[]) => { before: ChatDoc; after: ChatDoc }
  onRestore: (doc: ChatDoc) => void
}

type Answer = { reply: string; ops: AssistOp[]; dropped: number }

async function ask(instruction: string, lang: Lang, doc: ChatDoc): Promise<{ answer: Answer } | { error: 'busy' | 'limited' | 'unavailable' | 'failed' }> {
  try {
    const state = { duration: doc.duration, theme: doc.theme, script: doc.script, graphics: compactGraphics(doc.graphics) }
    const response = await fetch('/api/assist/edit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ instruction, lang, state }) })
    if (response.status === 503) {
      const body = (await response.json().catch(() => ({}))) as { error?: string }
      return { error: body.error === 'busy' ? 'busy' : 'unavailable' }
    }
    if (!response.ok) {
      release(response)
      return { error: response.status === 429 ? 'limited' : 'failed' }
    }
    const body = (await response.json()) as Answer
    // 서버가 검사했지만 편집기도 다시 본다(지금 작업에 없는 그래픽은 건너뛴다).
    return { answer: { reply: String(body.reply ?? ''), ops: validateOps({ ops: body.ops }, state), dropped: Number(body.dropped) || 0 } }
  } catch {
    return { error: 'unavailable' }
  }
}

const sameDoc = (a: ChatDoc, b: ChatDoc) => a.graphics === b.graphics && a.theme === b.theme && a.script === b.script

/** 말로 고치기: 적은 말을 우리 서버의 AI 가 그래픽 고치기로 바꾸고, 편집기가 검사해 적용한다. 마지막 고치기는 되돌릴 수 있다. */
export function ChatPanel({ copy, lang, doc, ready, entries, onEntries, onApply, onRestore }: Props) {
  const t = copy.chat
  const [text, setText] = useState('')
  const [thinking, setThinking] = useState(false)

  const send = async (instruction: string) => {
    const clean = instruction.trim().slice(0, MAX_INSTRUCTION)
    if (!clean || thinking) return
    setText('')
    setThinking(true)
    onEntries((list) => [...list, { role: 'user', text: clean }])
    const result = await ask(clean, lang, doc)
    setThinking(false)
    if ('error' in result) {
      onEntries((list) => [...list, { role: 'error', text: t[result.error] }])
      return
    }
    const { answer } = result
    if (answer.ops.length === 0) {
      onEntries((list) => [...list, { role: 'assistant', text: answer.reply || t.failed, partial: answer.dropped > 0 }])
      return
    }
    const { before, after } = onApply(answer.ops)
    onEntries((list) => [...list, { role: 'assistant', text: answer.reply, partial: answer.dropped > 0, before, after }])
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void send(text)
  }
  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void send(text)
    }
  }

  const lastChange = entries.findLastIndex((entry) => entry.role === 'assistant' && entry.after !== undefined && !entry.undone)
  const off = ready === false

  return (
    <div className="chat-panel">
      <ol className="chat-log" aria-live="polite">
        {entries.length === 0 && (
          <li className="chat-intro">
            <p>{off ? t.unavailable : t.intro}</p>
            {!off && (
              <div className="chat-examples">
                {t.examples.map((example) => (
                  <button key={example} type="button" onClick={() => void send(example)} disabled={thinking}>
                    {example}
                  </button>
                ))}
              </div>
            )}
          </li>
        )}
        {entries.map((entry, index) => (
          <li key={index} className={`chat-entry is-${entry.role}`}>
            <p>{entry.text}</p>
            {entry.role === 'assistant' && entry.partial && <small>{t.partial}</small>}
            {entry.role === 'assistant' && entry.undone && <small>{t.undone}</small>}
            {entry.role === 'assistant' && index === lastChange && entry.before && entry.after && sameDoc(entry.after, doc) && (
              <button
                type="button"
                className="chat-undo"
                onClick={() => {
                  onRestore(entry.before!)
                  onEntries((list) => list.map((item, i) => (i === index ? { ...item, undone: true } : item)) as ChatEntry[])
                }}
              >
                <Undo2 size={14} aria-hidden="true" />
                {t.undo}
              </button>
            )}
          </li>
        ))}
        {thinking && (
          <li className="chat-entry is-assistant is-thinking">
            <p>{t.thinking}</p>
          </li>
        )}
      </ol>
      <form className="chat-input" onSubmit={submit}>
        <textarea
          rows={2}
          value={text}
          maxLength={MAX_INSTRUCTION}
          placeholder={t.placeholder}
          aria-label={t.placeholder}
          disabled={off}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKey}
        />
        <button type="submit" className="btn-mint" disabled={off || thinking || text.trim() === ''} aria-label={t.send}>
          <Send size={16} aria-hidden="true" />
        </button>
      </form>
      <p className="hint">{t.note}</p>
    </div>
  )
}
