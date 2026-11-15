import { Link } from 'react-router'
import { useLang } from '../lang'
import { pagePath } from '../site/routes'
import { ACCOUNT_COPY } from './copy'
import { useSession } from './session'

/** 머리줄의 로그인 단추(로그인하면 이름 첫 글자). 계정 서버가 없거나 로그인을 아직 못 쓰면 아무것도 그리지 않는다. */
export function AccountLink({ className = '' }: { className?: string }) {
  const { lang } = useLang()
  const session = useSession()
  const copy = ACCOUNT_COPY[lang]
  if (session.status !== 'ready') return null
  const { user, login } = session.me
  if (!user && !login.google && !login.dev) return null
  const to = pagePath('account', lang)
  if (!user) {
    return (
      <Link to={to} className={`account-link ${className}`}>
        {copy.loginButton}
      </Link>
    )
  }
  const initial = (user.name || user.email).trim().charAt(0).toUpperCase()
  return (
    <Link to={to} className={`account-avatar ${className}`} aria-label={copy.account} title={user.email}>
      {initial}
    </Link>
  )
}
