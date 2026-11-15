/**
 * 서비스 워커 등록. 편집기를 열 때 부른다 — 소개 페이지만 보는 사람은 편집기 파일(약 1.6MB)을 미리 받지 않게.
 * 개발 서버에서는 등록하지 않는다(dist/sw.js 는 빌드할 때만 생긴다).
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  const start = () => void navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  if (document.readyState === 'complete') start()
  else window.addEventListener('load', start, { once: true })
}
