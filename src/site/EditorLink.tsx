import { Link } from 'react-router'
import type { LinkProps } from 'react-router'
import { useLang } from '../lang'
import { pagePath } from './routes'

/** 지금 화면 언어의 편집기로 가는 링크(/app · /ko/app · /ja/app). */
export function EditorLink(props: Omit<LinkProps, 'to'> & { search?: string }) {
  const { lang } = useLang()
  const { search, ...rest } = props
  return <Link {...rest} to={pagePath('app', lang) + (search ?? '')} />
}
