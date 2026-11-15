import { useEffect } from 'react'
import { useLang } from '../lang'
import { FloatingBar, Footer, Header } from './Chrome'
import { SITE_COPY } from './copy'
import { Hero } from './Hero'
import { Anywhere, Chat, Faq, Features, Formats, Lanes, Make, Pricing, Statement, StylesCarousel } from './Sections'
import { Steps } from './Steps'

export function LandingPage() {
  const { lang } = useLang()
  const copy = SITE_COPY[lang]
  useEffect(() => {
    document.title = `ReelMotion — ${copy.hero.before}${copy.hero.words[0]}${copy.hero.after}`
    document.body.classList.add('site-body')
    return () => document.body.classList.remove('site-body')
  }, [copy])
  return (
    <div className="site">
      <Header copy={copy} />
      <main id="main">
        <Hero copy={copy} lang={lang} />
        <Make copy={copy} lang={lang} />
        <Steps copy={copy} lang={lang} />
        <StylesCarousel copy={copy} lang={lang} />
        <Formats copy={copy} lang={lang} />
        <Lanes copy={copy} lang={lang} />
        <Statement copy={copy} />
        <Chat copy={copy} lang={lang} />
        <Anywhere copy={copy} />
        <Features copy={copy} />
        <Pricing copy={copy} />
        <Faq copy={copy} />
      </main>
      <Footer copy={copy} />
      <FloatingBar copy={copy} />
    </div>
  )
}
