import { THEMES } from '../motion/themes'
import type { Graphic, GraphicKind, ThemeId } from '../motion/types'
import { createGraphic } from './graphics'

/**
 * 「말로 고치기」: AI(server/app/assist.ts → 우리 서버의 오픈 모델)가 돌려준 고치기를 검사하고 편집기에 적용한다.
 * 서버와 편집기가 같은 검사(validateOps)를 쓴다 — AI 가 무엇을 내놓든 정해진 칸·범위 밖으로는 바꾸지 못한다.
 */
export type GraphicFields = Record<string, unknown>

export type AssistOp =
  | { op: 'update'; id: string; fields: GraphicFields }
  | { op: 'add'; kind: GraphicKind; start: number; end: number; fields: GraphicFields }
  | { op: 'remove'; id: string }
  | { op: 'theme'; theme: ThemeId }
  | { op: 'replace'; find: string; replace: string }

/** AI 에게 보내는 그래픽 요약(자막 낱말·항목 시각 없이) */
export type CompactGraphic = { id: string; kind: GraphicKind; start: number; end: number } & GraphicFields

export type AssistState = { duration: number; theme: ThemeId; script: string; graphics: CompactGraphic[] }

export const MAX_OPS = 12
export const MAX_INSTRUCTION = 500
const MAX_TEXT = 120
const MAX_ITEMS = 8
const MIN_LENGTH = 0.3

type FieldKind = 'text' | 'optionalText' | 'number' | 'decimals' | 'ratio' | 'texts' | 'bars' | 'side'

/** 그래픽 종류별로 고칠 수 있는 칸. 시간(start·end)은 모두 고칠 수 있다. side 는 가로 영상에서 놓이는 쪽(src/faces/track.ts). */
export const FIELDS: Record<GraphicKind, Record<string, FieldKind>> = {
  title: { text: 'text', side: 'side' },
  lowerThird: { name: 'text', role: 'optionalText', side: 'side' },
  stat: { value: 'number', prefix: 'optionalText', suffix: 'optionalText', decimals: 'decimals', label: 'optionalText', side: 'side' },
  bars: { title: 'optionalText', unit: 'optionalText', items: 'bars', side: 'side' },
  list: { title: 'optionalText', items: 'texts', side: 'side' },
  callout: { text: 'text', x: 'ratio', y: 'ratio' },
  quote: { text: 'text', author: 'optionalText' },
  captions: {},
}

const KINDS = Object.keys(FIELDS) as GraphicKind[]
const THEME_IDS = new Set<string>(THEMES.map((theme) => theme.id))
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const round1 = (value: number) => Math.round(value * 10) / 10
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

export function compactGraphics(graphics: Graphic[]): CompactGraphic[] {
  return graphics.map((graphic) => {
    const compact: CompactGraphic = { id: graphic.id, kind: graphic.kind, start: round1(graphic.start), end: round1(graphic.end) }
    for (const key of Object.keys(FIELDS[graphic.kind])) compact[key] = (graphic as unknown as Record<string, unknown>)[key]
    return compact
  })
}

function cleanText(value: unknown, required: boolean): string | undefined {
  if (typeof value !== 'string') return undefined
  const text = value.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT)
  return required && text === '' ? undefined : text
}

function cleanField(kind: FieldKind, value: unknown): unknown {
  switch (kind) {
    case 'text':
      return cleanText(value, true)
    case 'optionalText':
      return cleanText(value, false)
    case 'number':
      return isNumber(value) ? value : undefined
    case 'decimals':
      return isNumber(value) ? clamp(Math.round(value), 0, 3) : undefined
    case 'ratio':
      return isNumber(value) ? clamp(value, 0, 1) : undefined
    case 'side':
      return value === 'left' || value === 'right' ? value : undefined
    case 'texts': {
      if (!Array.isArray(value)) return undefined
      const items = value.map((item) => cleanText(item, true)).filter((item): item is string => item !== undefined)
      return items.length > 0 ? items.slice(0, MAX_ITEMS) : undefined
    }
    case 'bars': {
      if (!Array.isArray(value)) return undefined
      const items = value.flatMap((item) => {
        if (!isObject(item) || !isNumber(item.value)) return []
        const label = cleanText(item.label, false)
        return label === undefined ? [] : [{ label, value: item.value }]
      })
      return items.length > 0 ? items.slice(0, MAX_ITEMS) : undefined
    }
  }
}

/**
 * 칸 검사: 그 종류가 가진 칸만, 형식이 맞는 값만. 시간은 영상 안으로, 너무 짧으면 버린다.
 * 시작이나 끝 하나만 바꾸면(「2초 늦게」) 다른 하나는 지금 값(current)을 쓴다.
 */
function cleanFields(kind: GraphicKind, raw: unknown, duration: number, current?: { start: number; end: number }): GraphicFields {
  const fields: GraphicFields = {}
  if (!isObject(raw)) return fields
  for (const [key, fieldKind] of Object.entries(FIELDS[kind])) {
    if (!(key in raw)) continue
    const value = cleanField(fieldKind, raw[key])
    if (value !== undefined) fields[key] = value
  }
  const start = isNumber(raw.start) ? clamp(raw.start, 0, duration) : current?.start
  const end = isNumber(raw.end) ? clamp(raw.end, 0, duration) : current?.end
  if ((isNumber(raw.start) || isNumber(raw.end)) && start !== undefined && end !== undefined && end - start >= MIN_LENGTH) Object.assign(fields, { start, end })
  return fields
}

