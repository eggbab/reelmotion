import { Component } from 'react'
import type { ReactNode } from 'react'
import { reportError } from '../errors'
import { CRASH } from './meta'
import { langOfPath, pagePath } from './routes'

/**
 * 화면을 그리다 오류가 나면 React 는 화면을 통째로 비운다. 빈 화면 대신 「새로고침하면 다시 열려요」를 보이고,
 * 운영자가 알 수 있게 오류를 알린다(src/errors.ts). 라우터 밖에 두므로 링크는 보통 주소로 쓴다.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    reportError(error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    const lang = langOfPath(typeof location === 'undefined' ? '/' : location.pathname)
    const text = CRASH[lang]
    return (
      <div className="site">
        <main id="main" className="notfound">
          <div className="notfound__inner" role="alert">
            <h1>{text.heading}</h1>
            <p>{text.body}</p>
            <div className="notfound__actions">
              <button type="button" className="btn-mint" onClick={() => location.reload()}>
                {text.reload}
              </button>
              <a className="btn-ghost" href={pagePath('home', lang)}>
                {text.home}
              </a>
            </div>
          </div>
        </main>
      </div>
    )
  }
}
