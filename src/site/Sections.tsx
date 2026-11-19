import { AudioLines, ChevronDown, ChevronLeft, ChevronRight, ChevronRight as Arrow, PenLine, Palette, RectangleVertical, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router'
import { useLang } from '../lang'
import { fill } from '../langs'
import { canPromptInstall, promptInstall } from '../pwa/install'
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
import { useScrollVar } from './scrollProgress'
import { useScrollable } from './useScrollable'
import { PLANS, formatWon } from './plans'
import type { Plan } from './plans'
import { EditorLink } from './EditorLink'
import { pagePath } from './routes'

/* ───────── 만들 수 있는 것 ───────── */

export function Make({ copy, lang }: { copy: SiteCopy; lang: Lang }) {
  const ref = useRef<HTMLElement>(null)
  // 휴대폰에서는 이 줄을 옆으로 민다(site.css) — 그때는 키보드로도 닿게
  const strip = useRef<HTMLDivElement>(null)
  const stripScrolls = useScrollable(strip)
  // 이 구역의 위가 창의 아래 → 창의 위: 타일이 제자리로 올라온다(site.css 의 .strip-tile)
  useScrollVar(ref, ['start end', 'start start'])
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
      <div className="make__strip" ref={strip} tabIndex={stripScrolls ? 0 : undefined} role={stripScrolls ? 'region' : undefined} aria-label={stripScrolls ? copy.make.title : undefined}>
        {tiles.map((tile, i) => (
          <StripTile key={i} index={i} demo={tile.demo} only={tile.only} label={copy.make.tiles[i]} />
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

function StripTile({ index, demo: d, only, label }: { index: number; demo: Demo; only: Graphic['kind']; label: string }) {
  // 가운데 타일이 먼저, 바깥 타일이 늦게 제자리로 올라온다: 진행 0 → (0.7 + 늦음) 동안 아래 (180 + 60 × 가운데서 떨어진 칸)px 에서 0 으로
  const away = Math.abs(index - 2)
  const place = { '--until': 0.7 + away * 0.12, '--from': `${180 + away * 60}px` } as CSSProperties
  const graphics = useMemo(
    () =>
      d.graphics
        .filter((g) => g.kind === only)
        .map((g) => (g.kind === 'list' ? { ...g, start: 0.2, end: 9.8, itemTimes: g.items.map((_, i) => 0.8 + i * 0.7) } : { ...g, start: 0.2, end: 9.8 })),
    [d, only],
  )
  return (
    <figure className="strip-tile" style={place}>
      <MotionStage clip={d.clip} graphics={graphics} theme={d.theme} small label={label} />
      <figcaption>{label}</figcaption>
    </figure>
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
        <EditorLink className="link-quiet">
          {copy.styles.all} ↗
        </EditorLink>
      </div>
      <ul className="styles__track" ref={track}>
        {demos.map(({ theme, demo: d }) => {
          const look = themeById(theme)
          return (
            <li key={theme} className="style-card">
              <EditorLink search={`?theme=${theme}`} aria-label={`${copy.styles.regions[look.region]} · ${copy.styles.names[theme]} — ${copy.styles.about[theme]}`}>
                <MotionStage clip={d.clip} graphics={d.graphics} theme={theme} label={copy.styles.about[theme]} />
                <span className="badge">{copy.styles.regions[look.region]}</span>
              </EditorLink>
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

/** 흐르는 띠 한 줄. 「움직임 줄이기」를 켜면 흐르지 않고 손으로 미는 띠가 된다(site.css) — 그때는 키보드로도 닿아 화살표로 밀게 한다 */
function Marquee({ reverse, label, children }: { reverse: boolean; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const scrollable = useScrollable(ref)
  return (
    <div ref={ref} className={`marquee ${reverse ? 'marquee--reverse' : ''}`} tabIndex={scrollable ? 0 : undefined} role={scrollable ? 'region' : undefined} aria-label={scrollable ? label : undefined}>
      {children}
    </div>
  )
}

export function Formats({ copy, lang }: { copy: SiteCopy; lang: Lang }) {
  const row = (items: typeof ROW_A, reverse: boolean) => (
    <Marquee reverse={reverse} label={`${copy.formats.title} (${reverse ? 2 : 1}/2)`}>
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
    </Marquee>
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
        <EditorLink className="btn-dark">
          <span className="dot" />
          {copy.formats.cta}
        </EditorLink>
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
  // 흩어진 카드가 레인으로 모인다(site.css 의 .lane-card)
  useScrollVar(ref, ['start 0.8', 'center 0.5'])
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
          <EditorLink className="btn-mint">
            {copy.lanes.cta} ↗
          </EditorLink>
        </div>
        <div className="lanes__board">
          {copy.lanes.lanes.map((name, i) => (
            <div key={name} className="lane" style={{ top: `${i * 33.3}%` }}>
              <span>{name}</span>
            </div>
          ))}
          {snaps.map((snap, i) => {
            const slot = laneCount[snap.lane]++
            return <LaneCard key={i} snap={snap} from={SCATTER[i]} lane={snap.lane} slot={slot} />
          })}
        </div>
      </div>
    </section>
  )
}

function LaneCard({ snap, from, lane, slot }: { snap: Snap; from: (typeof SCATTER)[number]; lane: number; slot: number }) {
  // 흩어진 자리·기울기(--x0·--y0·--r0)에서 레인의 자리(--x1·--y1)로 — 진행 --p 로 CSS 가 옮긴다
  const place = { '--x0': `${from.x / 6}%`, '--x1': `${14 + slot * 42}%`, '--y0': `${from.y / 4.4}%`, '--y1': `${lane * 33.3 + 4}%`, '--r0': from.r } as CSSProperties
  return (
    <div className="lane-card" style={place}>
      <Snapshot snap={snap} />
    </div>
  )
}

/* ───────── 낱말마다 짙어지는 문장 ───────── */

export function Statement({ copy }: { copy: SiteCopy }) {
  const ref = useRef<HTMLParagraphElement>(null)
  useScrollVar(ref, ['start 0.85', 'end 0.45'])
  const words = copy.statement.text.split(' ')
  return (
    <section className="statement">
      <div className="container">
        <p className="eyebrow">{copy.statement.eyebrow}</p>
        <p ref={ref} className="statement__text" style={{ '--n': words.length } as CSSProperties}>
          {words.map((word, index) => (
            <span key={index} style={{ '--i': index } as CSSProperties}>
              {word}{' '}
            </span>
          ))}
        </p>
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
        <EditorLink className="btn-mint chat__cta">{copy.chat.cta}</EditorLink>
      </div>
    </section>
  )
}

/* ───────── 어디서든 ───────── */

export function Anywhere({ copy }: { copy: SiteCopy }) {
  const { lang } = useLang()
  // 도움말의 「앱으로 설치하기」 절. 보통 링크라 그 절까지 내려간다(브라우저가 # 을 따라간다).
  const installHelp = `${pagePath('help', lang)}#install`
  return (
    <section className="anywhere">
      <div className="container narrow">
        <p className="anywhere__title">{copy.anywhere.title}</p>
        <ul>
          {copy.anywhere.rows.map((row) => (
            <li key={row.name}>
              {row.to === 'editor' ? (
                <EditorLink>
                  <span>{row.name}</span>
                  <Arrow size={16} aria-hidden="true" />
                </EditorLink>
              ) : row.to === 'install' ? (
                // 크롬·엣지가 설치할 수 있다고 알려 준 때에는 바로 설치 창을, 아니면 도움말의 순서를 보인다(src/pwa/install.ts).
                <a
                  href={installHelp}
                  onClick={(event) => {
                    if (!canPromptInstall()) return
                    event.preventDefault()
                    void promptInstall()
                  }}
                >
                  <span>{row.name}</span>
                  <span className="anywhere__state">
                    {row.state}
                    <Arrow size={16} aria-hidden="true" />
                  </span>
                </a>
              ) : (
                // Claude·ChatGPT 커넥터: 도움말의 그 절(주소와 더하는 순서)
                <a href={`${pagePath('help', lang)}#connect`}>
                  <span>{row.name}</span>
                  <span className="anywhere__state">
                    {row.state}
                    <Arrow size={16} aria-hidden="true" />
                  </span>
                </a>
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

/** plans 는 시험에서 결제를 연 모습을 보려고 바꿀 수 있다. */
export function Pricing({ copy, plans = PLANS }: { copy: SiteCopy; plans?: Plan[] }) {
  const p = copy.pricing
  const { lang } = useLang()
  return (
    <section className="pricing" id="pricing">
      <div className="container center">
        <p className="eyebrow">{p.eyebrow}</p>
        <h2>{p.title}</h2>
        <p className="lead-sm">{p.body}</p>
      </div>
      <ul className="container plans">
        {plans.map((plan) => (
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
            {plan.available &&
              (plan.monthlyWon === 0 ? (
                <EditorLink className="btn-mint">{p.cta}</EditorLink>
              ) : (
                // 카드 결제는 내 계정에서(로그인한 뒤 그 요금제를 골라 둔 채로).
                <Link className="btn-mint" to={`${pagePath('account', lang)}?plan=${plan.id}`}>
                  {fill(p.choose, { plan: p.names[plan.id] })}
                </Link>
              ))}
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
