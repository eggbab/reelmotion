import { scriptToWords, scriptTokens } from '../captions/segment'
import { compactGraphics } from '../editor/assist'
import { EDITOR_COPY } from '../editor/copy'
import { clampToDuration } from '../editor/graphics'
import type { Lang } from '../langs'
import { direct } from '../motion/direct'
import type { GraphicKind } from '../motion/types'
import { pagePath } from '../site/routes'

/**
 * Claude·ChatGPT 커넥터(server/app/connect.ts)가 쓰는 계산: 대본만 받아 편집기와 같은 규칙(src/motion/direct.ts)으로
 * 「어떤 그래픽이 언제 나올지」를 내놓는다. 영상이 없으므로 시간은 대본에서 어림한다 — 편집기에서 영상을 넣으면 그 길이에 맞춰 다시 놓인다.
 */
export const MAX_SCRIPT = 6000
export const MIN_SECONDS = 3
export const MAX_SECONDS = 30 * 60

const KANA = /[\p{Script=Hiragana}\p{Script=Katakana}]/u
const HANGUL = /\p{Script=Hangul}/u
const HAN = /\p{Script=Han}/u
const CJK = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Han}]/gu

/** 글자를 보고 말한 언어를 어림한다: 가나나 한자가 있으면 일본어, 한글이 있으면 한국어, 아니면 영어 */
export function guessLang(script: string): Lang {
  if (KANA.test(script)) return 'ja'
  if (HANGUL.test(script)) return 'ko'
  if (HAN.test(script)) return 'ja'
  return 'en'
}

/**
 * 대본을 말하는 데 걸리는 시간(초) 어림. 영어는 1초에 낱말 2.5개, 한국어는 5.5자, 일본어는 6자,
 * 숫자는 한 자리에 0.3초, 문장 사이에 0.3초 쉰다고 본다. 3초~30분 사이로.
 */
export function estimateSeconds(script: string, lang: Lang): number {
  const cjk = script.match(CJK)?.length ?? 0
  const digits = script.match(/\d/g)?.length ?? 0
  const latinWords = script.replace(CJK, ' ').match(/[A-Za-zÀ-ɏ]+(?:['’-][A-Za-zÀ-ɏ]+)*/g)?.length ?? 0
  const pauses = script.match(/[.!?…。！？\n]+/g)?.length ?? 0
  const seconds = latinWords / 2.5 + cjk / (lang === 'ja' ? 6 : 5.5) + digits * 0.3 + pauses * 0.3
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(seconds * 10) / 10))
}

/** 계획 속 그래픽 하나(편집기가 AI 에게 보내는 요약과 같은 꼴에서 id 를 뺀 것 — 자막은 낱말 없이 시간만) */
export type PlannedGraphic = { kind: GraphicKind; start: number; end: number } & Record<string, unknown>

export type Plan = { ok: true; language: Lang; seconds: number; estimated: boolean; graphics: PlannedGraphic[] } | { ok: false; error: 'empty' | 'too_long' | 'bad_seconds' }

export function planFromScript(script: string, options: { language?: Lang; seconds?: number }): Plan {
  if (scriptTokens(script).length === 0) return { ok: false, error: 'empty' }
  if (script.length > MAX_SCRIPT) return { ok: false, error: 'too_long' }
  const language = options.language ?? guessLang(script)
  const given = options.seconds
  if (given !== undefined && !(Number.isFinite(given) && given >= 1 && given <= MAX_SECONDS)) return { ok: false, error: 'bad_seconds' }
  const seconds = given ?? estimateSeconds(script, language)
  const graphics = compactGraphics(clampToDuration(direct(scriptToWords(script, seconds)), seconds)).map((graphic): PlannedGraphic => {
    const planned: Record<string, unknown> = { ...graphic }
    delete planned.id
    return { ...planned, kind: graphic.kind, start: graphic.start, end: graphic.end }
  })
  return { ok: true, language, seconds, estimated: given === undefined, graphics }
}

function summary(g: PlannedGraphic): string {
  switch (g.kind) {
    case 'title':
    case 'callout':
      return String(g.text ?? '')
    case 'quote':
      return [g.text, g.author].filter(Boolean).join(' — ')
    case 'lowerThird':
      return [g.name, g.role].filter(Boolean).join(', ')
    case 'stat':
      return [`${g.prefix ?? ''}${g.value}${g.suffix ?? ''}`, g.label].filter(Boolean).join(' ')
    case 'bars':
      return [g.title, (g.items as { label: string; value: number }[]).map((item) => `${item.label} ${item.value}`).join(' · ')].filter(Boolean).join(': ')
    case 'list':
      return [g.title, (g.items as string[]).join(' · ')].filter(Boolean).join(': ')
    default:
      return ''
  }
}

/** 계획을 사람이 읽는 글로: 그래픽마다 「0.0–2.4s 제목: …」 한 줄(종류 이름은 그 언어로) */
export function describePlan(plan: Extract<Plan, { ok: true }>): string {
  const kinds = EDITOR_COPY[plan.language].graphics.kinds
  return plan.graphics
    .map((graphic) => {
      const text = summary(graphic)
      return `${graphic.start.toFixed(1)}–${graphic.end.toFixed(1)}s ${kinds[graphic.kind]}${text ? `: ${text}` : ''}`
    })
    .join('\n')
}

const DRAFT_ID = /^d_[0-9a-f]{32}$/

/** 초안 번호 꼴(server/app/connect.ts 가 만든다: d_ + 16바이트 16진수 — 짐작할 수 없는 값) */
export function isDraftId(value: unknown): value is string {
  return typeof value === 'string' && DRAFT_ID.test(value)
}

/** 초안을 여는 편집기 주소(그 언어의 편집기) */
export function draftPath(lang: Lang, id: string): string {
  return `${pagePath('app', lang)}?draft=${id}`
}