export function validateOps(raw: unknown, state: AssistState): AssistOp[] {
  const list = isObject(raw) && Array.isArray(raw.ops) ? raw.ops : Array.isArray(raw) ? raw : []
  const byId = new Map(state.graphics.map((graphic) => [graphic.id, graphic]))
  const ops: AssistOp[] = []
  for (const item of list) {
    if (ops.length >= MAX_OPS) break
    if (!isObject(item)) continue
    if (item.op === 'update' && typeof item.id === 'string' && byId.has(item.id)) {
      const graphic = byId.get(item.id)!
      const fields = isObject(item.fields) ? { ...item.fields } : {}
      // 시간을 바깥(start·end)에 둔 경우도 받는다.
      if (isNumber(item.start) && isNumber(item.end) && !('start' in fields)) Object.assign(fields, { start: item.start, end: item.end })
      const cleaned = cleanFields(graphic.kind, fields, state.duration, graphic)
      // 남은 칸이 없으면 바꿀 것이 없다.
      if (Object.keys(cleaned).length > 0) ops.push({ op: 'update', id: item.id, fields: cleaned })
    } else if (item.op === 'add' && KINDS.includes(item.kind as GraphicKind) && isNumber(item.start) && isNumber(item.end)) {
      const kind = item.kind as GraphicKind
      const start = clamp(item.start, 0, state.duration)
      const end = clamp(item.end, 0, state.duration)
      if (end - start < MIN_LENGTH) continue
      const fields = cleanFields(kind, item.fields, state.duration)
      delete fields.start
      delete fields.end
      ops.push({ op: 'add', kind, start, end, fields })
    } else if (item.op === 'remove' && typeof item.id === 'string' && byId.has(item.id)) {
      ops.push({ op: 'remove', id: item.id })
    } else if (item.op === 'theme' && typeof item.theme === 'string' && THEME_IDS.has(item.theme)) {
      ops.push({ op: 'theme', theme: item.theme as ThemeId })
    } else if (item.op === 'replace' && typeof item.find === 'string' && typeof item.replace === 'string') {
      const find = item.find.slice(0, 80)
      if (find.trim() !== '' && state.script.includes(find)) ops.push({ op: 'replace', find, replace: item.replace.slice(0, 80) })
    }
  }
  return ops
}

/** 목록 항목이 나타나는 시각: 시작 0.4초 뒤부터 끝 0.4초 전까지 고르게. */
function spreadTimes(start: number, end: number, count: number): number[] {
  const first = start + 0.4
  const last = Math.max(first, end - 0.8)
  return Array.from({ length: count }, (_, i) => round1(count === 1 ? first : first + ((last - first) * i) / (count - 1)))
}

function withFields(graphic: Graphic, fields: GraphicFields): Graphic {
  const next = { ...graphic, ...fields } as Graphic
  if (next.kind === 'list' && ('items' in fields || 'start' in fields || 'end' in fields)) return { ...next, itemTimes: spreadTimes(next.start, next.end, next.items.length) }
  return next
}

export type AssistDoc = { graphics: Graphic[]; theme: ThemeId; script: string; duration: number }

export function applyOps(doc: AssistDoc, ops: AssistOp[], newId: () => string): Omit<AssistDoc, 'duration'> {
  let { graphics, theme, script } = doc
  for (const op of ops) {
    if (op.op === 'update') graphics = graphics.map((graphic) => (graphic.id === op.id ? withFields(graphic, op.fields) : graphic))
    else if (op.op === 'remove') graphics = graphics.filter((graphic) => graphic.id !== op.id)
    else if (op.op === 'theme') theme = op.theme
    else if (op.op === 'replace') script = script.split(op.find).join(op.replace)
    else {
      const base = createGraphic(op.kind, op.start, Math.max(doc.duration, op.end), newId())
      graphics = [...graphics, withFields(base, { ...op.fields, start: op.start, end: op.end })]
    }
  }
  return { graphics, theme, script }
}

const MAX_GRAPHICS = 60
const MAX_SCRIPT = 6000

/** 편집기가 보낸 작업 요약 검사(서버). 형식이 틀리면 null. 긴 글·많은 그래픽은 자른다. */
export function parseAssistState(raw: unknown): AssistState | null {
  if (!isObject(raw) || !isNumber(raw.duration) || raw.duration <= 0 || typeof raw.script !== 'string' || !Array.isArray(raw.graphics)) return null
  if (typeof raw.theme !== 'string' || !THEME_IDS.has(raw.theme)) return null
  const duration = Math.min(raw.duration, 4 * 60 * 60)
  const graphics: CompactGraphic[] = []
  for (const item of raw.graphics.slice(0, MAX_GRAPHICS)) {
    if (!isObject(item) || typeof item.id !== 'string' || !KINDS.includes(item.kind as GraphicKind) || !isNumber(item.start) || !isNumber(item.end)) continue
    const kind = item.kind as GraphicKind
    const fields = cleanFields(kind, item, duration)
    graphics.push({ ...fields, id: item.id.slice(0, 40), kind, start: round1(clamp(item.start, 0, duration)), end: round1(clamp(item.end, 0, duration)) })
  }
  return { duration, theme: raw.theme as ThemeId, script: raw.script.slice(0, MAX_SCRIPT), graphics }
}
