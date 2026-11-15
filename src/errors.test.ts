import { afterEach, describe, expect, it, vi } from 'vitest'
import { describeError, reportError, resetErrorsForTest, shouldReport } from './errors'

afterEach(() => {
  vi.unstubAllGlobals()
  resetErrorsForTest()
})

describe('오류를 글로', () => {
  it('Error 는 종류와 글·자취를, 글자는 그대로, 그 밖은 꼴을 적는다', () => {
    const error = new TypeError("Cannot read properties of undefined (reading 'start')")
    expect(describeError(error)).toMatchObject({ message: "TypeError: Cannot read properties of undefined (reading 'start')" })
    expect(describeError(error).stack).toContain('TypeError')
    expect(describeError(new Error('plain'))).toMatchObject({ message: 'plain' })
    expect(describeError('boom')).toEqual({ message: 'boom', stack: '' })
    expect(describeError({ message: 'from object' })).toEqual({ message: 'from object', stack: '' })
    expect(describeError(undefined)).toEqual({ message: 'undefined', stack: '' })
    expect(describeError({ a: 1 }).message).toBe('{"a":1}')
  })
})

describe('알릴 만한 오류인가', () => {
  it('우리 화면의 고장은 알린다', () => {
    expect(shouldReport({ message: "TypeError: Cannot read properties of undefined (reading 'start')", stack: 'at draw (https://reelmotion.test/assets/index-abc.js:1:2)' })).toBe(true)
    expect(shouldReport({ message: 'Failed to fetch dynamically imported module: https://reelmotion.test/assets/x.js', stack: '' })).toBe(true)
  })

  it('브라우저 잡음·확장 프로그램·끊긴 인터넷·그만두기는 알리지 않는다', () => {
    for (const message of ['ResizeObserver loop completed with undelivered notifications.', 'ResizeObserver loop limit exceeded', 'Script error.', 'TypeError: Failed to fetch', 'TypeError: Load failed', 'TypeError: NetworkError when attempting to fetch resource.', 'AbortError: The user aborted a request.', 'AbortError: signal is aborted without reason', '']) {
      expect(shouldReport({ message, stack: '' }), message).toBe(false)
    }
    expect(shouldReport({ message: 'TypeError: x is not a function', stack: 'at y (chrome-extension://abcdef/content.js:1:1)' })).toBe(false)
    expect(shouldReport({ message: 'Error: boom', stack: 'at z (moz-extension://abc/inject.js:3:4)' })).toBe(false)
    expect(shouldReport({ message: 'Error: boom', stack: '', source: 'safari-web-extension://abc/x.js' })).toBe(false)
  })
})

describe('오류 알리기', () => {
  function stubFetch() {
    const calls: Record<string, unknown>[] = []
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      calls.push(JSON.parse(String(init.body)) as Record<string, unknown>)
      return new Response(null, { status: 204 })
    })
    vi.stubGlobal('location', { pathname: '/ko/app', search: '?project=abc', href: 'https://reelmotion.test/ko/app?project=abc' })
    return calls
  }

  it('오류 글·자취·쪽 주소(물음표 뒤 없이)·판 번호만 보낸다', () => {
    const calls = stubFetch()
    reportError(new RangeError('bad duration'))
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ message: 'RangeError: bad duration', page: '/ko/app' })
    expect(Object.keys(calls[0]).sort()).toEqual(['message', 'page', 'stack', 'version'])
    expect(JSON.stringify(calls[0])).not.toContain('project=abc')
  })

  it('같은 오류는 화면을 연 동안 한 번만, 모두 합쳐 다섯 번까지만 보낸다(고장 난 화면이 서버를 두드리지 않게)', () => {
    const calls = stubFetch()
    reportError(new Error('same'))
    reportError(new Error('same'))
    for (let i = 0; i < 10; i++) reportError(new Error(`different ${i}`))
    expect(calls).toHaveLength(5)
  })

  it('잡음은 보내지 않는다', () => {
    const calls = stubFetch()
    reportError(new TypeError('Failed to fetch'))
    reportError('ResizeObserver loop limit exceeded')
    expect(calls).toHaveLength(0)
  })
})
