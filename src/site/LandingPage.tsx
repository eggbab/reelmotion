import { Check, Film, Upload } from 'lucide-react'
import { motion, useMotionTemplate, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import { Link } from 'react-router'
import { scriptToWords } from '../captions/segment'
import { CAPTION_STYLES } from '../captions/styles'
import { LANGS, MESSAGES, fill } from '../i18n'
import type { Lang } from '../i18n'
import { useLang } from '../lang'
import { BUSINESS } from './business'
import { CaptionStage } from './CaptionStage'
import type { Backdrop } from './CaptionStage'
import { SITE_COPY } from './copy'
import type { SiteCopy } from './copy'
import { PLANS, formatWon } from './plans'

/** 디자인마다 어울리는 무대 색(DESIGN.md 「무대 색」). */
const BACKDROP: Record<string, Backdrop> = {
  'kr-yeneung': 'blue',
  'kr-talk': 'ink',
  'kr-shout': 'green',
  'kr-info': 'orange',
}

const WALL_COLUMNS = 4

const styleAt = (index: number) => CAPTION_STYLES[index % CAPTION_STYLES.length]

function LangSelect({ label }: { label: string }) {
  const { lang, setLang } = useLang()
  return (
    <select className="lang-select" aria-label={label} value={lang} onChange={(event) => setLang(event.target.value as Lang)}>
      {LANGS.map(({ id, label: name }) => (
        <option key={id} value={id}>
          {name}
        </option>
      ))}
    </select>
  )
}

function SiteNav({ copy }: { copy: SiteCopy }) {
  const links = (
    <>
      <a href="#how">{copy.nav.how}</a>
      <a href="#styles">{copy.nav.styles}</a>
      <a href="#pricing">{copy.nav.pricing}</a>
      <a href="#faq">{copy.nav.faq}</a>
    </>
  )
  return (
    <header className="site-nav">
      <a className="skip" href="#main">
        {copy.hero.cta}
      </a>
      <Link to="/" className="wordmark">
        ReelMotion
      </Link>
      <nav className="site-nav__links" aria-label={copy.nav.menu}>
        {links}
      </nav>
      <div className="site-nav__side">
        <LangSelect label={copy.footer.language} />
        <Link to="/app" className="button primary site-nav__cta">
          {copy.nav.open}
        </Link>
        <details className="site-nav__menu">
          <summary className="button">{copy.nav.menu}</summary>
          <nav aria-label={copy.nav.menu}>{links}</nav>
        </details>
      </div>
    </header>
  )
}

/** 제목을 자막처럼: 형광펜이 말하는 박자로 조각을 하나씩 짚는다. */
function SpokenTitle({ parts }: { parts: string[] }) {
  const still = useReducedMotion()
  const [beat, setBeat] = useState(0)

  useEffect(() => {
    if (still) return
    const timer = window.setInterval(() => setBeat((value) => value + 1), 480)
    return () => window.clearInterval(timer)
  }, [still])

  // 조각을 다 짚은 뒤 세 박자 쉬고 처음으로.
  const spoken = still ? -1 : beat % (parts.length + 3)
  return (
    <h1 className="hero__title">
      {parts.map((part, index) => (
        <span key={index} className={index === spoken ? 'is-spoken' : undefined}>
          {part}{' '}
        </span>
      ))}
    </h1>
  )
}

function Hero({ copy }: { copy: SiteCopy }) {
  const wallRef = useRef<HTMLDivElement>(null)
  const [typed, setTyped] = useState('')
  const line = typed.trim() || copy.hero.tryDefault

  const columns = useMemo(() => {
    const perColumn = Math.ceil(copy.hero.wall.length / WALL_COLUMNS)
    return Array.from({ length: WALL_COLUMNS }, (_, column) => copy.hero.wall.slice(column * perColumn, (column + 1) * perColumn))
  }, [copy.hero.wall])

  // 마우스를 따라 뒤쪽 벽이 살짝 반대로 움직인다.
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const wall = wallRef.current
    if (!wall || event.pointerType !== 'mouse') return
    const box = event.currentTarget.getBoundingClientRect()
    wall.style.setProperty('--mx', String((event.clientX - box.left) / box.width - 0.5))
    wall.style.setProperty('--my', String((event.clientY - box.top) / box.height - 0.5))
  }

  return (
    <section className="hero" onPointerMove={onPointerMove}>
      <div className="hero__text">
        <SpokenTitle parts={copy.hero.title} />
        <p className="hero__lead">{copy.hero.lead}</p>
        <label className="try">
          <span>{copy.hero.tryLabel}</span>
          <input
            type="text"
            value={typed}
            maxLength={40}
            placeholder={copy.hero.tryPlaceholder}
            onChange={(event) => setTyped(event.target.value)}
          />
        </label>
        <div className="hero__action">
          <Link to="/app" className="button primary big" data-hero-cta>
            {copy.hero.cta}
          </Link>
          <p>{copy.hero.ctaNote}</p>
        </div>
      </div>

      <div className="hero__show">
        <div className="wall" ref={wallRef} aria-hidden="true">
          {columns.map((lines, column) => (
            <div key={column} className={`wall__column wall__column--${column}`}>
              {/* 끊김 없이 돌도록 같은 줄을 두 번 놓는다. */}
              {[...lines, ...lines].map((text, index) => {
                const style = styleAt(column + index)
                return (
                  <CaptionStage
                    key={index}
                    script={text}
                    styleId={style.id}
                    backdrop={BACKDROP[style.id]}
                    scale={2.5}
                    position={0.5}
                    phase={column * 0.7 + index * 0.45}
                    className="wall__tile"
                  />
                )
              })}
            </div>
          ))}
        </div>
        <CaptionStage script={line} styleId="kr-yeneung" backdrop="ink" scale={1.3} position={0.62} className="hero__stage" />
      </div>
    </section>
  )
}

