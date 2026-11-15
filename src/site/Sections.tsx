import { AudioLines, ChevronDown, ChevronLeft, ChevronRight, ChevronRight as Arrow, PenLine, Palette, RectangleVertical, ShieldCheck, Sparkles } from 'lucide-react'
import { motion, useScroll, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { fill } from '../langs'
import type { Lang } from '../langs'
import { posterUrl } from '../media/clips'
import type { ClipId } from '../media/clips'
import { loadFontsForGraphics } from '../motion/fonts'
import { renderGraphics } from '../motion/render'
import { themeById } from '../motion/themes'
import type { Graphic, ThemeId } from '../motion/types'
import type { SiteCopy } from './copy'
import { demo } from './demos'
import type { Demo, DemoId } from './demos'
import { MotionStage } from './MotionStage'
import { PLANS, formatWon } from './plans'

/* ───────── 만들 수 있는 것 ───────── */

export function Make({ copy, lang }: { copy: SiteCopy; lang: Lang }) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start start'] })
  const tiles: { demo: Demo; only: Graphic['kind'] }[] = useMemo(
    () => [
      { demo: demo('sleep', lang, 'neon'), only: 'title' },
      { demo: demo('podcast', lang, 'clean'), only: 'lowerThird' },
      { demo: demo('growth', lang, 'bold'), only: 'stat' },
      { demo: demo('studio', lang, 'neon'), only: 'bars' },
      { demo: demo('classroom', lang, 'clean'), only: 'list' },
    ],
    [lang],
  )
  return (
    <section className="make" ref={ref}>
      <div className="glow glow--top" aria-hidden="true" />
      <div className="make__strip">
        {tiles.map((tile, i) => (
          <StripTile key={i} index={i} progress={scrollYProgress} demo={tile.demo} only={tile.only} label={copy.make.tiles[i]} />
        ))}
      </div>
      <div className="container center">
        <p className="eyebrow">{copy.make.eyebrow}</p>
        <h2>{copy.make.title}</h2>
        <p className="lead-sm">{copy.make.body}</p>
      </div>
      <ol className="container cols">
        {copy.make.cols.map((col, i) => (
          <li key={col.title}>
            <span className="cols__num">{String(i + 1).padStart(2, '0')}</span>
            <h3>{col.title}</h3>
            <p>{col.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function StripTile({ index, progress, demo: d, only, label }: { index: number; progress: MotionValue<number>; demo: Demo; only: Graphic['kind']; label: string }) {
  // 가운데 타일이 먼저, 바깥 타일이 늦게 제자리로 올라온다.
  const lag = Math.abs(index - 2) * 0.12
  const y = useTransform(progress, [0, 0.7 + lag], [180 + Math.abs(index - 2) * 60, 0])
  const graphics = useMemo(
    () =>
      d.graphics
        .filter((g) => g.kind === only)
        .map((g) => (g.kind === 'list' ? { ...g, start: 0.2, end: 9.8, itemTimes: g.items.map((_, i) => 0.8 + i * 0.7) } : { ...g, start: 0.2, end: 9.8 })),
    [d, only],
  )
  return (
    <motion.figure className="strip-tile" style={{ y }}>
      <MotionStage clip={d.clip} graphics={graphics} theme={d.theme} small label={label} />
      <figcaption>{label}</figcaption>
    </motion.figure>
  )
}

/* ───────── 스타일 묶음 넘기기 ───────── */

const STYLE_DEMOS: { theme: ThemeId; id: DemoId; lang?: Lang }[] = [
  { theme: 'neon', id: 'sleep' },
  { theme: 'clean', id: 'podcast' },
  { theme: 'bold', id: 'studio' },
  { theme: 'editorial', id: 'classroom' },
  { theme: 'seoul', id: 'studio', lang: 'ko' },
  { theme: 'tokyo', id: 'sleep', lang: 'ja' },
]

export function StylesCarousel({ copy, lang }: { copy: SiteCopy; lang: Lang }) {
  const track = useRef<HTMLUListElement>(null)
  const [index, setIndex] = useState(0)
  const demos = useMemo(() => STYLE_DEMOS.map((item) => ({ ...item, demo: demo(item.id, item.lang ?? lang, item.theme) })), [lang])

  useEffect(() => {
    const element = track.current
    if (!element) return
    const onScroll = () => {
      const card = element.firstElementChild as HTMLElement | null
      if (!card) return
      setIndex(Math.round(element.scrollLeft / (card.offsetWidth + 24)))
    }
    element.addEventListener('scroll', onScroll, { passive: true })
    return () => element.removeEventListener('scroll', onScroll)
  }, [])

  const go = (delta: number) => {
    const element = track.current
    const card = element?.firstElementChild as HTMLElement | null
    if (!element || !card) return
    element.scrollBy({ left: delta * (card.offsetWidth + 24), behavior: 'smooth' })
  }

  return (
    <section className="styles" id="styles">
      <div className="styles__head container-wide">
        <h2>{copy.styles.title}</h2>
        <Link to="/app" className="link-quiet">
          {copy.styles.all} ↗
        </Link>
      </div>
      <ul className="styles__track" ref={track}>
        {demos.map(({ theme, demo: d }) => {
          const look = themeById(theme)
          return (
            <li key={theme} className="style-card">
              <Link to={`/app?theme=${theme}`} aria-label={`${copy.styles.names[theme]} — ${copy.styles.about[theme]}`}>
                <MotionStage clip={d.clip} graphics={d.graphics} theme={theme} label={copy.styles.about[theme]} />
                <span className="badge">{copy.styles.regions[look.region]}</span>
              </Link>
              <h3>{copy.styles.names[theme]}</h3>
              <p>{copy.styles.about[theme]}</p>
            </li>
          )
        })}
      </ul>
      <div className="styles__controls container-wide">
        <div className="dashes" aria-hidden="true">
          {demos.map((item, i) => (
            <span key={item.theme} className={i === index ? 'is-on' : undefined} />
          ))}
        </div>
        <span className="styles__count">
          {Math.min(index + 1, demos.length)} / {demos.length}
        </span>
        <div className="styles__arrows">
          <button type="button" className="round" onClick={() => go(-1)} aria-label={copy.styles.prev}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="round" onClick={() => go(1)} aria-label={copy.styles.next}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  )
}

/* ───────── 모든 화면(흐르는 두 줄) ───────── */

const ROW_A: { id: DemoId; theme?: ThemeId }[] = [{ id: 'shorts' }, { id: 'podcast' }, { id: 'vlog' }, { id: 'growth', theme: 'clean' }, { id: 'shorts', theme: 'neon' }, { id: 'classroom' }]
const ROW_B: { id: DemoId; theme?: ThemeId }[] = [{ id: 'studio', theme: 'neon' }, { id: 'vlog', theme: 'bold' }, { id: 'story' }, { id: 'sleep', theme: 'clean' }, { id: 'shorts', theme: 'editorial' }, { id: 'growth' }]

export function Formats({ copy, lang }: { copy: SiteCopy; lang: Lang }) {
  const row = (items: typeof ROW_A, reverse: boolean) => (
    <div className={`marquee ${reverse ? 'marquee--reverse' : ''}`}>
      <div className="marquee__track">
        {[0, 1].map((copyIndex) =>
          items.map((item, i) => {
            const d = demo(item.id, lang, item.theme)
            return (
              <div key={`${copyIndex}-${i}`} className={`format-tile ${d.clip.startsWith('shorts') ? 'is-tall' : ''}`} aria-hidden={copyIndex > 0}>
                <MotionStage clip={d.clip} graphics={d.graphics} theme={d.theme} small label={copy.formats.title} />
              </div>
            )
          }),
        )}
      </div>
    </div>
  )
  return (
    <section className="formats">
      <div className="container center">
        <p className="eyebrow">{copy.formats.eyebrow}</p>
        <h2>{copy.formats.title}</h2>
        <p className="lead-sm">{copy.formats.body}</p>
      </div>
      <div className="formats__rows">
        {row(ROW_A, false)}
        {row(ROW_B, true)}
        <Link to="/app" className="btn-dark">
          <span className="dot" />
          {copy.formats.cta}
        </Link>
      </div>
    </section>
  )
}

/* ───────── 타임라인: 흩어진 카드가 줄로 정리된다 ───────── */

type Snap = { clip: ClipId; theme: ThemeId; graphics: Graphic[]; t: number; lane: number }

function Snapshot({ snap }: { snap: Snap }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let alive = true
    const image = new Image()
    image.src = posterUrl(snap.clip)
    const look = themeById(snap.theme)
    void Promise.all([image.decode().catch(() => null), loadFontsForGraphics(look, snap.graphics)]).then(() => {
      if (!alive) return
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      renderGraphics(ctx, canvas.width, canvas.height, snap.graphics, snap.t, look)
    })
    return () => {
      alive = false
    }
  }, [snap])
  return <canvas ref={canvasRef} width={480} height={270} aria-hidden="true" />
}

const SCATTER = [
  { x: -40, y: 30, r: -12 },
  { x: 160, y: -30, r: 9 },
  { x: 320, y: 60, r: -6 },
  { x: 40, y: 230, r: 7 },
  { x: 230, y: 200, r: -10 },
  { x: 400, y: 250, r: 12 },
]

export function Lanes({ copy, lang }: { copy: SiteCopy; lang: Lang }) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'center 0.5'] })
  const snaps: Snap[] = useMemo(() => {
    const sleep = demo('sleep', lang)
    const studio = demo('studio', lang)
    const podcast = demo('podcast', lang)
    const pick = (d: Demo, kind: Graphic['kind']) => d.graphics.filter((g) => g.kind === kind).map((g) => ({ ...g, start: 0, end: 20 }))
    return [
      { clip: sleep.clip, theme: 'neon', graphics: pick(sleep, 'title'), t: 2.5, lane: 0 },
      { clip: studio.clip, theme: 'bold', graphics: pick(studio, 'title'), t: 2.5, lane: 0 },
      { clip: sleep.clip, theme: 'clean', graphics: pick(sleep, 'stat'), t: 3, lane: 1 },
      { clip: studio.clip, theme: 'neon', graphics: pick(studio, 'bars'), t: 3, lane: 1 },
      { clip: podcast.clip, theme: 'clean', graphics: pick(podcast, 'captions'), t: 2, lane: 2 },
      { clip: podcast.clip, theme: 'bold', graphics: pick(podcast, 'lowerThird'), t: 3, lane: 2 },
    ]
  }, [lang])
  const laneCount = [0, 0, 0]
  return (
    <section className="lanes" ref={ref}>
      <div className="lanes__inner container-wide">
        <div className="lanes__text">
          <p className="eyebrow">{copy.lanes.eyebrow}</p>
          <h2>{copy.lanes.title}</h2>
          <p className="lead-sm">{copy.lanes.body}</p>
          <Link to="/app" className="btn-mint">
            {copy.lanes.cta} ↗
          </Link>
        </div>
        <div className="lanes__board">
          {copy.lanes.lanes.map((name, i) => (
            <div key={name} className="lane" style={{ top: `${i * 33.3}%` }}>
              <span>{name}</span>
            </div>
          ))}
          {snaps.map((snap, i) => {
            const slot = laneCount[snap.lane]++
            return <LaneCard key={i} snap={snap} from={SCATTER[i]} lane={snap.lane} slot={slot} progress={scrollYProgress} />
          })}
        </div>
      </div>
    </section>
  )
}

