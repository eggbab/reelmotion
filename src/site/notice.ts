import { useEffect, useState } from 'react'
import { release } from '../http'
import type { Lang } from '../langs'

/**
 * 공지: 관리자 화면에서 쓴 글 하나를 사이트 맨 위(Chrome.tsx 의 띠)와 편집기 위(NoticeBar)에 보인다.
 * 미리 그린 HTML 에는 없고, 화면을 이어받은 뒤 /api/notice 를 물어 바꾼다(그래서 어긋나지 않는다).
 * 닫으면 그 판 번호를 이 브라우저에 기억해(localStorage, 개인정보처리방침에 적음) 다시 보이지 않는다 — 관리자가 다시 저장하면 판이 바뀌어 다시 보인다.
 */
export type Notice = { version: number; level: 'info' | 'warning'; text: Record<Lang, string> }

const CLOSED_KEY = 'reelmotion.notice.closed'
const ORDER: Lang[] = ['en', 'ko', 'ja']

export const NOTICE_CLOSE: Record<Lang, string> = { ko: '공지 닫기', en: 'Dismiss notice', ja: 'お知らせを閉じる' }
export const NOTICE_LABEL: Record<Lang, string> = { ko: '공지', en: 'Notice', ja: 'お知らせ' }

/** 지금 언어의 글, 없으면 영어 → 한국어 → 일본어 순으로 비어 있지 않은 것. */
export function pickNoticeText(notice: Notice, lang: Lang): string {
  for (const id of [lang, ...ORDER]) {
    const text = notice.text[id]?.trim()
    if (text) return text
  }
  return ''
}

export function isClosed(notice: Notice, closed: string | null): boolean {
  return closed !== null && closed === String(notice.version)
}

let request: Promise<Notice | null> | null = null

/** 쪽을 옮겨도 한 번만 묻는다. 앱 서버가 없으면(정적 사이트만) 공지도 없다. */
function loadNotice(): Promise<Notice | null> {
  request ??= fetch('/api/notice', { cache: 'no-store' })
    .then(async (response) => {
      if (response.ok && response.headers.get('content-type')?.includes('json')) return ((await response.json()) as { notice?: Notice | null }).notice ?? null
      release(response)
      return null
    })
    .catch(() => null)
  return request
}

function readClosed(): string | null {
  try {
    return localStorage.getItem(CLOSED_KEY)
  } catch {
    return null
  }
}

/** 보일 공지(닫지 않은 것)와 닫기. 없으면 null. */
export function useNotice(lang: Lang): { level: Notice['level']; text: string; close: () => void } | null {
  const [notice, setNotice] = useState<Notice | null>(null)
  useEffect(() => {
    let alive = true
    void loadNotice().then((value) => {
      if (alive && value && !isClosed(value, readClosed())) setNotice(value)
    })
    return () => {
      alive = false
    }
  }, [])
  if (!notice) return null
  const text = pickNoticeText(notice, lang)
  if (!text) return null
  return {
    level: notice.level,
    text,
    close: () => {
      try {
        localStorage.setItem(CLOSED_KEY, String(notice.version))
      } catch {
        // 저장할 수 없는 브라우저(사생활 보호 창 등)에서는 이번에만 닫는다.
      }
      setNotice(null)
    },
  }
}
