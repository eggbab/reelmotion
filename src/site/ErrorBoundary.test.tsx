// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetErrorsForTest } from '../errors'
import { ErrorBoundary } from './ErrorBoundary'
import { pagePath } from './routes'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

function Bomb(): never {
  throw new TypeError('render exploded')
}

async function mount(node: React.ReactNode) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(node))
  return { container, unmount: () => act(() => root.unmount()) }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  resetErrorsForTest()
  document.body.innerHTML = ''
})

describe('화면을 그리다 고장 나면', () => {
  it('빈 화면 대신 그 언어로 안내와 새로고침·첫 화면 단추를 보이고, 오류를 운영자에게 알린다', async () => {
    const calls: { url: string; body: Record<string, unknown> }[] = []
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) as Record<string, unknown> })
      return new Response(null, { status: 204 })
    })
    // React 는 잡은 오류를 콘솔에도 적는다 — 시험 출력을 어지럽히지 않게
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    window.history.pushState({}, '', '/ko/app?project=abc&script=secret')
    const { container, unmount } = await mount(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    expect(container.querySelector('[role=alert] h1')?.textContent).toBe('문제가 생겼어요')
    expect(container.querySelector('[role=alert] button')?.textContent).toBe('새로고침')
    expect(container.querySelector('[role=alert] a')?.getAttribute('href')).toBe(pagePath('home', 'ko'))
    // 계속 고장 나면 고장 신고로(문의하기)
    const report = container.querySelector('.notfound__report')
    expect(report?.textContent).toBe('계속 그러면 알려 주세요')
    expect(report?.getAttribute('href')).toBe('/ko/contact?kind=bug')
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('/api/client-error')
    expect(calls[0].body).toMatchObject({ message: 'TypeError: render exploded', page: '/ko/app' })
    expect(JSON.stringify(calls[0].body)).not.toContain('secret')
    await unmount()
  })

  it('영어·일본어 주소에서는 그 말로', async () => {
    vi.stubGlobal('fetch', async () => new Response(null, { status: 204 }))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    for (const [path, heading] of [
      ['/app', 'Something went wrong'],
      ['/ja/app', '問題が発生しました'],
    ]) {
      window.history.pushState({}, '', path)
      const { container, unmount } = await mount(
        <ErrorBoundary>
          <Bomb />
        </ErrorBoundary>,
      )
      expect(container.querySelector('h1')?.textContent, path).toBe(heading)
      await unmount()
    }
  })

  it('고장이 없으면 그대로 그리고, 아무것도 알리지 않는다', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const { container, unmount } = await mount(
      <ErrorBoundary>
        <p>fine</p>
      </ErrorBoundary>,
    )
    expect(container.textContent).toBe('fine')
    expect(fetch).not.toHaveBeenCalled()
    await unmount()
  })
})
