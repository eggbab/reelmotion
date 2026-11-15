/**
 * 읽지 않을 응답을 내려놓는다. 응답 본문을 읽지도 버리지도 않으면 브라우저가 그 연결을 응답 객체를 치울 때까지 붙잡아 둔다
 * (2026-11-15 확인: 404 응답을 읽지 않은 요청이 계속 「진행 중」으로 남았다). 본문을 읽지 않고 돌아가는 곳마다 부른다.
 */
export function release(response: Response | null | undefined): void {
  if (!response?.body || response.bodyUsed) return
  void response.body.cancel().catch(() => undefined)
}
