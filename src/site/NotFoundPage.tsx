import { Link } from 'react-router'
import { useLang } from '../lang'
import { Footer, Header } from './Chrome'
import { SITE_COPY } from './copy'
import { EditorLink } from './EditorLink'
import { NOT_FOUND } from './meta'
import { pagePath } from './routes'
import { usePageMeta, useSiteBody } from './usePageMeta'

/** 없는 주소. 서버는 미리 그린 404.html 을 404 상태로 보낸다(deploy/Caddyfile). 언어는 주소 앞말을 따른다. */
export function NotFoundPage() {
  const { lang } = useLang()
  const copy = SITE_COPY[lang]
  const text = NOT_FOUND[lang]
  usePageMeta(text)
  useSiteBody()
  return (
    <div className="site">
      <Header copy={copy} />
      <main id="main" className="notfound">
        <div className="glow glow--top" aria-hidden="true" />
        <div className="notfound__inner">
          <p className="notfound__code" aria-hidden="true">
            404
          </p>
          <h1>{text.heading}</h1>
          <p>{text.body}</p>
          <div className="notfound__actions">
            <Link to={pagePath('home', lang)} className="btn-mint">
              {text.home}
            </Link>
            <EditorLink className="btn-ghost">{text.editor} →</EditorLink>
          </div>
        </div>
      </main>
      <Footer copy={copy} />
    </div>
  )
}
