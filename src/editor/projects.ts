import type { Word } from '../captions/types'
import type { Lang } from '../langs'
import { CLIPS } from '../media/clips'
import type { ClipId } from '../media/clips'
import { THEMES } from '../motion/themes'
import type { Graphic, ThemeId } from '../motion/types'

/**
 * 「내 작업」: 편집기에서 만든 것을 이 브라우저(IndexedDB)에 저장해 다시 연다. 계정 없이, 서버로 보내지 않는다.
 * 저장소 읽고 쓰기는 store.ts, 여기는 저장 형식과 그 주변 계산(테스트로 확인).
 * 저장하는 것을 바꾸면 개인정보처리방침 4절(src/site/legal/privacy.ts)도 함께 고친다.
 */
export const PROJECT_VERSION = 1

/** 작업의 영상. 넣은 파일은 내용(영상)을 따로(media 저장소) 두고, 여기에는 다시 고를 때 맞춰 볼 정보만 둔다. */
export type ProjectSource = { kind: 'sample'; clip: ClipId } | { kind: 'file'; name: string; size: number; type: string; lastModified: number }

export type SavedProject = {
  version: typeof PROJECT_VERSION
  id: string
  name: string
  createdAt: number
  updatedAt: number
  source: ProjectSource
  /** 영상 파일이 이 브라우저에 함께 저장돼 있다(아니면 다시 열 때 같은 파일을 골라야 한다) */
  hasMedia: boolean
  script: string
  /** 받아 적은 낱말과 시간(받아쓰기 전이면 null) */
  recognized: Word[] | null
  graphics: Graphic[]
  theme: ThemeId
  speechLanguage: string
  /** 목록에 보이는 영상 길이(초) */
  duration: number
  portrait: boolean
  /** 목록에 보이는 작은 그림(JPEG data URL) */
  thumbnail: string | null
  /**
   * 이 작업을 계정에 올린 사람(계정 id). null 이면 아직 어느 계정에도 올리지 않았다.
   * 한 브라우저를 여러 사람이 쓸 때 다른 사람의 작업이 내 계정으로 올라가지 않게 한다(src/account/sync.ts).
   */
  owner: string | null
}

/** 영상 파일을 함께 저장하는 크기 한도. 넘으면 작업만 저장하고 다시 열 때 파일을 다시 고른다. */
export const MAX_MEDIA_BYTES = 2 * 1024 ** 3

const KINDS = new Set<Graphic['kind']>(['title', 'lowerThird', 'stat', 'bars', 'list', 'callout', 'quote', 'captions'])
const THEME_IDS = new Set<string>(THEMES.map((theme) => theme.id))

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

function parseSource(value: unknown): ProjectSource | null {
  if (!isObject(value)) return null
  if (value.kind === 'sample' && typeof value.clip === 'string' && value.clip in CLIPS) return { kind: 'sample', clip: value.clip as ClipId }
  if (value.kind === 'file' && typeof value.name === 'string' && isNumber(value.size) && typeof value.type === 'string' && isNumber(value.lastModified)) {
    return { kind: 'file', name: value.name, size: value.size, type: value.type, lastModified: value.lastModified }
  }
  return null
}

function parseWords(value: unknown): Word[] | null {
  if (!Array.isArray(value)) return null
  const ok = value.every((word) => isObject(word) && typeof word.text === 'string' && isNumber(word.start) && isNumber(word.end))
  return ok ? (value as Word[]) : null
}

/**
 * 저장소에서 꺼낸 값을 작업으로 읽는다. 필수 값이 틀리면 null(목록에서 뺀다). 모르는 그래픽은 버리고,
 * 모르는 스타일은 기본(neon)으로 — 앞으로 형식이 바뀌어도 옛 작업이 편집기를 멈추지 않게.
 */
export function parseProject(value: unknown): SavedProject | null {
  if (!isObject(value) || value.version !== PROJECT_VERSION) return null
  const { id, name, createdAt, updatedAt, script, graphics } = value
  const source = parseSource(value.source)
  if (typeof id !== 'string' || id === '' || typeof name !== 'string' || !isNumber(createdAt) || !isNumber(updatedAt)) return null
  if (!source || typeof script !== 'string' || !Array.isArray(graphics)) return null
  return {
    version: PROJECT_VERSION,
    id,
    name,
    createdAt,
    updatedAt,
    source,
    hasMedia: value.hasMedia === true,
    script,
    recognized: value.recognized === null ? null : parseWords(value.recognized),
    graphics: graphics.filter(
      (g): g is Graphic => isObject(g) && typeof g.id === 'string' && KINDS.has(g.kind as Graphic['kind']) && isNumber(g.start) && isNumber(g.end),
    ),
    theme: typeof value.theme === 'string' && THEME_IDS.has(value.theme) ? (value.theme as ThemeId) : 'neon',
    speechLanguage: typeof value.speechLanguage === 'string' ? value.speechLanguage : 'auto',
    duration: isNumber(value.duration) ? value.duration : 0,
    portrait: value.portrait === true,
    thumbnail: typeof value.thumbnail === 'string' && value.thumbnail.startsWith('data:image/') ? value.thumbnail : null,
    owner: typeof value.owner === 'string' && value.owner !== '' ? value.owner : null,
  }
}

/** 새로 더하는 그래픽 번호(u101, u102 …)가 다시 연 작업의 번호와 겹치지 않게 */
export function nextSerial(graphics: Graphic[]): number {
  return graphics.reduce((max, graphic) => {
    const match = /^u(\d+)$/.exec(graphic.id)
    return match ? Math.max(max, Number(match[1])) : max
  }, 100)
}

export function defaultName(source: ProjectSource, untitled: string): string {
  if (source.kind === 'sample') return untitled
  return source.name.replace(/\.[^.]+$/, '') || untitled
}

/** 내보낸 파일 이름에 쓸 수 없는 글자를 뺀다. */
export function safeFileName(name: string, fallback: string): string {
  const cleaned = name
    // 운영체제가 파일 이름에 받지 않는 글자(제어 문자 포함)
    // oxlint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
    .replace(/-{2,}/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '')
  return cleaned || fallback
}

/** 「방금」「3분 전」「어제」… 일주일이 넘으면 날짜. */
export function formatAgo(then: number, now: number, lang: Lang): string {
  const seconds = Math.round((then - now) / 1000)
  const relative = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  const abs = Math.abs(seconds)
  if (abs < 60) return relative.format(0, 'second')
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour')
  if (abs < 7 * 86400) return relative.format(Math.round(seconds / 86400), 'day')
  return new Intl.DateTimeFormat(lang, { month: 'short', day: 'numeric' }).format(then)
}

export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

export function formatMegabytes(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1e6))} MB`
}

/** 영상을 함께 저장할지: 2GB 이하이고, 브라우저가 알려 준 남은 공간이 영상의 1.2배 이상일 때. 모르면 해 본다. */
export function canStoreMedia(size: number, estimate: { quota?: number; usage?: number } | null): boolean {
  if (size > MAX_MEDIA_BYTES) return false
  if (!estimate || !isNumber(estimate.quota) || !isNumber(estimate.usage)) return true
  return estimate.quota - estimate.usage > size * 1.2
}

export function newProjectId(): string {
  return crypto.randomUUID()
}
