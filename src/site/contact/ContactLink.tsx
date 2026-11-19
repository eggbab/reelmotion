import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { useLang } from '../../lang'
import { pagePath } from '../routes'
import type { ContactKind } from './rules'

/** 문의하기 쪽으로 가는 링크. 지금 쪽 주소를 함께 넘겨, 고장 신고가 어느 화면 이야기인지 알 수 있게 한다(ContactPage). */
export function ContactLink({ kind, className, children }: { kind?: ContactKind; className?: string; children: ReactNode }) {
  const { lang } = useLang()
  const { pathname } = useLocation()
  return (
    <Link to={`${pagePath('contact', lang)}${kind ? `?kind=${kind}` : ''}`} state={{ from: pathname }} className={className}>
      {children}
    </Link>
  )
}
