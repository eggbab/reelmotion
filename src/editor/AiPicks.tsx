import { Sparkles, Undo2 } from 'lucide-react'
import { fill } from '../langs'
import type { EditorCopy } from './copy'

export type AiPicksState =
  | { stage: 'idle' }
  | { stage: 'running' }
  | { stage: 'done'; added: number }
  | { stage: 'none' }
  | { stage: 'undone' }
  | { stage: 'failed'; reason: 'unavailable' | 'busy' | 'limited' | 'failed' }

type Props = {
  copy: EditorCopy
  /** 규칙이 제목·자막만 만들었을 때 — 그 까닭을 먼저 말한다 */
  thin: boolean
  state: AiPicksState
  canUndo: boolean
  onRun: () => void
  onUndo: () => void
}

/** 「AI로 강조할 순간 찾기」(그래픽 탭 맨 위). 고른 순간은 지금 있는 그래픽 사이에 더하고, 되돌릴 수 있다. */
export function AiPicks({ copy, thin, state, canUndo, onRun, onUndo }: Props) {
  const t = copy.aiPicks
  const running = state.stage === 'running'
  const message =
    state.stage === 'running'
      ? t.running
      : state.stage === 'done'
        ? fill(t.done, { n: state.added })
        : state.stage === 'none'
          ? t.none
          : state.stage === 'undone'
            ? t.undone
            : state.stage === 'failed'
              ? t[state.reason]
              : ''
  return (
    <section className={`ai-picks ${thin ? 'is-thin' : ''}`} aria-label={t.title}>
      <h3>
        <Sparkles size={14} aria-hidden="true" />
        {t.title}
      </h3>
      <p>{thin ? t.thin : t.body}</p>
      <div className="ai-picks__row">
        <button type="button" className="pill ai-picks__run" disabled={running} onClick={onRun}>
          {t.run}
        </button>
        {state.stage === 'done' && canUndo && (
          <button type="button" className="chat-undo" onClick={onUndo}>
            <Undo2 size={12} aria-hidden="true" />
            {t.undo}
          </button>
        )}
      </div>
      <p className={`ai-picks__status ${running ? 'is-running' : ''} ${state.stage === 'failed' ? 'is-error' : ''}`} role="status">
        {message}
      </p>
    </section>
  )
}
