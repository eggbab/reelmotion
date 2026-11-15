import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { KILL_SWITCH, SHELLS, cacheName, isOurCache, pageKey, precacheList, routeOf, shellFor, stampWorker } from './routes'

const ORIGIN = 'https://reelmotion.test'
const get = (path: string, mode = 'cors') => ({ method: 'GET', url: path.startsWith('http') ? path : `${ORIGIN}${path}`, mode })

describe('서비스 워커가 맡는 요청', () => {
  it('쪽 이동은 네트워크 먼저(page), 이름에 지문이 든 파일은 캐시 먼저(asset)', () => {
    expect(routeOf(get('/ko/app?project=p1', 'navigate'), ORIGIN)).toBe('page')
    expect(routeOf(get('/', 'navigate'), ORIGIN)).toBe('page')
    expect(routeOf(get('/assets/index-abc123.js'), ORIGIN)).toBe('asset')
    expect(routeOf(get('/assets/pretendard-jp-99.woff2'), ORIGIN)).toBe('asset')
  })

  it('나머지는 손대지 않는다: API·바꾸는 요청·영상(조각 요청)·큰 wasm·다른 사이트', () => {
    expect(routeOf(get('/api/me'), ORIGIN)).toBe('pass')
    expect(routeOf(get('/api/admin/backups/reelmotion-20261115.db', 'navigate'), ORIGIN)).toBe('pass')
    expect(routeOf({ method: 'POST', url: `${ORIGIN}/api/usage/export`, mode: 'cors' }, ORIGIN)).toBe('pass')
    expect(routeOf(get('/media/explainer.mp4', 'no-cors'), ORIGIN)).toBe('pass')
    expect(routeOf(get('/assets/ort-wasm-simd-threaded-4byDm7i3.wasm'), ORIGIN)).toBe('pass')
    expect(routeOf(get('https://huggingface.co/onnx-community/whisper-small/resolve/main/config.json'), ORIGIN)).toBe('pass')
    expect(routeOf(get('/favicon.svg', 'no-cors'), ORIGIN)).toBe('pass')
    expect(routeOf(get('/licenses.txt', 'navigate'), ORIGIN)).toBe('pass')
    // 커넥터 주소(/mcp)를 브라우저로 열어 봐도 캐시에 넣지 않는다
    expect(routeOf(get('/mcp', 'navigate'), ORIGIN)).toBe('pass')
    expect(routeOf({ method: 'POST', url: `${ORIGIN}/mcp`, mode: 'cors' }, ORIGIN)).toBe('pass')
    expect(routeOf(get('/mcp/', 'navigate'), ORIGIN)).toBe('pass')
  })
})

describe('쪽을 캐시에 넣는 열쇠와 대신 줄 껍데기', () => {
  it('물음표 뒤와 끝의 / 는 뗀다(작업이 달라도 같은 쪽)', () => {
    expect(pageKey(`${ORIGIN}/ko/app?project=p1`)).toBe('/ko/app')
    expect(pageKey(`${ORIGIN}/ja/help/#install`)).toBe('/ja/help')
    expect(pageKey(`${ORIGIN}/`)).toBe('/')
  })

  it('인터넷이 없고 그 쪽이 캐시에 없으면 같은 언어의 편집기 껍데기를 준다', () => {
    expect(shellFor(`${ORIGIN}/ko/help`)).toBe('/ko/app')
    expect(shellFor(`${ORIGIN}/ja/account?next=x`)).toBe('/ja/app')
    expect(shellFor(`${ORIGIN}/terms`)).toBe('/app')
    expect(SHELLS).toEqual(['/app', '/ko/app', '/ja/app'])
  })
})