function UploadVisual({ copy }: { copy: SiteCopy }) {
  return (
    <div className="mock">
      <div className="mock__drop">
        <Upload size={20} aria-hidden="true" />
        <span>{copy.how.upload.drop}</span>
      </div>
      <div className="mock__file">
        <Film size={16} aria-hidden="true" />
        <span>{copy.how.upload.file}</span>
        <Check size={16} aria-hidden="true" />
      </div>
    </div>
  )
}

function ListenVisual({ copy }: { copy: SiteCopy }) {
  const words = useMemo(() => scriptToWords(copy.how.listen.sample, 4.2), [copy.how.listen.sample])
  return (
    <div className="mock">
      <ul className="words">
        {words.map((word, index) => (
          <li key={index} style={{ '--delay': `${index * 0.16}s` } as CSSProperties}>
            <span>{word.text}</span>
            <small>{fill(copy.how.listen.seconds, { n: word.start.toFixed(1) })}</small>
          </li>
        ))}
      </ul>
      <p className="mock__note">{copy.how.listen.caption}</p>
    </div>
  )
}

function FixVisual({ copy }: { copy: SiteCopy }) {
  const { before, wrong, right, after, note } = copy.how.fix
  return (
    <div className="mock">
      <p className="fix">
        {before} <del>{wrong}</del> <ins>{right}</ins> {after}
      </p>
      <p className="mock__note">{note}</p>
    </div>
  )
}

function PickVisual({ copy, lang, active }: { copy: SiteCopy; lang: Lang; active: boolean }) {
  const still = useReducedMotion()
  const [turn, setTurn] = useState(0)
  useEffect(() => {
    if (!active || still) return
    const timer = window.setInterval(() => setTurn((value) => value + 1), 2200)
    return () => window.clearInterval(timer)
  }, [active, still])
  const style = styleAt(turn)
  return (
    <div className="mock mock--pick">
      <CaptionStage script={copy.how.listen.sample} styleId={style.id} backdrop={BACKDROP[style.id]} scale={1.15} className="mock__stage" />
      <p className="mock__note">
        <strong>{MESSAGES[lang].styleNames[style.id]}</strong> {copy.how.pick.caption}
      </p>
    </div>
  )
}

