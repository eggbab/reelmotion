import { Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { sideOf } from '../faces/track'
import type { Graphic, Side } from '../motion/types'
import type { EditorCopy } from './copy'

const KINDS: Graphic['kind'][] = ['title', 'lowerThird', 'stat', 'bars', 'list', 'callout', 'quote', 'captions']

type Props = {
  copy: EditorCopy
  graphics: Graphic[]
  selected: Graphic | null
  /** 세로 영상이면 그래픽이 가운데에 놓여 「위치」를 고를 게 없다 */
  portrait: boolean
  /** 되돌리기·다시 하기를 할 때마다 바뀌는 번호 — 칸들을 새로 그려 되돌린 값이 보이게 한다(목록·차트 칸은 치는 동안 칸이 글을 쥐고 있다) */
  revision: number
  onSelect: (id: string) => void
  onAdd: (kind: Graphic['kind']) => void
  onChange: (graphic: Graphic) => void
  onRemove: (id: string) => void
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  )
}

const num = (value: string, fallback: number) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/** 그래픽 목록, 더하기, 고른 그래픽의 글·숫자·시간 고치기 */
export function Inspector({ copy, graphics, selected, portrait, revision, onSelect, onAdd, onChange, onRemove }: Props) {
  const f = copy.graphics.fields
  const side = selected && !portrait ? sideOf(selected) : null
  return (
    <div className="inspector">
      <div className="add">
        <span>{copy.graphics.add}</span>
        <div>
          {KINDS.map((kind) => (
            <button key={kind} type="button" className="pill" onClick={() => onAdd(kind)}>
              <Plus size={12} aria-hidden="true" />
              {copy.graphics.kinds[kind]}
            </button>
          ))}
        </div>
      </div>

      {graphics.length === 0 ? (
        <p className="empty">{copy.graphics.empty}</p>
      ) : (
        <ul className="glist">
          {[...graphics]
            .sort((a, b) => a.start - b.start)
            .map((g) => (
              <li key={g.id}>
                <button type="button" className={g.id === selected?.id ? 'is-selected' : undefined} onClick={() => onSelect(g.id)}>
                  <strong>{copy.graphics.kinds[g.kind]}</strong>
                  <span>
                    {g.start.toFixed(1)}–{g.end.toFixed(1)}s
                  </span>
                </button>
              </li>
            ))}
        </ul>
      )}

      {selected && (
        <div className="form" key={`${selected.id}:${revision}`}>
          <div className="form__head">
            <h3>{copy.graphics.kinds[selected.kind]}</h3>
            <button type="button" className="icon-btn" onClick={() => onRemove(selected.id)}>
              <Trash2 size={15} aria-hidden="true" />
              {copy.graphics.remove}
            </button>
          </div>
          <div className="row2">
            <Field label={copy.graphics.start}>
              <input type="number" step={0.1} min={0} value={selected.start.toFixed(1)} onChange={(e) => onChange({ ...selected, start: Math.min(num(e.target.value, selected.start), selected.end - 0.5) })} />
            </Field>
            <Field label={copy.graphics.end}>
              <input type="number" step={0.1} min={0} value={selected.end.toFixed(1)} onChange={(e) => onChange({ ...selected, end: Math.max(num(e.target.value, selected.end), selected.start + 0.5) })} />
            </Field>
          </div>
          <KindFields copy={copy} g={selected} onChange={onChange} f={f} />
          {side && (
            <Field label={f.side} hint={f.sideHint}>
              <select data-testid="graphic-side" value={side} onChange={(e) => onChange({ ...selected, side: e.target.value as Side })}>
                <option value="left">{f.left}</option>
                <option value="right">{f.right}</option>
              </select>
            </Field>
          )}
        </div>
      )}
    </div>
  )
}

