import { useEffect } from 'react'
import type { RefObject } from 'react'

/**
 * 소개 페이지의 스크롤 효과: 대상이 화면을 지나는 정도(0~1)를 재어 알린다. 효과 자체는 CSS 가 그 값(--p)으로 계산한다
 * (site.css — 투명도·위치·흐림·잘라내기 모두 구간 안의 직선). 2026-11-19 움직임 라이브러리(motion)를 대신한다 — 그 라이브러리가
 * 첫 화면 스크립트의 4분의 1이었다. 자리를 적는 글 꼴은 그 라이브러리와 같다: '대상의 자리 창의 자리'(start·center·end 또는 0~1).
 */
export type Offset = readonly [string, string]
type Point = [target: number, viewport: number]
export type ParsedOffset = [Point, Point]

const EDGES: Record<string, number> = { start: 0, center: 0.5, end: 1 }
const edge = (word: string) => EDGES[word] ?? Number(word)

export function parseOffset(offset: Offset): ParsedOffset {
  const [first, second] = offset.map((pair) => {
    const [target, viewport] = pair.trim().split(/\s+/)
    return [edge(target), edge(viewport)] as Point
  })
  return [first, second]
}

/** 대상의 위치(창 위에서 대상 위까지 top, 높이 height)와 창 높이로 0~1 */
export function progressOf(top: number, height: number, viewport: number, [[targetFrom, viewFrom], [targetTo, viewTo]]: ParsedOffset): number {
  // 대상의 위(top)가 이 값이 될 때 0, 저 값이 될 때 1 — 아래로 내리면 top 이 줄어든다
  const from = viewFrom * viewport - targetFrom * height
  const to = viewTo * viewport - targetTo * height
  if (from === to) return top <= to ? 1 : 0
  return Math.min(1, Math.max(0, (from - top) / (from - to)))
}

/** 진행 p 가 [a, b] 를 지나는 동안 [x, y] 로 고르게(밖에서는 끝 값) */
export function lerp(p: number, [a, b]: readonly [number, number], [x, y]: readonly [number, number]): number {
  const t = Math.min(1, Math.max(0, (p - a) / (b - a)))
  return x + (y - x) * t
}

type Entry = { element: Element; offset: ParsedOffset; apply: (progress: number) => void; last: number }
const entries = new Set<Entry>()
let frame = 0
let resize: ResizeObserver | null = null

function update() {
  frame = 0
  const viewport = window.innerHeight
  // 모두 먼저 재고 그다음 적는다 — 번갈아 하면 브라우저가 적을 때마다 배치를 다시 계산한다
  const measured = [...entries].map((entry) => {
    const rect = entry.element.getBoundingClientRect()
    return [entry, progressOf(rect.top, rect.height, viewport, entry.offset)] as const
  })
  for (const [entry, value] of measured) {
    if (value === entry.last) continue
    entry.last = value
    entry.apply(value)
  }
}

const schedule = () => {
  frame ||= requestAnimationFrame(update)
}

/** element 가 화면을 지나는 정도가 바뀔 때마다 apply(0~1). 처음 한 번은 바로 알린다. 그만 볼 때 부를 함수를 돌려준다. */
export function trackScroll(element: Element, offset: Offset, apply: (progress: number) => void): () => void {
  const entry: Entry = { element, offset: parseOffset(offset), apply, last: Number.NaN }
  if (entries.size === 0) {
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    // 위쪽 글·그림이 늦게 자리를 잡아 쪽 길이가 바뀌어도 다시 잰다
    resize = new ResizeObserver(schedule)
    resize.observe(document.documentElement)
  }
  entries.add(entry)
  resize?.observe(element)
  schedule()
  return () => {
    entries.delete(entry)
    resize?.unobserve(element)
    if (entries.size > 0) return
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    resize?.disconnect()
    resize = null
    if (frame) cancelAnimationFrame(frame)
    frame = 0
  }
}

/** ref 의 요소가 화면을 지나는 정도를 그 요소의 CSS 값 --p 로 적는다(React 를 다시 그리지 않는다) */
export function useScrollVar(ref: RefObject<HTMLElement | null>, offset: Offset): void {
  const [from, to] = offset
  useEffect(() => {
    const element = ref.current
    if (!element) return
    return trackScroll(element, [from, to], (progress) => element.style.setProperty('--p', String(Math.round(progress * 10000) / 10000)))
  }, [ref, from, to])
}

/** 진행이 바뀔 때마다 apply 를 부른다(단계 바꾸기처럼 화면 상태가 바뀌는 곳). apply 는 바뀌지 않는 함수로 넘긴다. */
export function useScrollProgress(ref: RefObject<HTMLElement | null>, offset: Offset, apply: (progress: number) => void): void {
  const [from, to] = offset
  useEffect(() => {
    const element = ref.current
    if (!element) return
    return trackScroll(element, [from, to], apply)
  }, [ref, from, to, apply])
}
