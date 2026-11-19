import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { clipUrl, posterUrl } from '../media/clips'
import type { ClipId } from '../media/clips'
import type { Lang } from '../langs'
import type { SiteCopy } from './copy'
import { demo } from './demos'
import { MotionStage } from './MotionStage'
import { EditorLink } from './EditorLink'
import { useScrollVar } from './scrollProgress'
import { useReducedMotion } from './useReducedMotion'

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
 * 흐린 영상 벽은 쪽이 다 뜬 뒤(load)에 재생한다 — 처음부터 재생하면 영상 8개(약 1.5MB)가 글·스타일 파일과 대역을 다퉈
 * 휴대폰에서 첫 글자가 늦게 뜬다(2026-11-19 CPU 4배·1.6Mbps 로 재 보니 3.3초). 그때까지는 작은 정지 그림.
 * 「움직임 줄이기」나 데이터 절약 모드면 재생하지 않는다.
 */
function useWallPlayback(wall: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
    if (still || saveData) return
    const start = () => wall.current?.querySelectorAll('video').forEach((video) => void video.play().catch(() => undefined))
    if (document.readyState === 'complete') {
      start()
      return
    }
    window.addEventListener('load', start, { once: true })
    return () => window.removeEventListener('load', start)
  }, [wall])
}

/**
 * 첫 화면: 흐린 영상 벽 위에 제목. 내리면 제목이 흐려지며 올라가고, 벽 대신 한 편의 영상이
 * 모션그래픽과 함께 화면을 채운다. 더 내리면 그 영상이 둥근 카드로 줄어든다.
 * 진행(이 구역의 위가 창의 위 → 아래가 창의 아래)을 --p 로 적으면 나머지는 CSS 가 계산한다(site.css 「첫 화면」).
 */
export function Hero({ copy, lang }: { copy: SiteCopy; lang: Lang }) {
  const ref = useRef<HTMLElement>(null)
  useScrollVar(ref, ['start start', 'end end'])
  const sleep = useMemo(() => demo('sleep', lang), [lang])
  const wall = useRef<HTMLDivElement>(null)
  useWallPlayback(wall)

  return (
    <section className="hero" ref={ref}>
      <div className="hero__pin">
        <div className="wall" ref={wall} aria-hidden="true">
          {WALL.map((clip, i) => (
            <div key={i} className={`wall__tile wall__tile--${i % 3}`}>
              <video src={clipUrl(clip, true)} poster={posterUrl(clip, true)} muted loop playsInline preload="none" />
            </div>
          ))}
        </div>
        <div className="wall__shade" aria-hidden="true" />

        <div className="reel">
          <MotionStage clip={sleep.clip} graphics={sleep.graphics} theme={sleep.theme} label={copy.hero.reel} className="reel__stage" />
        </div>

        <div className="hero__text">
          <h1>
            {copy.hero.before}
            <CyclingWord words={copy.hero.words} />
            {copy.hero.after}
          </h1>
          <p>{copy.hero.body}</p>
          <EditorLink className="btn-mint" data-hero-cta>
            {copy.hero.cta}
          </EditorLink>
        </div>
      </div>
    </section>
  )
}
