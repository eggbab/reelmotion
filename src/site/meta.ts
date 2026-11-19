import { ACCOUNT_COPY } from '../account/copy'
import { ADMIN_COPY } from '../admin/copy'
import type { Lang } from '../langs'
import { CONTACT_COPY } from './contact/copy'
import { LICENSES_UI } from './legal/credits'
import { LEGAL_DOCS } from './legal/docs'
import { HELP } from './legal/help'
import type { PageId } from './routes'

/** 쪽의 제목(브라우저 탭·검색 결과)과 설명(검색 결과 아래 글, 160자 안팎). */
export type PageMeta = { title: string; description: string }

const HOME: Record<Lang, PageMeta> = {
  en: {
    title: 'ReelMotion — Motion graphics for talking videos',
    description: 'Add a talking video and ReelMotion places titles, counters, charts, name tags and captions at the moment you say them. English, Korean and Japanese. Free in beta.',
  },
  ko: {
    title: 'ReelMotion — 말하는 영상에 모션그래픽을 자동으로',
    description: '말하는 영상을 넣으면 말하는 순간에 맞춰 제목·숫자·차트·이름표·자막 모션그래픽을 얹습니다. 영어·한국어·일본어 지원, 베타 기간 무료.',
  },
  ja: {
    title: 'ReelMotion — トーク動画にモーショングラフィックスを自動で',
    description: '話している動画を入れるだけで、話した瞬間にタイトル・数字・グラフ・名前テロップ・字幕のモーショングラフィックスが入ります。英語・韓国語・日本語に対応、ベータ期間は無料。',
  },
}

const APP: Record<Lang, PageMeta> = {
  en: {
    title: 'Editor — ReelMotion',
    description: 'Turn a talking video into motion graphics in your browser: transcribe it, place the graphics, pick a style and export an MP4.',
  },
  ko: {
    title: '편집기 — ReelMotion',
    description: '브라우저에서 말하는 영상을 모션그래픽 영상으로 — 받아 적고, 그래픽을 얹고, 스타일을 골라 MP4로 내보냅니다.',
  },
  ja: {
    title: 'エディター — ReelMotion',
    description: 'ブラウザでトーク動画をモーショングラフィックス動画に。文字起こし、グラフィックスの配置、スタイル選び、MP4 の書き出しまで。',
  },
}

/** 화면을 그리다 오류가 났을 때의 안내(src/site/ErrorBoundary.tsx). 「내 작업」 이름은 편집기 글(src/editor/copy.ts)과 같게. */
export const CRASH: Record<Lang, { heading: string; body: string; reload: string; home: string }> = {
  en: {
    heading: 'Something went wrong',
    body: 'An error stopped this screen. Reload to open it again. Projects you edited are saved under My projects in this browser.',
    reload: 'Reload',
    home: 'Go to the home page',
  },
  ko: {
    heading: '문제가 생겼어요',
    body: '화면을 그리다가 오류가 났어요. 새로고침하면 다시 열려요. 편집기에서 고친 작업은 이 브라우저의 「내 작업」에 저장돼 있어요.',
    reload: '새로고침',
    home: '첫 화면으로',
  },
  ja: {
    heading: '問題が発生しました',
    body: '画面の表示中にエラーが起きました。再読み込みすると開き直せます。エディターで編集したプロジェクトは、このブラウザの「マイプロジェクト」に保存されています。',
    reload: '再読み込み',
    home: 'トップページへ',
  },
}

export const NOT_FOUND: Record<Lang, PageMeta & { heading: string; body: string; home: string; editor: string }> = {
  en: {
    title: 'Page not found — ReelMotion',
    description: 'This page does not exist.',
    heading: 'This page doesn’t exist',
    body: 'The address may be wrong, or the page may have moved.',
    home: 'Go to the home page',
    editor: 'Open the editor',
  },
  ko: {
    title: '페이지를 찾을 수 없어요 — ReelMotion',
    description: '없는 페이지입니다.',
    heading: '없는 페이지예요',
    body: '주소가 틀렸거나 페이지가 옮겨졌을 수 있어요.',
    home: '첫 화면으로',
    editor: '편집기 열기',
  },
  ja: {
    title: 'ページが見つかりません — ReelMotion',
    description: 'このページは存在しません。',
    heading: 'このページは見つかりません',
    body: 'アドレスが間違っているか、ページが移動した可能性があります。',
    home: 'トップページへ',
    editor: 'エディターを開く',
  },
}

export function pageMeta(page: PageId, lang: Lang): PageMeta {
  if (page === 'home') return HOME[lang]
  if (page === 'app') return APP[lang]
  if (page === 'licenses') return { title: `${LICENSES_UI[lang].title} — ReelMotion`, description: LICENSES_UI[lang].description }
  if (page === 'contact') return { title: `${CONTACT_COPY[lang].title} — ReelMotion`, description: CONTACT_COPY[lang].description }
  if (page === 'account') return { title: `${ACCOUNT_COPY[lang].title} — ReelMotion`, description: ACCOUNT_COPY[lang].loginBody }
  if (page === 'admin') return { title: `${ADMIN_COPY[lang].title} — ReelMotion`, description: ADMIN_COPY[lang].description }
  const doc = page === 'help' ? HELP[lang] : LEGAL_DOCS[page][lang]
  return { title: `${doc.title} — ReelMotion`, description: doc.description }
}
