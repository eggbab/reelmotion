import type { Word } from '../captions/types'

/** 모션그래픽 한 덩어리. 시간은 영상 기준 초. */
export type GraphicKind = 'title' | 'lowerThird' | 'stat' | 'bars' | 'list' | 'callout' | 'quote' | 'captions'

type Base = { id: string; start: number; end: number }

export type TitleGraphic = Base & { kind: 'title'; text: string; /** 강조할 낱말의 순번(없으면 강조 없음) */ emphasis?: number }
export type LowerThirdGraphic = Base & { kind: 'lowerThird'; name: string; role: string }
export type StatGraphic = Base & {
  kind: 'stat'
  value: number
  prefix: string
  suffix: string
  decimals: number
  label: string
}
export type BarsGraphic = Base & { kind: 'bars'; title: string; unit: string; items: { label: string; value: number }[] }
export type ListGraphic = Base & {
  kind: 'list'
  title: string
  items: string[]
  /** 항목마다 나타나는 시각(없으면 차례로) */
  itemTimes?: number[]
}
export type CalloutGraphic = Base & { kind: 'callout'; text: string; /** 가리키는 곳(화면에 대한 비율) */ x: number; y: number }
export type QuoteGraphic = Base & { kind: 'quote'; text: string; author: string }
export type CaptionsGraphic = Base & { kind: 'captions'; words: Word[] }

export type Graphic =
  | TitleGraphic
  | LowerThirdGraphic
  | StatGraphic
  | BarsGraphic
  | ListGraphic
  | CalloutGraphic
  | QuoteGraphic
  | CaptionsGraphic

export type ThemeId = 'clean' | 'neon' | 'bold' | 'editorial' | 'seoul' | 'tokyo'

export type Stroke = { color: string; width: number }

export type Theme = {
  id: ThemeId
  /** 디자인 묶음이 어느 지역 감성인지 */
  region: 'global' | 'kr' | 'jp'
  /** 본문 글꼴(캔버스 font 문자열에 그대로 들어간다) */
  font: string
  /** 제목 글꼴 */
  display: string
  displayWeight: number
  bodyWeight: number
  strongWeight: number
  displayItalic: boolean
  upper: boolean
  /** 판 위의 글자 */
  ink: string
  /** 영상 위에 바로 놓이는 글자 */
  onVideo: string
  /** 판 색 */
  paper: string
  accent: string
  /** 강조색 위의 글자 */
  accentInk: string
  muted: string
  panel: 'glass' | 'solid' | 'none'
  /** 모서리(짧은 변의 1% 단위) */
  radius: number
  /** 영상 위 글자 테두리(바깥부터). 비어 있으면 그림자만 */
  outline: Stroke[]
  caption: {
    font: string
    weight: number
    fill: string
    active: string
    outline: Stroke[]
    box: string | null
    upper: boolean
    pop: boolean
  }
}

/** 한 편의 구성: 화면 비율과 디자인 묶음과 그래픽들 */
export type Composition = { theme: ThemeId; graphics: Graphic[] }