/** 스크롤하면 검은 무대가 화면을 채우고, 그 안에서 네 단계가 차례로 바뀐다. 좁은 화면에서는 그냥 아래로 이어 놓는다. */
function HowItWorks({ copy, lang }: { copy: SiteCopy; lang: Lang }) {
  const sectionRef = useRef<HTMLElement>(null)
  const [step, setStep] = useState(0)

  const enter = useScroll({ target: sectionRef, offset: ['start end', 'start start'] }).scrollYProgress
  const inset = useTransform(enter, [0, 1], [7, 0])
  const radius = useTransform(enter, [0, 1], [44, 0])
  const clipPath = useMotionTemplate`inset(0 ${inset}% round ${radius}px)`

  const through = useScroll({ target: sectionRef, offset: ['start start', 'end end'] }).scrollYProgress
  useMotionValueEvent(through, 'change', (value) => {
    setStep(Math.min(copy.how.steps.length - 1, Math.floor(value * copy.how.steps.length)))
  })

  const visuals: ReactNode[] = [
    <UploadVisual key="upload" copy={copy} />,
    <ListenVisual key="listen" copy={copy} />,
    <FixVisual key="fix" copy={copy} />,
    <PickVisual key="pick" copy={copy} lang={lang} active={step === 3} />,
  ]

  return (
    <section className="how" id="how" ref={sectionRef}>
      <motion.div className="how__panel" style={{ clipPath }}>
        <div className="how__inner">
          <h2>{copy.how.title}</h2>
          <ol className="steps">
            {copy.how.steps.map((item, index) => (
              <li key={index} className={index === step ? 'is-active' : undefined} aria-current={index === step ? 'step' : undefined}>
                <div className="steps__text">
                  <span className="steps__number">{index + 1}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
                <div className="steps__visual">{visuals[index]}</div>
              </li>
            ))}
          </ol>
        </div>
      </motion.div>
    </section>
  )
}

/** 스크롤에 맞춰 낱말이 하나씩 짙어진다. */
function Statement({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.45'] })
  const words = text.split(' ')
  return (
    <section className="statement">
      <motion.p ref={ref} style={{ '--p': scrollYProgress, '--n': words.length } as unknown as CSSProperties}>
        {words.map((word, index) => (
          <span key={index} style={{ '--i': index } as CSSProperties}>
            {word}{' '}
          </span>
        ))}
      </motion.p>
    </section>
  )
}

function StyleRow({ copy, lang, reverse }: { copy: SiteCopy; lang: Lang; reverse: boolean }) {
  const order = reverse ? [...CAPTION_STYLES].reverse() : CAPTION_STYLES
  const lines = reverse ? copy.hero.wall.slice(6) : copy.hero.wall
  // 끊김 없이 흐르도록 같은 묶음을 세 번 놓는다. 둘째부터는 키보드와 읽기 프로그램에서 감춘다.
  return (
    <div className={`marquee ${reverse ? 'marquee--reverse' : ''}`}>
      <div className="marquee__track">
        {[0, 1, 2].map((copyIndex) =>
          order.map((style, index) => (
            <Link
              key={`${copyIndex}-${style.id}`}
              to={`/app?style=${style.id}`}
              className="style-card"
              aria-hidden={copyIndex > 0}
              tabIndex={copyIndex > 0 ? -1 : undefined}
              aria-label={`${MESSAGES[lang].styleNames[style.id]} — ${copy.styles.open}`}
            >
              <CaptionStage
                script={lines[index % lines.length]}
                styleId={style.id}
                backdrop={BACKDROP[style.id]}
                scale={2.3}
                position={0.5}
                phase={index * 0.6 + copyIndex * 0.3}
                className="style-card__stage"
              />
              <span>{MESSAGES[lang].styleNames[style.id]}</span>
            </Link>
          )),
        )}
      </div>
    </div>
  )
}

function Pricing({ copy }: { copy: SiteCopy }) {
  const p = copy.pricing
  return (
    <section className="pricing" id="pricing">
      <div className="section-head">
        <h2>{p.title}</h2>
        <p>{p.body}</p>
      </div>
      <ul className="plans">
        {PLANS.map((plan) => (
          <li key={plan.id} className={plan.available ? 'plan plan--open' : 'plan'}>
            <h3>
              {p.names[plan.id]}
              {!plan.available && <span className="tag">{p.soon}</span>}
            </h3>
            <p className="plan__who">{p.whoFor[plan.id]}</p>
            <p className="plan__price">
              <strong>{formatWon(plan.monthlyWon)}</strong> {p.perMonth}
            </p>
            <ul className="plan__list">
              <li>{p.included}</li>
              <li>{fill(p.maxMinutes, { n: plan.maxMinutes })}</li>
              <li>{fill(p.exportsPerMonth, { n: plan.exportsPerMonth })}</li>
              <li>{plan.watermark ? p.watermark : p.noWatermark}</li>
            </ul>
            {plan.available && (
              <Link to="/app" className="button primary">
                {p.freeCta}
              </Link>
            )}
          </li>
        ))}
      </ul>
      <p className="pricing__note">{p.plannedNote}</p>
    </section>
  )
}

/** 첫 화면의 단추가 안 보일 때만 아래에 떠 있는 단추. 바닥글에서는 숨는다. */
function FloatingAction({ label }: { label: string }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const cta = document.querySelector('[data-hero-cta]')
    const end = document.querySelector('[data-page-end]')
    if (!cta || !end) return
    const seen = new Map<Element, boolean>()
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) seen.set(entry.target, entry.isIntersecting)
      setShown(seen.get(cta) === false && seen.get(end) !== true)
    })
    observer.observe(cta)
    observer.observe(end)
    return () => observer.disconnect()
  }, [])
  return (
    <div className={`floating ${shown ? 'is-shown' : ''}`} aria-hidden={!shown}>
      <Link to="/app" className="button accent big" tabIndex={shown ? undefined : -1}>
        {label}
      </Link>
    </div>
  )
}

