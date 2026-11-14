import type { CaptionStyle } from './types'

/**
 * 자막 디자인 묶음. 화면·그리기 코드는 이 표만 본다 — 디자인을 더할 때 여기만 고친다.
 * 글꼴은 모두 SIL Open Font License(영상에 써도 되고 함께 배포해도 됨).
 */
export const CAPTION_STYLES: CaptionStyle[] = [
  {
    id: 'kr-yeneung',
    region: 'kr',
    fontFamily: '"Black Han Sans", "Noto Sans KR", sans-serif',
    fontWeight: 400,
    fontSize: 0.062,
    fill: '#ffffff',
    activeFill: '#ffe600',
    strokes: [{ color: '#111111', width: 0.24 }],
    shadow: { color: 'rgba(0, 0, 0, 0.55)', offsetY: 0.09 },
    entrance: 'pop',
    wordPop: true,
    position: 0.72,
    maxCharsPerCue: 12,
  },
  {
    id: 'kr-talk',
    region: 'kr',
    fontFamily: '"Jua", "Noto Sans KR", sans-serif',
    fontWeight: 400,
    fontSize: 0.064,
    fill: '#ff4fa3',
    activeFill: '#ff4fa3',
    strokes: [
      { color: '#2b1020', width: 0.34 },
      { color: '#ffffff', width: 0.2 },
    ],
    entrance: 'pop',
    wordPop: true,
    position: 0.72,
    maxCharsPerCue: 11,
  },
  {
    id: 'kr-shout',
    region: 'kr',
    fontFamily: '"Do Hyeon", "Noto Sans KR", sans-serif',
    fontWeight: 400,
    fontSize: 0.074,
    fill: '#ffe600',
    activeFill: '#ffffff',
    strokes: [
      { color: '#d40000', width: 0.34 },
      { color: '#111111', width: 0.16 },
    ],
    shadow: { color: 'rgba(0, 0, 0, 0.5)', offsetY: 0.1 },
    entrance: 'shake',
    wordPop: true,
    position: 0.7,
    maxCharsPerCue: 9,
  },
  {
    id: 'kr-info',
    region: 'kr',
    fontFamily: '"Noto Sans KR", sans-serif',
    fontWeight: 700,
    fontSize: 0.046,
    fill: '#ffffff',
    activeFill: '#5ce1a6',
    strokes: [],
    box: { color: 'rgba(12, 14, 18, 0.82)', paddingX: 0.6, paddingY: 0.22, radius: 0.3 },
    entrance: 'slide',
    wordPop: false,
    position: 0.78,
    maxCharsPerCue: 16,
  },
]

export function styleById(id: string): CaptionStyle {
  return CAPTION_STYLES.find((style) => style.id === id) ?? CAPTION_STYLES[0]
}
