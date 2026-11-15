/**
 * 소개 페이지와 편집 화면의 예시 영상. 모두 Mixkit 「Stock Video Free License」(상업 이용 가능, 출처 표시 불필요)
 * — 2026-11-15 각 영상 페이지에서 라이선스 이름을 확인했다. 원본 번호는 `source`.
 * 소리는 없다(원본에 의미 있는 말이 없어서 뺐다). 화면 속 사람의 이름·직업은 예시로 붙인 것이다.
 */
export type ClipId = 'explainer' | 'studio' | 'shorts-a' | 'shorts-b' | 'podcast-a' | 'podcast-b' | 'podcast-c' | 'teacher'

export type Clip = { id: ClipId; portrait: boolean; source: number }

export const CLIPS: Record<ClipId, Clip> = {
  explainer: { id: 'explainer', portrait: false, source: 4834 },
  studio: { id: 'studio', portrait: false, source: 41272 },
  'shorts-a': { id: 'shorts-a', portrait: true, source: 42323 },
  'shorts-b': { id: 'shorts-b', portrait: true, source: 41290 },
  'podcast-a': { id: 'podcast-a', portrait: false, source: 2955 },
  'podcast-b': { id: 'podcast-b', portrait: false, source: 52184 },
  'podcast-c': { id: 'podcast-c', portrait: false, source: 44048 },
  teacher: { id: 'teacher', portrait: false, source: 50117 },
}

/** 예시 영상은 10초짜리다 */
export const CLIP_SECONDS = 10

export const clipUrl = (id: ClipId, small = false) => `/media/${id}${small ? '-sm' : ''}.mp4`
export const posterUrl = (id: ClipId) => `/media/${id}.jpg`
