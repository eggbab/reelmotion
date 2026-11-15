import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { joinWords } from '../captions/segment'
import type { Graphic } from '../motion/types'
import type { EditorCopy } from './copy'
import { LANE_COUNT, laneOf, moveGraphic, resizeGraphic } from './graphics'

type Props = {
  copy: EditorCopy
  graphics: Graphic[]
  duration: number
  time: number
  selectedId: string | null
  onSelect: (id: string | null) => void
  onChange: (graphic: Graphic) => void
  onSeek: (time: number) => void
}

type Drag = { id: string; mode: 'move' | 'start' | 'end'; x: number; original: Graphic }

const EDGE_PX = 8

function summary(g: Graphic): string {
  switch (g.kind) {
    case 'title':
    case 'callout':
    case 'quote':
      return g.text
    case 'lowerThird':
      return g.name
    case 'stat':
      return `${g.prefix}${g.value}${g.suffix}`
    case 'bars':
      return g.title || g.items.map((item) => item.label).join(' · ')
    case 'list':
      return g.title || g.items.join(' · ')
    case 'captions':
      return joinWords(g.words)
  }
}

/** 줄 셋(제목·데이터·자막)에 그래픽 블록을 놓는다. 블록을 끌면 옮기고, 양 끝을 끌면 길이를 바꾼다. */
export function Timeline({ copy, graphics, duration, time, selectedId, onSelect, onChange, onSeek }: Props) {
  const areaRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  const [drag, setDrag] = useState<Drag | null>(null)

  useEffect(() => {
    const area = areaRef.current
    if (!area) return
    const observer = new ResizeObserver(() => setWidth(area.clientWidth))
    observer.observe(area)
    return () => observer.disconnect()
  }, [])

  const perSecond = duration > 0 ? width / duration : 0
  const toTime = (clientX: number) => {
    const box = areaRef.current?.getBoundingClientRect()
    if (!box || perSecond === 0) return 0
    return Math.max(0, Math.min(duration, (clientX - box.left) / perSecond))
  }

  const onBlockDown = (event: PointerEvent<HTMLButtonElement>, g: Graphic) => {
    event.stopPropagation()
    const box = event.currentTarget.getBoundingClientRect()
    const offset = event.clientX - box.left
    const mode = offset < EDGE_PX ? 'start' : offset > box.width - EDGE_PX ? 'end' : 'move'
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ id: g.id, mode, x: event.clientX, original: g })
    onSelect(g.id)
  }

  const onBlockMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag || perSecond === 0) return
    const delta = (event.clientX - drag.x) / perSecond
    if (drag.mode === 'move') onChange(moveGraphic(drag.original, delta, duration))
    else onChange(resizeGraphic(drag.original, drag.mode, toTime(event.clientX), duration))
  }

  const onBlockKey = (event: KeyboardEvent<HTMLButtonElement>, g: Graphic) => {
    const step = event.shiftKey ? 1 : 0.1
    if (event.key === 'ArrowLeft') onChange(moveGraphic(g, -step, duration))
    else if (event.key === 'ArrowRight') onChange(moveGraphic(g, step, duration))
    else return
    event.preventDefault()
  }

  const ticks = Array.from({ length: Math.floor(duration) + 1 }, (_, i) => i)
  return (
    <div className="timeline">
      <div className="timeline__labels" aria-hidden="true">
        <span />
        {copy.lanes.map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>
      <div
        className="timeline__area"
        ref={areaRef}
        onPointerDown={(event) => {
          onSelect(null)
          onSeek(toTime(event.clientX))
        }}
      >
        <div className="timeline__ruler" aria-hidden="true">
          {ticks.map((second) => (
            <span key={second} style={{ left: second * perSecond }}>
              {second % (duration > 30 ? 5 : 1) === 0 ? `${second}s` : ''}
            </span>
          ))}
        </div>
        {Array.from({ length: LANE_COUNT }, (_, lane) => (
          <div key={lane} className="timeline__lane" />
        ))}
        {graphics.map((g) => (
          <button
            key={g.id}
            type="button"
            className={`block block--${laneOf(g.kind)} ${g.id === selectedId ? 'is-selected' : ''}`}
            style={{ left: g.start * perSecond, width: Math.max(6, (g.end - g.start) * perSecond), top: `calc(24px + ${laneOf(g.kind)} * 40px)` }}
            onPointerDown={(event) => onBlockDown(event, g)}
            onPointerMove={onBlockMove}
            onPointerUp={() => setDrag(null)}
            onKeyDown={(event) => onBlockKey(event, g)}
            onFocus={() => onSelect(g.id)}
            aria-label={`${copy.graphics.kinds[g.kind]} ${g.start.toFixed(1)}–${g.end.toFixed(1)}s`}
          >
            <strong>{copy.graphics.kinds[g.kind]}</strong>
            <span>{summary(g)}</span>
          </button>
        ))}
        <div className="timeline__head" style={{ left: time * perSecond }} aria-hidden="true" />
      </div>
    </div>
  )
}
