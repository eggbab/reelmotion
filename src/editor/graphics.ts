import type { Word } from '../captions/types'
import type { Graphic } from '../motion/types'

export const MIN_SECONDS = 0.5

const DEFAULT_SECONDS: Record<Graphic['kind'], number> = {
  title: 3,
  lowerThird: 4,
  stat: 3.5,
  bars: 4.5,
  list: 5,
  callout: 3,
  quote: 4,
  captions: 4,
}

/** 「그래픽 더하기」로 만드는 기본 그래픽. 글은 화면 언어와 상관없이 바로 고칠 수 있는 자리 표시다. */
export function createGraphic(kind: Graphic['kind'], at: number, duration: number, id: string): Graphic {
  const length = Math.min(DEFAULT_SECONDS[kind], duration)
  const start = Math.max(0, Math.min(at, duration - length))
  const base = { id, start, end: start + length }
  switch (kind) {
    case 'title':
      return { ...base, kind, text: 'Your title here', emphasis: 1 }
    case 'lowerThird':
      return { ...base, kind, name: 'Your name', role: 'What you do' }
    case 'stat':
      return { ...base, kind, value: 42, prefix: '', suffix: '%', decimals: 0, label: 'What this number means' }
    case 'bars':
      return { ...base, kind, title: 'Comparison', unit: '%', items: [{ label: 'A', value: 60 }, { label: 'B', value: 30 }, { label: 'C', value: 10 }] }
    case 'list':
      return { ...base, kind, title: 'Checklist', items: ['First point', 'Second point', 'Third point'], itemTimes: [start + 0.6, start + 1.4, start + 2.2] }
    case 'callout':
      return { ...base, kind, text: 'Look here', x: 0.5, y: 0.5 }
    case 'quote':
      return { ...base, kind, text: 'A line worth quoting', author: '' }
    case 'captions':
      return { ...base, kind, words: [] }
  }
}

/** 타임라인 줄: 0 제목·인용 · 1 이름표·가리키기 · 2 숫자·차트·목록 · 3 자막 */
export const LANE_COUNT = 4

export function laneOf(kind: Graphic['kind']): number {
  if (kind === 'captions') return 3
  if (kind === 'title' || kind === 'quote') return 0
  if (kind === 'lowerThird' || kind === 'callout') return 1
  return 2
}

export function moveGraphic(g: Graphic, delta: number, duration: number): Graphic {
  const length = g.end - g.start
  const start = Math.max(0, Math.min(duration - length, g.start + delta))
  const shift = start - g.start
  if (g.kind === 'list' && g.itemTimes) return { ...g, start, end: start + length, itemTimes: g.itemTimes.map((t) => t + shift) }
  if (g.kind === 'captions') return { ...g, start, end: start + length }
  return { ...g, start, end: start + length }
}

export function resizeGraphic(g: Graphic, edge: 'start' | 'end', at: number, duration: number): Graphic {
  if (edge === 'start') return { ...g, start: Math.max(0, Math.min(at, g.end - MIN_SECONDS)) }
  return { ...g, end: Math.min(duration, Math.max(at, g.start + MIN_SECONDS)) }
}

/** 대본을 고치면 자막 그래픽도 새 낱말을 쓴다. 다른 그래픽은 사용자가 고친 그대로 둔다. */
export function syncCaptions(graphics: Graphic[], words: Word[]): Graphic[] {
  if (words.length === 0) return graphics
  return graphics.map((g) => (g.kind === 'captions' ? { ...g, words, start: words[0].start, end: words[words.length - 1].end } : g))
}

/** 영상 길이를 넘는 부분을 자르고, 자르고 나서 너무 짧은 그래픽은 뺀다 */
export function clampToDuration(graphics: Graphic[], duration: number): Graphic[] {
  return graphics
    .map((g) => (g.end > duration ? { ...g, end: duration } : g))
    .filter((g) => g.end - g.start >= MIN_SECONDS)
}