export function LandingPage() {
  const { lang } = useLang()
  const copy = SITE_COPY[lang]

  useEffect(() => {
    document.title = `ReelMotion — ${copy.hero.title.join(' ')}`
  }, [copy])

  return (
    <div className="site">
      <SiteNav copy={copy} />
      <main id="main">
        <Hero copy={copy} />
        <HowItWorks copy={copy} lang={lang} />
        <Statement text={copy.statement} />

        <section className="styles-show" id="styles">
          <div className="section-head">
            <h2>{copy.styles.title}</h2>
            <p>{copy.styles.body}</p>
          </div>
          <StyleRow copy={copy} lang={lang} reverse={false} />
          <StyleRow copy={copy} lang={lang} reverse />
        </section>

        <Pricing copy={copy} />

        <section className="faq" id="faq">
          <h2>{copy.faq.title}</h2>
          <div className="faq__list">
            {copy.faq.items.map((item, index) => (
              <details key={index}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer" data-page-end>
        <div className="closing">
          <h2>{copy.closing.title}</h2>
          <Link to="/app" className="button accent big">
            {copy.closing.cta}
          </Link>
        </div>
        <div className="site-footer__info">
          <dl aria-label={copy.footer.business}>
            <div>
              <dt>{copy.footer.name}</dt>
              <dd>{BUSINESS.name}</dd>
            </div>
            <div>
              <dt>{copy.footer.representative}</dt>
              <dd>{BUSINESS.representative}</dd>
            </div>
            <div>
              <dt>{copy.footer.registrationNumber}</dt>
              <dd>{BUSINESS.registrationNumber}</dd>
            </div>
            <div>
              <dt>{copy.footer.mailOrderNumber}</dt>
              <dd>{BUSINESS.mailOrderNumber}</dd>
            </div>
            <div>
              <dt>{copy.footer.address}</dt>
              <dd>{BUSINESS.address}</dd>
            </div>
          </dl>
          <LangSelect label={copy.footer.language} />
        </div>
        <p className="site-footer__mark" aria-hidden="true">
          ReelMotion
        </p>
      </footer>

      <FloatingAction label={copy.hero.cta} />
    </div>
  )
}