function KindFields({ g, onChange, f, copy }: { g: Graphic; onChange: (graphic: Graphic) => void; f: EditorCopy['graphics']['fields']; copy: EditorCopy }) {
  switch (g.kind) {
    case 'title': {
      const words = g.text.split(/\s+/).filter(Boolean)
      return (
        <>
          <Field label={f.text}>
            <textarea rows={2} value={g.text} onChange={(e) => onChange({ ...g, text: e.target.value })} />
          </Field>
          <Field label={f.emphasis}>
            <select value={g.emphasis ?? -1} onChange={(e) => onChange({ ...g, emphasis: Number(e.target.value) < 0 ? undefined : Number(e.target.value) })}>
              <option value={-1}>{f.none}</option>
              {words.map((word, i) => (
                <option key={i} value={i}>
                  {word}
                </option>
              ))}
            </select>
          </Field>
        </>
      )
    }
    case 'lowerThird':
      return (
        <>
          <Field label={f.name}>
            <input value={g.name} onChange={(e) => onChange({ ...g, name: e.target.value })} />
          </Field>
          <Field label={f.role}>
            <input value={g.role} onChange={(e) => onChange({ ...g, role: e.target.value })} />
          </Field>
        </>
      )
    case 'stat':
      return (
        <>
          <div className="row3">
            <Field label={f.prefix}>
              <input value={g.prefix} maxLength={3} onChange={(e) => onChange({ ...g, prefix: e.target.value })} />
            </Field>
            <Field label={f.value}>
              <input type="number" value={g.value} onChange={(e) => onChange({ ...g, value: num(e.target.value, g.value) })} />
            </Field>
            <Field label={f.suffix}>
              <input value={g.suffix} maxLength={4} onChange={(e) => onChange({ ...g, suffix: e.target.value })} />
            </Field>
          </div>
          <Field label={f.decimals}>
            <input type="number" min={0} max={3} value={g.decimals} onChange={(e) => onChange({ ...g, decimals: Math.max(0, Math.min(3, Math.round(num(e.target.value, 0)))) })} />
          </Field>
          <Field label={f.label}>
            <input value={g.label} onChange={(e) => onChange({ ...g, label: e.target.value })} />
          </Field>
        </>
      )
    case 'bars':
      return (
        <>
          <Field label={f.title}>
            <input value={g.title} onChange={(e) => onChange({ ...g, title: e.target.value })} />
          </Field>
          <Field label={f.unit}>
            <input value={g.unit} maxLength={4} onChange={(e) => onChange({ ...g, unit: e.target.value })} />
          </Field>
          <Field label={f.items} hint={f.barsHint}>
            <textarea
              rows={4}
              defaultValue={g.items.map((item) => `${item.label}, ${item.value}`).join('\n')}
              onChange={(e) =>
                onChange({
                  ...g,
                  items: e.target.value
                    .split('\n')
                    .map((line) => {
                      const at = line.lastIndexOf(',')
                      return at < 0 ? null : { label: line.slice(0, at).trim(), value: num(line.slice(at + 1).trim(), NaN) }
                    })
                    .filter((item): item is { label: string; value: number } => !!item && item.label !== '' && Number.isFinite(item.value))
                    .slice(0, 5),
                })
              }
            />
          </Field>
        </>
      )
    case 'list':
      return (
        <>
          <Field label={f.title}>
            <input value={g.title} onChange={(e) => onChange({ ...g, title: e.target.value })} />
          </Field>
          <Field label={f.items} hint={f.itemsHint}>
            <textarea
              rows={4}
              defaultValue={g.items.join('\n')}
              onChange={(e) => {
                const items = e.target.value.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 5)
                const times = items.map((_, i) => g.itemTimes?.[i] ?? g.start + 0.6 + i * 0.8)
                onChange({ ...g, items, itemTimes: times })
              }}
            />
          </Field>
        </>
      )
    case 'callout':
      return (
        <>
          <Field label={f.text}>
            <input value={g.text} onChange={(e) => onChange({ ...g, text: e.target.value })} />
          </Field>
          <div className="row2">
            <Field label={f.x}>
              <input type="range" min={5} max={95} value={Math.round(g.x * 100)} onChange={(e) => onChange({ ...g, x: Number(e.target.value) / 100 })} />
            </Field>
            <Field label={f.y}>
              <input type="range" min={10} max={95} value={Math.round(g.y * 100)} onChange={(e) => onChange({ ...g, y: Number(e.target.value) / 100 })} />
            </Field>
          </div>
        </>
      )
    case 'quote':
      return (
        <>
          <Field label={f.text}>
            <textarea rows={3} value={g.text} onChange={(e) => onChange({ ...g, text: e.target.value })} />
          </Field>
          <Field label={f.author}>
            <input value={g.author} onChange={(e) => onChange({ ...g, author: e.target.value })} />
          </Field>
        </>
      )
    case 'captions':
      return <p className="hint">{copy.graphics.fields.captionsHint}</p>
  }
}
