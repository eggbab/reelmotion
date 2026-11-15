import { Minus, Plus } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { joinWords } from '../captions/segment'
import type { Graphic } from '../motion/types'
import type { EditorCopy } from './copy'
import { LANE_COUNT, laneOf, moveGraphic, resizeGraphic } from './graphics'
import { MAX_PPS, basePps, dragMode, scrollToShow, tickLabel, tickStep, zoomPps } from './timelineMath'

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

type Drag = { id: string; mode: 'move' | 'start' | 'end'; x: number; original: Graphic; touch: boolean; changed: boolean }

/** 오른쪽 끝에 남기는 자리(마지막 블록의 끝을 잡을 수 있게) — editor.css 의 .timeline__area 오른쪽 여백과 같다 */
const TAIL = 16

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

/**
 * 줄 넷(제목·이름표·데이터·자막)에 그래픽 블록을 놓는다. 블록을 끌면 옮기고, 양 끝을 끌면 길이를 바꾼다.
 * 긴 영상은 가로로 밀어 보고(확대·축소 단추), 눈금 줄을 끌면 영상 위치가 따라온다.
 * 손가락으로는 먼저 눌러 고른 블록만 끌 수 있다 — 타임라인을 밀다가 잘못 옮기지 않게.
 */
export function Timeline({ copy, graphics, duration, time, selectedId, onSelect, onChange, onSeek }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const [viewWidth, setViewWidth] = useState(600)
  const [zoom, setZoom] = useState<number | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const scrubbing = useRef(false)
  // 확대·축소할 때 붙잡아 둘 곳(그 시각이 화면의 같은 자리에 남게)
  const anchor = useRef<{ time: number; x: number } | null>(null)

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const observer = new ResizeObserver(() => setViewWidth(Math.max(0, scroller.clientWidth - TAIL)))
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [])

  const fit = duration > 0 ? viewWidth / duration : 0
  const highest = Math.max(MAX_PPS, fit)
  const pps = zoom === null ? basePps(viewWidth, duration) : Math.min(highest, Math.max(fit, zoom))
  const areaWidth = Math.round(duration * pps)

  const changeZoom = (direction: 1 | -1) => {
    const scroller = scrollerRef.current
    if (scroller && pps > 0) {
      // 재생 머리가 보이면 그 자리를, 아니면 보이는 가운데를 붙잡는다.
      const headX = time * pps - scroller.scrollLeft
      const x = headX >= 0 && headX <= scroller.clientWidth ? headX : scroller.clientWidth / 2
      anchor.current = { time: (scroller.scrollLeft + x) / pps, x }
    }
    setZoom(zoomPps(pps, direction, viewWidth, duration))
  }

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || !anchor.current) return
    scroller.scrollLeft = Math.max(0, anchor.current.time * pps - anchor.current.x)
    anchor.current = null
  }, [pps])

  // 재생 머리가 보이는 범위를 벗어나면 따라간다(끌거나 눈금을 미는 중에는 그대로 둔다).
  const view = useRef({ pps, busy: false })
  useEffect(() => {
    view.current = { pps, busy: drag !== null }
  })
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || view.current.busy || scrubbing.current) return
    const next = scrollToShow(time * view.current.pps, scroller.scrollLeft, scroller.clientWidth - TAIL)
    if (next !== null) scroller.scrollLeft = next
  }, [time])

  /** 화면의 x 를 타임라인 안의 x 로(가로로 밀린 만큼을 뺀다) */
  const contentX = (clientX: number) => clientX - (areaRef.current?.getBoundingClientRect().left ?? 0)
  const toTime = (clientX: number) => (pps === 0 ? 0 : Math.max(0, Math.min(duration, contentX(clientX) / pps)))

  const onBlockDown = (event: PointerEvent<HTMLButtonElement>, g: Graphic) => {
    event.stopPropagation()
    const touch = event.pointerType === 'touch'
    // 손가락: 고르지 않은 블록 위에서는 화면이 그냥 밀린다. 한 번 눌러 고른 뒤에 끈다.
    if (touch && g.id !== selectedId) return
    const box = event.currentTarget.getBoundingClientRect()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ id: g.id, mode: dragMode(event.clientX - box.left, box.width, touch), x: contentX(event.clientX), original: g, touch, changed: false })
    onSelect(g.id)
  }

  const onBlockMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag || pps === 0) return
    const moved = contentX(event.clientX) - drag.x
    // 누르기만 한 것이 살짝 떨려서 옮겨지지 않게, 조금 움직인 뒤부터 따라간다.
    if (!drag.changed && Math.abs(moved) < (drag.touch ? 6 : 3)) return
    if (drag.mode === 'move') onChange(moveGraphic(drag.original, moved / pps, duration))
    else onChange(resizeGraphic(drag.original, drag.mode, toTime(event.clientX), duration))
    if (!drag.changed) setDrag({ ...drag, changed: true })
  }

  /** 브라우저가 화면 밀기로 보고 끊으면(pointercancel) 그사이 움직인 것을 되돌린다. */
  const endDrag = (cancelled: boolean) => {
    if (cancelled && drag?.changed) onChange(drag.original)
    setDrag(null)
  }

  const onBlockKey = (event: KeyboardEvent<HTMLButtonElement>, g: Graphic) => {
    const step = event.shiftKey ? 1 : 0.1
    if (event.key === 'ArrowLeft') onChange(moveGraphic(g, -step, duration))
    else if (event.key === 'ArrowRight') onChange(moveGraphic(g, step, duration))
    else return
    event.preventDefault()
  }

  const step = tickStep(pps)
  const ticks = Array.from({ length: Math.floor(duration / step) + 1 }, (_, i) => i * step)
  return (
    <div className="timeline">
      <div className="timeline__labels">
        <span className="timeline__zoom">
          <button type="button" onClick={() => changeZoom(-1)} disabled={pps <= fit + 0.001} aria-label={copy.zoomOut} title={copy.zoomOut}>
            <Minus size={14} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => changeZoom(1)} disabled={pps >= highest - 0.001} aria-label={copy.zoomIn} title={copy.zoomIn}>
            <Plus size={14} aria-hidden="true" />
          </button>
        </span>
        {copy.lanes.map((name) => (
          <span key={name} aria-hidden="true">
            {name}
          </span>
        ))}
      </div>
      <div className="timeline__scroller" ref={scrollerRef}>
        <div
          className="timeline__area"
          ref={areaRef}
          style={{ width: areaWidth }}
          onClick={(event) => {
            onSelect(null)
            onSeek(toTime(event.clientX))
          }}
        >
          {/* 눈금 줄: 누르거나 끌면 영상 위치가 따라온다(키보드로는 미리보기 아래의 막대를 쓴다) */}
          <div
            className="timeline__ruler"
            aria-hidden="true"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId)
              scrubbing.current = true
              onSeek(toTime(event.clientX))
            }}
            onPointerMove={(event) => {
              if (scrubbing.current) onSeek(toTime(event.clientX))
            }}
            onPointerUp={() => {
              scrubbing.current = false
            }}
            onPointerCancel={() => {
              scrubbing.current = false
            }}
          >
            {ticks.map((second) => (
              <span key={second} style={{ left: second * pps }}>
                {/* 맨 끝 눈금은 글자가 들어갈 자리가 없어 금만 긋는다(끝 시각은 미리보기 아래에 있다) */}
                {second * pps <= areaWidth - 20 ? tickLabel(second) : ''}
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
              style={{ left: g.start * pps, width: Math.max(6, (g.end - g.start) * pps), top: `calc(var(--ruler) + ${laneOf(g.kind)} * var(--lane))` }}
              onPointerDown={(event) => onBlockDown(event, g)}
              onPointerMove={onBlockMove}
              onPointerUp={() => endDrag(false)}
              onPointerCancel={() => endDrag(true)}
              onClick={(event) => {
                event.stopPropagation()
                onSelect(g.id)
              }}
              onKeyDown={(event) => onBlockKey(event, g)}
              onFocus={() => onSelect(g.id)}
              aria-label={`${copy.graphics.kinds[g.kind]} ${g.start.toFixed(1)}–${g.end.toFixed(1)}s`}
            >
              <strong>{copy.graphics.kinds[g.kind]}</strong>
              <span>{summary(g)}</span>
            </button>
          ))}
          <div className="timeline__head" style={{ left: time * pps }} aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