describe('미리 받아 둘 파일', () => {
  it('화면 코드와 스타일만 — 글꼴·wasm·받아쓰기 워커·관리자 화면은 쓸 때 받는다', () => {
    const files = [
      'index-D98ESNvq.css',
      'index-lv1Ie1ap.js',
      'EditorPage-DAyA4w5g.js',
      'EditorPage-DYPZUSi1.css',
      'AdminPage-DjHhSQdc.js',
      'whisper.worker-DeSTM6AL.js',
      'ort-wasm-simd-threaded-4byDm7i3.wasm',
      'ort-wasm-simd-threaded-BQJNh0bu.mjs',
      'pretendard-jp-99-abc.woff2',
    ]
    expect(precacheList(files)).toEqual(['/assets/EditorPage-DAyA4w5g.js', '/assets/EditorPage-DYPZUSi1.css', '/assets/index-D98ESNvq.css', '/assets/index-lv1Ie1ap.js'])
  })
})

describe('캐시 이름', () => {
  it('판마다 하나, 옛 판을 지울 때 우리 것만 지운다', () => {
    expect(cacheName('a1b2c3')).toBe('reelmotion-a1b2c3')
    expect(isOurCache('reelmotion-old')).toBe(true)
    // 브라우저 안 받아쓰기 모델(transformers.js 가 만든 캐시)은 건드리지 않는다
    expect(isOurCache('transformers-cache')).toBe(false)
  })
})

describe('빌드할 때 서비스 워커에 붙이는 머리', () => {
  it('판 이름과 미리 받을 파일을 맨 앞에 붙인다. 두 번 돌려도 한 번만 붙는다', () => {
    const once = stampWorker('BODY()', 'a1b2c3', ['/assets/index-x.js'])
    expect(once).toBe('self.__RM_VERSION__="a1b2c3";self.__RM_PRECACHE__=["/assets/index-x.js"];\nBODY()')
    expect(stampWorker(once, 'd4e5f6', [])).toBe('self.__RM_VERSION__="d4e5f6";self.__RM_PRECACHE__=[];\nBODY()')
  })

  it('끄는 판(SW_DISABLE=1)은 우리 캐시를 지우고 등록을 푼다 — 요청은 가로채지 않는다', () => {
    expect(KILL_SWITCH).toContain('registration.unregister()')
    expect(KILL_SWITCH).toContain("startsWith('reelmotion-')")
    expect(KILL_SWITCH).not.toContain("'fetch'")
  })
})

describe('앱 정보 파일(manifest)', () => {
  const manifest = JSON.parse(readFileSync(new URL('../../public/manifest.webmanifest', import.meta.url), 'utf8')) as {
    id: string
    name: string
    start_url: string
    scope: string
    display: string
    background_color: string
    theme_color: string
    icons: { src: string; sizes: string; type: string; purpose?: string }[]
    screenshots: { src: string; sizes: string; form_factor?: string }[]
  }
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')

  it('편집기에서 시작하고(언어는 첫 화면 스크립트가 고른다), 혼자 뜨는 창으로', () => {
    expect(manifest).toMatchObject({ id: '/app', name: 'ReelMotion', start_url: '/app', scope: '/', display: 'standalone', background_color: '#0e0e13', theme_color: '#0e0e13' })
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />')
    expect(html).toContain('<meta name="theme-color" content="#0e0e13" />')
  })

  it('아이콘 192·512 와 가장자리가 잘려도 되는(maskable) 512, 설치 창에 보일 화면 그림이 실제 파일로 있다', () => {
    expect(manifest.icons.map((icon) => `${icon.sizes} ${icon.purpose ?? 'any'}`).sort()).toEqual(['192x192 any', '512x512 any', '512x512 maskable'])
    expect(manifest.screenshots.map((shot) => shot.form_factor).sort()).toEqual(['narrow', 'wide'])
    for (const { src, sizes } of [...manifest.icons, ...manifest.screenshots]) {
      const png = readFileSync(new URL(`../../public${src}`, import.meta.url))
      // PNG 머리의 가로·세로(16~23번째 바이트)가 적어 둔 크기와 같다
      expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, src).toBe(sizes)
    }
  })
})
