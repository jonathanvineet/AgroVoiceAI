import NextLink from 'next/link'
import { getLocale, getMessages } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import credits from '@/public/landing/credits.json'
import { hanken, notoTamil, zodiak } from '@/components/Landing/fonts'
import Hero from '@/components/Landing/hero'
import Showcase from '@/components/Landing/showcase'
import Tools from '@/components/Landing/tools'
import Probe from '@/components/Landing/probe'
import Reveals from '@/components/Landing/reveals'
import type { LandingCopy } from '@/components/Landing/types'
import './landing.css'

export default async function IndexPage() {
  const locale = await getLocale()
  const copy = (await getMessages()).Landing as unknown as LandingCopy
  const signedIn = !!(await auth())?.user

  return (
    <div
      id="lv"
      lang={locale}
      className={cn('lv', zodiak.variable, hanken.variable, notoTamil.variable)}
    >
      <Reveals root="lv" />
      <Hero copy={copy} locale={locale} signedIn={signedIn} />

      <Showcase copy={copy.show} />

      <section className="lv-wind lv-wrap lv-grid" aria-labelledby="lv-wind-title">
        <div className="lv-wind-film" data-reveal>
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/landing/rice-field-kendrapara-poster.jpg"
            width={1024}
            height={576}
            aria-label={copy.wind.alt}
          >
            <source src="/landing/rice-field-kendrapara.webm" type="video/webm" />
          </video>
        </div>
        <div className="lv-wind-text">
          <h2 id="lv-wind-title" className="lv-head" data-reveal>
            {copy.wind.title}
          </h2>
          <p className="lv-lead" data-reveal>
            {copy.wind.body}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="lv-wind-still"
            src="/landing/paddy-field-full-of-spider-web-img.jpg"
            alt=""
            width={1920}
            height={1280}
            loading="lazy"
            data-reveal
          />
        </div>
      </section>

      <Tools copy={copy.tools} locale={locale} />

      <Probe copy={copy.probe} hero={copy.hero} />

      <section className="lv-cta" aria-labelledby="lv-cta-title">
        <h2 id="lv-cta-title" className="lv-display lv-cta-q">
          <span className="lv-cta-l1">{copy.cta.l1}</span>
          <span className="lv-cta-l2">{copy.cta.l2}</span>
        </h2>
        <div className="lv-cta-row" data-reveal>
          <NextLink href={`/${locale}/chat`} className="lv-btn lv-btn-primary">
            {copy.cta.chat}
          </NextLink>
          <span className="lv-cta-or">{copy.cta.or}</span>
          <NextLink href={`/${locale}/pest-identification`} className="lv-btn lv-btn-ink">
            {copy.cta.pest}
          </NextLink>
        </div>
        <p className="lv-cta-after">{copy.cta.after}</p>
      </section>

      <footer className="lv-footer lv-wrap">
        <div className="lv-footer-line">
          <span className="lv-soft">{copy.footer.what}</span>
          <nav className="lv-footer-links" aria-label="Footer">
            <NextLink href={`/${locale}/chat`}>{copy.nav.chat}</NextLink>
            <NextLink href={`/${locale}/weather`}>{copy.nav.weather}</NextLink>
            <NextLink href={`/${locale}/market`}>{copy.nav.market}</NextLink>
            <NextLink href={`/${locale}/about`}>{copy.footer.about}</NextLink>
            <NextLink href={`/${locale}/contact`}>{copy.footer.contact}</NextLink>
          </nav>
          <span className="lv-soft lv-footer-end">© {new Date().getFullYear()} AgroVoiceAI</span>
        </div>
        <p className="lv-credits lv-soft">
          {copy.footer.credits}{' '}
          {credits.map((c: { credit: string; page: string }, i: number) => (
            <span key={c.page}>
              <a href={c.page} rel="noopener noreferrer" target="_blank">
                {c.credit.replace(/, via Wikimedia Commons$/, '')}
              </a>
              {i < credits.length - 1 ? '; ' : '.'}
            </span>
          ))}
        </p>
      </footer>
    </div>
  )
}
