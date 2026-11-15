const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

/** i 번 낱말 뒤의 빈칸 폭(붙여 쓰는 자리는 0) */
const gapAfter = (i: number, space: number, joins?: boolean[]) => (joins?.[i] ? 0 : space)

function lineWidth(widths: number[], from: number, to: number, space: number, joins?: boolean[]): number {
  let width = sum(widths.slice(from, to))
  for (let i = from; i < to - 1; i++) width += gapAfter(i, space, joins)
  return width
}

/**
 * 어절 폭 목록을 줄로 나눈다. 돌려주는 값은 줄마다의 어절 순번.
 * 두 줄이 되면 위아래 길이가 비슷한 자리에서 나눈다.
 */
export function layoutLines(widths: number[], space: number, maxWidth: number, joins?: boolean[]): number[][] {
  const lines: number[][] = []
  let current: number[] = []
  let width = 0
  widths.forEach((w, i) => {
    const next = current.length > 0 ? width + gapAfter(i - 1, space, joins) + w : w
    if (current.length > 0 && next > maxWidth) {
      lines.push(current)
      current = [i]
      width = w
    } else {
      current.push(i)
      width = next
    }
  })
  if (current.length > 0) lines.push(current)
  if (lines.length !== 2) return lines

  const n = widths.length
  let best = lines[0].length
  let bestWidth = Infinity
  for (let k = 1; k < n; k++) {
    const top = lineWidth(widths, 0, k, space, joins)
    const bottom = lineWidth(widths, k, n, space, joins)
    if (top > maxWidth || bottom > maxWidth) continue
    const widest = Math.max(top, bottom)
    if (widest <= bestWidth) {
      best = k
      bestWidth = widest
    }
  }
  const all = widths.map((_, i) => i)
  return [all.slice(0, best), all.slice(best)]
}
