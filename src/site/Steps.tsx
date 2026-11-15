import { Check, FileVideo } from 'lucide-react'
import { useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { scriptToWords } from '../captions/segment'
import { fill } from '../langs'
import type { Lang } from '../langs'
import { THEMES } from '../motion/themes'
import type { SiteCopy } from './copy'
import { demo } from './demos'
import { MotionStage } from './MotionStage'

/** 단계 하나가 차지하는 스크롤 길이(화면 높이 배수). 다섯 단계 + 머무는 몫. */
const STEP_VH = 70

/**
 * 「목소리에서 그래픽까지」: 화면이 멈춘 채 스크롤하면 왼쪽 단계가 하나씩 켜지고,
 * 오른쪽 휴대폰 속 영상이 그 단계 모습으로 바뀐다. 단계를 누르면 그 자리로 스크롤한다.
 */
export function Steps({ copy, lang }: { copy: SiteCopy; lang: Lang }) {
  const ref = useRef<HTMLElement>(null)
  const [step, setStep] = useState(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const count = copy.steps.steps.length
  useMotionValueEvent(scrollYProgress, 'change', (value) => setStep(Math.min(count - 1, Math.max(0, Math.floor(value * count)))))

  const goTo = (index: number) => {
    const section = ref.current
    if (!section) return
    const top = section.getBoundingClientRect().top + window.scrollY
    const span = section.offsetHeight - window.innerHeight
    window.scrollTo({ top: top + (span * (index + 0.5)) / count, behavior: 'smooth' })
  }

  return (
    <section className="steps" ref={ref} style={{ '--step-vh': `${STEP_VH * count}vh` } as CSSProperties}>
      <div className="steps__pin">
        <div className="glow glow--left" aria-hidden="true" />
        <div className="steps__inner">
          <div className="steps__text">
            <p className="eyebrow">{copy.steps.eyebrow}</p>
            <h2>
              {copy.steps.title1}
              <br />
              <span className="mint">{copy.steps.title2}</span>
            </h2>
            <p className="steps__body">{copy.steps.body}</p>
            <ol className="steps__list">
              {copy.steps.steps.map((item, index) => (
                <li key={item.name}>
                  <button type="button" className={index === step ? 'is-active' : undefined} aria-current={index === step ? 'step' : undefined} onClick={() => goTo(index)}>
                    <span className="steps__num">{String(index + 1).padStart(2, '0')}</span>
                    <span className="steps__name">{item.name}</span>
                    <span className="steps__hint">{item.hint}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <Phone step={step} copy={copy} lang={lang} />
        </div>
      </div>
    </section>
  )
}

function Phone({ step, copy, lang }: { step: number; copy: SiteCopy; lang: Lang }) {
  const still = useReducedMotion()
  const [themeIndex, setThemeIndex] = useState(0)
  useEffect(() => {
    if (step !== 3 || still) return
    const timer = window.setInterval(() => setThemeIndex((value) => (value + 1) % THEMES.length), 1700)
    return () => window.clearInterval(timer)
  }, [step, still])

  const base = useMemo(() => demo('shorts', lang), [lang])
  // 받아쓰기 단계에 보여 줄 말: 예시 영상의 제목과 자막 글
  const words = useMemo(() => {
    const spoken = base.graphics.flatMap((g) => (g.kind === 'title' ? [g.text] : g.kind === 'captions' ? g.words.map((word) => word.text) : []))
    return scriptToWords(spoken.join(' '), 6).slice(0, 12)
  }, [base])
  const theme = step === 3 ? THEMES[themeIndex].id : base.theme
  const graphics = step >= 2 ? base.graphics : []

  return (
    <div className="phone">
      <div className="phone__screen">
        <MotionStage clip={base.clip} graphics={graphics} theme={theme} label={copy.steps.steps[step].name} bare={step < 2} />
        {step === 0 && (
          <div className="chip chip--upload">
            <FileVideo size={16} aria-hidden="true" />
            <span>{copy.steps.upload}</span>
            <Check size={16} aria-hidden="true" />
          </div>
        )}
        {step === 1 && (
          <div className="transcript">
            <p className="transcript__label">{copy.steps.transcript}</p>
            <ul>
              {words.map((word, i) => (
                <li key={i} style={{ '--delay': `${i * 0.12}s` } as CSSProperties}>
                  <span>{word.text}</span>
                  <small>{word.start.toFixed(1)}s</small>
                </li>
              ))}
            </ul>
          </div>
        )}
        {step === 2 && (
          <div className="chip chip--picked">
            <span className="dot" />
            {copy.steps.picked}
          </div>
        )}
        {step === 3 && <div className="chip chip--picked">{THEMES[themeIndex].id}</div>}
        {step === 4 && <ExportBar copy={copy} />}
      </div>
    </div>
  )
}

function ExportBar({ copy }: { copy: SiteCopy }) {
  const [percent, setPercent] = useState(0)
  useEffect(() => {
    const started = performance.now()
    const timer = window.setInterval(() => setPercent(Math.min(100, Math.round((performance.now() - started) / 30))), 60)
    return () => window.clearInterval(timer)
  }, [])
  const done = percent >= 100
  return (
    <div className="export">
      <p>{done ? copy.steps.ready : fill('{label} {n}%', { label: copy.steps.exporting, n: percent })}</p>
      <div className="export__bar">
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
