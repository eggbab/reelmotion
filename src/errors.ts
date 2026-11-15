import { release } from './http'

/**
 * 편집기가 이용자의 브라우저에서 고장 났을 때 운영자가 알 수 있게 오류를 서버에 알린다(관리자 화면의 「브라우저 오류」).
 * 접속 기록을 남기지 않는 서비스라, 이것이 없으면 「사파리에서 내보내기가 다 실패한다」 같은 일을 아무도 모른다.
 * 보내는 것: 오류 글 · 자취(어느 코드에서 났는지) · 쪽 주소(물음표 뒤 없이) · 판 번호. 누구인지, 무엇을 넣었는지는 보내지 않는다.
 * 고장 난 화면이 서버를 두드리지 않게 같은 오류는 한 번, 모두 합쳐 다섯 번까지만 보낸다.
 */
export type ErrorText = { message: string; stack: string }

const MAX_REPORTS = 5
const reported = new Set<string>()

/** 브라우저가 스스로 내는 잡음, 끊긴 인터넷, 이용자가 그만둔 일 — 우리 화면의 고장이 아니다 */
const NOISE = [/^ResizeObserver loop/i, /^Script error\.?$/i, /Failed to fetch$/i, /Load failed$/i, /NetworkError when attempting to fetch/i, /^AbortError\b/i, /The operation was aborted/i]
/** 확장 프로그램이 낸 오류 */
const EXTENSION = /(?:chrome|moz|safari-web)-extension:\/\/|webkit-masked-url:\/\//i

export function describeError(reason: unknown): ErrorText {
  if (reason instanceof Error) {
    const message = reason.name && reason.name !== 'Error' ? `${reason.name}: ${reason.message}` : reason.message
    return { message, stack: reason.stack ?? '' }
  }
  if (typeof reason === 'string') return { message: reason, stack: '' }
  if (typeof reason === 'object' && reason !== null) {
    const message = (reason as { message?: unknown }).message
    if (typeof message === 'string') return { message, stack: '' }
    try {
      return { message: JSON.stringify(reason), stack: '' }
    } catch {
      return { message: Object.prototype.toString.call(reason), stack: '' }
    }
  }
  return { message: String(reason), stack: '' }
}

export function shouldReport({ message, stack, source = '' }: ErrorText & { source?: string }): boolean {
  if (message.trim() === '') return false
  if (NOISE.some((pattern) => pattern.test(message))) return false
  return !EXTENSION.test(stack) && !EXTENSION.test(source)
}

/** 오류 하나를 서버에 알린다. source: 오류가 난 파일 주소(window.onerror 가 알려 줄 때) */
export function reportError(reason: unknown, source = ''): void {
  const { message, stack } = describeError(reason)
  if (!shouldReport({ message, stack, source })) return
  if (reported.has(message) || reported.size >= MAX_REPORTS) return
  reported.add(message)
  if (typeof fetch !== 'function') return
  const page = typeof location === 'undefined' ? '' : location.pathname
  const version = typeof __RM_BUILD__ === 'undefined' ? '' : __RM_BUILD__
  try {
    void fetch('/api/client-error', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: message.slice(0, 300), stack: stack.slice(0, 1500), page, version }),
      keepalive: true,
    }).then(release, () => undefined)
  } catch {
    // 알리지 못해도 할 수 있는 일이 없다
  }
}

/** 화면 어디서든 잡히지 않은 오류를 듣는다(main.tsx 에서 한 번) */
export function watchErrors(): void {
  if (typeof window === 'undefined') return
  window.addEventListener('error', (event) => reportError(event.error ?? event.message, event.filename))
  window.addEventListener('unhandledrejection', (event) => reportError(event.reason))
}

export function resetErrorsForTest(): void {
  reported.clear()
}
