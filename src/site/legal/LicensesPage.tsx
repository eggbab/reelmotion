import { useLang } from '../../lang'
import { CLIPS } from '../../media/clips'
import { Footer, Header } from '../Chrome'
import { SITE_COPY } from '../copy'
import { pageMeta } from '../meta'
import { usePageMeta, useSiteBody } from '../usePageMeta'
import { FONT_CREDITS, LICENSES_UI, MODEL_CREDITS, PROGRAM_CREDITS, VIDEO_LICENSE } from './credits'
import { LEGAL_UI } from './heads'

const LICENSE_NAMES: Record<string, string> = {
  'OFL-1.1': 'SIL Open Font License 1.1',
  MIT: 'MIT License',
  'Apache-2.0': 'Apache License 2.0',
  'MPL-2.0': 'Mozilla Public License 2.0',
  ISC: 'ISC License',
}

const licenseName = (id: string) => LICENSE_NAMES[id] ?? id
const shortUrl = (url: string) => url.replace(/^https:\/\//, '')

function External({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {shortUrl(href)}
    </a>
  )
}

/** 오픈소스 라이선스: 글꼴·받아쓰기 모델·예시 영상·주요 프로그램(credits.ts)과 모든 프로그램의 사용 허가 전문(/licenses.txt). */
export function LicensesPage() {
  const { lang } = useLang()
  const copy = SITE_COPY[lang]
  const ui = LICENSES_UI[lang]
  usePageMeta(pageMeta('licenses', lang))
  useSiteBody()
  const sections = [
    {
      title: ui.fonts,
      body: (
        <ul className="credits">
          {FONT_CREDITS.map((font) => (
            <li key={font.name}>
              <strong>{font.name}</strong>
              <span>
                {licenseName(font.license)} · {font.copyright}
              </span>
              <External href={font.url} />
            </li>
          ))}
        </ul>
      ),
    },
    {
      title: ui.models,
      body: (
        <ul className="credits">
          {MODEL_CREDITS.map((model) => (
            <li key={model.name}>
              <strong>{model.name}</strong>
              <span>
                {model.by} · {licenseName(model.license)} · {model.where === 'server' ? ui.server : ui.browser}
              </span>
              <External href={model.url} />
            </li>
          ))}
        </ul>
      ),
    },
    {
      title: ui.videos,
      body: (
        <>
          <p>
            {ui.videosBody} {Object.values(CLIPS)
              .map((clip) => clip.source)
              .join(', ')}
          </p>
          <p>
            <a href={VIDEO_LICENSE.url} target="_blank" rel="noreferrer">
              {VIDEO_LICENSE.name}
            </a>
          </p>
        </>
      ),
    },
    {
      title: ui.programs,
      body: (
        <ul className="credits">
          {PROGRAM_CREDITS.map((program) => (
            <li key={program.name}>
              <strong>{program.name}</strong>
              <span>
                {licenseName(program.license)}
                {program.source && (
                  <>
                    {' '}
                    · {ui.source}: <External href={program.source} />
                  </>
                )}
              </span>
              <External href={program.url} />
            </li>
          ))}
        </ul>
      ),
    },
    {
      title: ui.full,
      body: (
        <>
          <p>{ui.fullBody}</p>
          <p>
            <a href="/licenses.txt">licenses.txt</a>
          </p>
        </>
      ),
    },
  ]
  return (
    <div className="site">
      <Header copy={copy} />
      <main id="main" className="legal">
        <div className="glow glow--top" aria-hidden="true" />
        <article className="legal__inner">
          <p className="eyebrow">{LEGAL_UI[lang].eyebrow}</p>
          <h1>{ui.title}</h1>
          <p className="legal__intro">{ui.intro}</p>
          {sections.map((section, index) => (
            <section key={section.title} id={`s${index + 1}`} aria-labelledby={`s${index + 1}-title`}>
              <h2 id={`s${index + 1}-title`}>
                <span className="legal__num">{index + 1}.</span> {section.title}
              </h2>
              {section.body}
            </section>
          ))}
        </article>
      </main>
      <Footer copy={copy} />
    </div>
  )
}