function LaneCard({ snap, from, lane, slot, progress }: { snap: Snap; from: (typeof SCATTER)[number]; lane: number; slot: number; progress: MotionValue<number> }) {
  const left = useTransform(progress, [0, 1], [`${from.x / 6}%`, `${14 + slot * 42}%`])
  const top = useTransform(progress, [0, 1], [`${from.y / 4.4}%`, `${lane * 33.3 + 4}%`])
  const rotate = useTransform(progress, [0, 1], [from.r, 0])
  return (
    <motion.div className="lane-card" style={{ left, top, rotate }}>
      <Snapshot snap={snap} />
    </motion.div>
  )
}

/* ───────── 낱말마다 짙어지는 문장 ───────── */

export function Statement({ copy }: { copy: SiteCopy }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.45'] })
  const words = copy.statement.text.split(' ')
  return (
    <section className="statement">
      <div className="container">
        <p className="eyebrow">{copy.statement.eyebrow}</p>
        <motion.p ref={ref} className="statement__text" style={{ '--p': scrollYProgress, '--n': words.length } as unknown as CSSProperties}>
          {words.map((word, index) => (
            <span key={index} style={{ '--i': index } as CSSProperties}>
              {word}{' '}
            </span>
          ))}
        </motion.p>
      </div>
    </section>
  )
}

