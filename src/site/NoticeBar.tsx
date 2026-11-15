import { X } from 'lucide-react'
import type { Lang } from '../langs'
import { NOTICE_CLOSE, NOTICE_LABEL, useNotice } from './notice'

type Shown = NonNullable<ReturnType<typeof useNotice>>

/** 공지 한 줄(모양만). 사이트에서는 맨 위 띠 자리에, 편집기에서는 맨 위에 놓는다. */
export function NoticeLine({ notice, lang, className = '' }: { notice: Shown; lang: Lang; className?: string }) {
  return (
    <p className={`notice is-${notice.level} ${className}`.trim()} role="status">
      <span className="notice__label">{NOTICE_LABEL[lang]}</span>
      <span>{notice.text}</span>
      <button type="button" className="notice__close" onClick={notice.close} aria-label={NOTICE_CLOSE[lang]} title={NOTICE_CLOSE[lang]}>
        <X size={14} aria-hidden="true" />
      </button>
    </p>
  )
}

/** 편집기 위의 공지(없거나 닫았으면 아무것도 그리지 않는다). */
export function NoticeBar({ lang }: { lang: Lang }) {
  const notice = useNotice(lang)
  return notice ? <NoticeLine notice={notice} lang={lang} /> : null
}
