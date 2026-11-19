import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

/**
 * 이 칸이 옆으로 밀리는가(내용이 칸보다 넓고 밀 수 있게 되어 있나). 밀리는 칸은 키보드로도 닿아야 한다 —
 * 그때만 칸에 tabIndex·이름을 준다(밀리지 않는 칸에 주면 쓸모없이 탭이 한 번 더 멈춘다).
 * 휴대폰의 「만들 수 있는 것」 줄, 「움직임 줄이기」를 켰을 때의 흐르는 띠(site.css).
 * 미리 그린 HTML 은 밀리지 않는 것으로 그리고, 브라우저에서 잰 뒤 맞춘다.
 */
export function useScrollable(ref: RefObject<HTMLElement | null>): boolean {
  const [scrollable, setScrollable] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => {
      const overflow = getComputedStyle(element).overflowX
      setScrollable((overflow === 'auto' || overflow === 'scroll') && element.scrollWidth > element.clientWidth + 1)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    motion.addEventListener('change', measure)
    return () => {
      observer.disconnect()
      motion.removeEventListener('change', measure)
    }
  }, [ref])
  return scrollable
}
