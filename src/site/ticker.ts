/** 화면에 보이는 무대들이 한 박자로 그리도록 requestAnimationFrame 을 하나만 돌린다. */
const subscribers = new Set<(now: number) => void>()
let frame = 0

function loop(now: number) {
  for (const draw of subscribers) draw(now)
  frame = subscribers.size > 0 ? requestAnimationFrame(loop) : 0
}

export function subscribeFrame(draw: (now: number) => void): () => void {
  subscribers.add(draw)
  if (!frame) frame = requestAnimationFrame(loop)
  return () => {
    subscribers.delete(draw)
  }
}
