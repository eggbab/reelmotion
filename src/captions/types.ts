/** 한 어절(띄어쓰기 단위)과 그 말이 나오는 시간(초). */
export type Word = {
  text: string
  start: number
  end: number
  /** 대본에서 이 어절 뒤에 줄이 바뀐다 — 자막도 여기서 끊는다. */
  lineEnd?: boolean
  /** 다음 낱말과 빈칸 없이 붙여 쓴다(일본어처럼 띄어쓰기가 없는 말). */
  joinNext?: boolean
}

/** 화면에 한 번에 뜨는 자막 한 덩어리. */
export type Cue = { words: Word[]; start: number; end: number }

/** 디자인 묶음의 지역. 한국 → 일본 → 영어권 순서로 늘린다. */
export type Region = 'kr' | 'jp' | 'global'

export type Entrance = 'none' | 'pop' | 'slide' | 'shake'

/** 글자 테두리 한 겹. width 는 글자 크기에 대한 비율이고, 바깥 겹부터 적는다. */
export type StrokeLayer = { color: string; width: number }

export type CaptionStyle = {
  id: string
  region: Region
  fontFamily: string
  fontWeight: number
  /** 화면 높이에 대한 글자 크기 비율 */
  fontSize: number
  fill: string
  /** 지금 말하는 어절의 색 */
  activeFill: string
  strokes: StrokeLayer[]
  /** 글자 크기에 대한 비율 */
  shadow?: { color: string; offsetY: number }
  box?: { color: string; paddingX: number; paddingY: number; radius: number }
  entrance: Entrance
  /** 지금 말하는 어절이 톡 튀는지 */
  wordPop: boolean
  /** 자막 가운데의 세로 위치(화면 높이에 대한 비율) */
  position: number
  maxCharsPerCue: number
}
