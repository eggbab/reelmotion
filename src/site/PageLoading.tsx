import { useLang } from '../lang'
import { Header } from './Chrome'
import { SITE_COPY } from './copy'

/** 따로 받는 쪽(lazyPages.ts)을 받는 동안: 머리줄은 그대로 두고 본문 자리만 비워 둔다(화면이 통째로 깜빡이지 않게). */
export function PageLoading() {
  const { lang } = useLang()
  return (
    <div className="site">
      <Header copy={SITE_COPY[lang]} />
      <main id="main" className="legal" aria-busy="true" />
    </div>
  )
}
