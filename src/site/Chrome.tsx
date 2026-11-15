import { Globe, Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useLang } from '../lang'
import { LANGS } from '../langs'
import type { Lang } from '../langs'
import { BUSINESS } from './business'
import type { SiteCopy } from './copy'

export function Logo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <rect x="2" y="4" width="20" height="16" rx="5" fill="currentColor" />
        <path d="M10 8.5v7l6-3.5z" fill="#0e0e13" />
      </svg>
      ReelMotion
    </span>
  )
}

export function LangPicker({ label, className }: { label: string; className?: string }) {
  const { lang, setLang } = useLang()
  return (
    <label className={`lang-picker ${className ?? ''}`}>
      <Globe size={14} aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <select value={lang} onChange={(event) => setLang(event.target.value as Lang)}>
        {LANGS.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Header({ copy }: { copy: SiteCopy }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const links = (
    <>
      <a href="#product">{copy.nav.product}</a>
      <a href="#styles">{copy.nav.styles}</a>
      <a href="#pricing">{copy.nav.pricing}</a>
      <a href="#faq">{copy.nav.faq}</a>
    </>
  )
  return (
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <a className="skip" href="#main">
        {copy.nav.skip}
      </a>
      <p className="announce">
        <span>{copy.announce.text}</span>
        <span className="announce__badge">{copy.announce.badge}</span>
      </p>
      <nav className="nav" aria-label={copy.nav.menu}>
        <Link to="/" className="nav__logo">
          <Logo />
        </Link>
        <div className="nav__links">{links}</div>
        <div className="nav__side">
          <LangPicker label={copy.nav.language} />
          <Link to="/app" className="btn-ghost">
            {copy.nav.start} →
          </Link>
          <details className="nav__menu">
            <summary aria-label={copy.nav.menu}>
              <Menu size={18} />
            </summary>
            <div>{links}</div>
          </details>
        </div>
      </nav>
    </header>
  )
}

/** 첫 화면을 지나면 화면 아래에 떠 있는 입력 칸. 적은 말을 편집기로 넘겨 그래픽을 만든다. */
export function FloatingBar({ copy }: { copy: SiteCopy }) {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [shown, setShown] = useState(false)
  const [turn, setTurn] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const end = document.querySelector('[data-page-end]')
      const nearEnd = end ? end.getBoundingClientRect().top < window.innerHeight * 0.9 : false
      setShown(window.scrollY > window.innerHeight * 0.35 && !nearEnd)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    const timer = window.setInterval(() => setTurn((value) => value + 1), 3200)
    return () => window.clearInterval(timer)
  }, [])
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const script = text.trim()
    navigate(script ? `/app?script=${encodeURIComponent(script)}` : '/app')
  }
  const placeholder = copy.floating.placeholders[turn % copy.floating.placeholders.length]
  return (
    <form className={`floating ${shown ? 'is-shown' : ''}`} onSubmit={submit} aria-hidden={!shown}>
      <label className="sr-only" htmlFor="floating-input">
        {copy.floating.label}
      </label>
      <input id="floating-input" value={text} onChange={(event) => setText(event.target.value)} placeholder={placeholder} maxLength={300} tabIndex={shown ? undefined : -1} />
      <button type="submit" tabIndex={shown ? undefined : -1}>
        {copy.floating.button}
      </button>
    </form>
  )
}

export function Footer({ copy }: { copy: SiteCopy }) {
  const f = copy.footer
  return (
    <footer className="site-footer" data-page-end>
      <div className="site-footer__inner">
        <h2>{f.title}</h2>
        <div className="site-footer__cols">
          <div>
            <p className="label">{f.product}</p>
            <ul>
              <li>
                <Link to="/app">{f.links.editor}</Link>
              </li>
              <li>
                <a href="#styles">{f.links.styles}</a>
              </li>
              <li>
                <a href="#pricing">{f.links.pricing}</a>
              </li>
              <li>
                <a href="#faq">{f.links.faq}</a>
              </li>
            </ul>
          </div>
          <div>
            <p className="label">{f.company}</p>
            <dl>
              <div>
                <dt>{f.business.name}</dt>
                <dd>{BUSINESS.name}</dd>
              </div>
              <div>
                <dt>{f.business.representative}</dt>
                <dd>{BUSINESS.representative}</dd>
              </div>
              <div>
                <dt>{f.business.registration}</dt>
                <dd>{BUSINESS.registrationNumber}</dd>
              </div>
              <div>
                <dt>{f.business.mailOrder}</dt>
                <dd>{BUSINESS.mailOrderNumber}</dd>
              </div>
              <div>
                <dt>{f.business.address}</dt>
                <dd>{BUSINESS.address}</dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="site-footer__bottom">
          <p>{f.rights}</p>
          <LangPicker label={copy.nav.language} className="lang-picker--light" />
        </div>
      </div>
      <p className="site-footer__mark" aria-hidden="true">
        ReelMotion
      </p>
    </footer>
  )
}