/* ───────── 말로 고치는 편집(곧 나와요) ───────── */

export function Chat({ copy, lang }: { copy: SiteCopy; lang: Lang }) {
  const d = useMemo(() => demo('sleep', lang, 'neon'), [lang])
  const bigger = useMemo(() => d.graphics.filter((g) => g.kind === 'stat' || g.kind === 'captions').map((g) => (g.kind === 'stat' ? { ...g, start: 0.3, end: 9.7 } : g)), [d])
  return (
    <section className="chat">
      <div className="container">
        <span className="badge badge--soon">
          <span className="dot" />
          {copy.chat.badge}
        </span>
        <h2>{copy.chat.title}</h2>
        <p className="lead-sm left">{copy.chat.body}</p>
        <div className="chat__window">
          <div className="chat__panel">
            <p className="bubble bubble--you">{copy.chat.you}</p>
            <p className="bubble bubble--bot">{copy.chat.bot}</p>
            <div className="chat__input" aria-hidden="true">
              {copy.chat.input}
            </div>
          </div>
          <MotionStage clip={d.clip} graphics={bigger} theme="neon" label={copy.chat.title} small />
        </div>
      </div>
    </section>
  )
}

/* ───────── 어디서든 ───────── */

export function Anywhere({ copy }: { copy: SiteCopy }) {
  return (
    <section className="anywhere">
      <div className="container narrow">
        <p className="anywhere__title">{copy.anywhere.title}</p>
        <ul>
          {copy.anywhere.rows.map((row) => (
            <li key={row.name}>
              {row.open ? (
                <Link to="/app">
                  <span>{row.name}</span>
                  <Arrow size={16} aria-hidden="true" />
                </Link>
              ) : (
                <div>
                  <span>{row.name}</span>
                  <span className="muted">{row.state}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ───────── 기능 여섯 ───────── */

const ICONS = [Sparkles, AudioLines, Palette, PenLine, RectangleVertical, ShieldCheck]

export function Features({ copy }: { copy: SiteCopy }) {
  return (
    <section className="features" id="product">
      <div className="glow glow--top" aria-hidden="true" />
      <div className="container center">
        <h2>{copy.features.title}</h2>
        <p className="lead-sm">{copy.features.body}</p>
      </div>
      <ul className="container features__grid">
        {copy.features.items.map((item, i) => {
          const Icon = ICONS[i]
          return (
            <li key={item.title} className="feature">
              <span className="feature__icon">
                <Icon size={18} aria-hidden="true" />
              </span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/* ───────── 요금 ───────── */

export function Pricing({ copy }: { copy: SiteCopy }) {
  const p = copy.pricing
  return (
    <section className="pricing" id="pricing">
      <div className="container center">
        <p className="eyebrow">{p.eyebrow}</p>
        <h2>{p.title}</h2>
        <p className="lead-sm">{p.body}</p>
      </div>
      <ul className="container plans">
        {PLANS.map((plan) => (
          <li key={plan.id} className={`plan ${plan.available ? 'plan--open' : ''}`}>
            <h3>
              {p.names[plan.id]}
              {!plan.available && <span className="tag">{p.soon}</span>}
            </h3>
            <p className="plan__who">{p.whoFor[plan.id]}</p>
            <p className="plan__price">
              <strong>{formatWon(plan.monthlyWon)}</strong> {p.perMonth}
            </p>
            <ul>
              <li>{p.included}</li>
              <li>{fill(p.maxMinutes, { n: plan.maxMinutes })}</li>
              <li>{fill(p.exports, { n: plan.exportsPerMonth })}</li>
              <li>{plan.watermark ? p.watermark : p.noWatermark}</li>
            </ul>
            {plan.available && (
              <Link to="/app" className="btn-mint">
                {p.cta}
              </Link>
            )}
          </li>
        ))}
      </ul>
      <p className="container pricing__note">{p.note}</p>
    </section>
  )
}

/* ───────── 자주 묻는 질문 ───────── */

export function Faq({ copy }: { copy: SiteCopy }) {
  return (
    <section className="faq" id="faq">
      <div className="faq__inner">
        <h2>{copy.faq.title}</h2>
        {copy.faq.items.map((item) => (
          <details key={item.q}>
            <summary>
              <h3>{item.q}</h3>
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
