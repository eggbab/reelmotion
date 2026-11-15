/**
 * 글 다듬기 가운데 화면(캔버스) 없이 되는 것. 자동 배치(direct.ts)가 쓰는데, 그 규칙은 앱 서버의 커넥터도 쓰므로
 * 브라우저 전용 코드(paint.ts)와 떼어 둔다.
 */

/** 그래픽 안에 들어갈 수 없을 만큼 긴 글은 줄여서 끝에 … 을 붙인다 */
export function clampText(text: string, max: number): string {
  const chars = [...text.trim()]
  return chars.length > max ? `${chars.slice(0, max - 1).join('').trimEnd()}…` : text.trim()
}
