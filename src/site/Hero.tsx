import { motion, useMotionTemplate, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { clipUrl, posterUrl } from '../media/clips'
import type { ClipId } from '../media/clips'
import type { Lang } from '../langs'
import type { SiteCopy } from './copy'
import { demo } from './demos'
import { MotionStage } from './MotionStage'

const WALL: ClipId[] = ['studio', 'shorts-a', 'podcast-a', 'teacher', 'podcast-b', 'shorts-b', 'explainer', 'podcast-c', 'studio', 'podcast-a', 'shorts-a', 'teacher']

/** 제목 끝 낱말이 바뀐다. 바뀔 때 민트색 띠가 훑고 지나간다. */
function CyclingWord({ words }: { words: string[] }) {
  const still = useReducedMotion()
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (still) return
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % words.length), 2600)
    return () => window.clearInterval(timer)
  }, [still, words.length])
  const word = words[index % words.length]
  return (
    <span className="cycle" aria-live="off">
      <span key={word} className="cycle__word">
        {word}
      </span>
    </span>
  )
}

/**
 * 첫 화면: 흐린 영상 벽 위에 제목. 내리면 제목이 흐려지며 올라가고, 벽 대신 한 편의 영상이
 * 모션그래픽과 함께 화면을 채운다. 더 내리면 그 영상이 둥근 카드로 줄어든다.
 */
export function Hero({ copy, lang }: { copy: SiteCopy; lang: Lang }) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const textOpacity = useTransform(p, [0, 0.16], [1, 0])
  const textY = useTransform(p, [0, 0.16], [0, -80])
  const textBlur = useTransform(p, [0, 0.16], [0, 14])
  const textFilter = useMotionTemplate`blur(${textBlur}px)`
  const wallOpacity = useTransform(p, [0.1, 0.3], [1, 0])
  const reelOpacity = useTransform(p, [0.1, 0.3], [0, 1])
  const reelScale = useTransform(p, [0.1, 0.42], [1.14, 1])
  const inset = useTransform(p, [0.78, 1], [0, 6])
  const round = useTransform(p, [0.78, 1], [0, 28])
  const reelClip = useMotionTemplate`inset(${inset}% ${inset}% round ${round}px)`
  const sleep = useMemo(() => demo('sleep', lang), [lang])

  return (
    <section className="hero" ref={ref}>
      <div className="hero__pin">
        <motion.div className="wall" style={{ opacity: wallOpacity }} aria-hidden="true">
          {WALL.map((clip, i) => (
            <div key={i} className={`wall__tile wall__tile--${i % 3}`}>
              <video src={clipUrl(clip, true)} poster={posterUrl(clip)} muted loop playsInline autoPlay preload="none" />
            </div>
          ))}
        </motion.div>
        <div className="wall__shade" aria-hidden="true" />

        <motion.div className="reel" style={{ opacity: reelOpacity, scale: reelScale, clipPath: reelClip }}>
          <MotionStage clip={sleep.clip} graphics={sleep.graphics} theme={sleep.theme} label={copy.hero.reel} className="reel__stage" />
        </motion.div>

        <motion.div className="hero__text" style={{ opacity: textOpacity, y: textY, filter: textFilter }}>
          <h1>
            {copy.hero.before}
            <CyclingWord words={copy.hero.words} />
            {copy.hero.after}
          </h1>
          <p>{copy.hero.body}</p>
          <Link to="/app" className="btn-mint" data-hero-cta>
            {copy.hero.cta}
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
