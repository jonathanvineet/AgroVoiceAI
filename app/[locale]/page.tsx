import NextLink from 'next/link'
import { getLocale, getMessages } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { Link } from '@/navigation'
import { hanken, notoTamil } from '@/components/Landing/fonts'
import ChatPreview from '@/components/Landing/chat-preview'
import ScrollScene from '@/components/Landing/scroll-scene'
import type { LandingCopy } from '@/components/Landing/types'
import './landing.css'

const TOOLS = [
  { id: 'chat', href: '/chat' },
  { id: 'weather', href: '/weather' },
  { id: 'market', href: '/market' },
  { id: 'soil', href: '/soiltest' },
  { id: 'pest', href: '/pest-identification' }
] as const

export default async function IndexPage() {
  const locale = await getLocale()
  const copy = (await getMessages()).Landing as unknown as LandingCopy
  const signedIn = !!(await auth())?.user
  const t = copy.hero
  const other = locale === 'ta' ? 'en' : 'ta'

  return (
    <div lang={locale} className={cn('lv', hanken.variable, notoTamil.variable)}>
      <ScrollScene />
      <header className="lv-nav">
        <NextLink href={`/${locale}`} className="lv-brand">
          AgroVoiceAI
        </NextLink>
        <nav aria-label="Main">
          <Link href="/" locale={other} lang={other}>
            {copy.nav.switch}
          </Link>
          <NextLink href={`/${locale}/${signedIn ? 'options' : 'sign-in'}`}>
            {signedIn ? copy.nav.explore : copy.nav.signin}
          </NextLink>
        </nav>
      </header>

      <main className="lv-hero">
        <div className="lv-copy">
          <h1>
            {t.l1} <span>{t.l2}</span>
          </h1>
          <p>{t.desc}</p>
          <NextLink href={`/${locale}/chat`} className="lv-btn">
            {t.cta}
          </NextLink>
        </div>
        <ChatPreview copy={copy.preview} />
      </main>

      <section className="lv-story" aria-labelledby="lv-story-title">
        <h2 id="lv-story-title">
          {[copy.story.l1, copy.story.l2, copy.story.l3].map((line, i) => (
            <span key={i} className="lv-story-line">
              {line.split(' ').map((word, j) => (
                <span key={j} className="lv-story-word">
                  {word}{' '}
                </span>
              ))}
            </span>
          ))}
        </h2>
      </section>

      <section className="lv-tools" aria-labelledby="lv-tools-title">
        <h2 id="lv-tools-title">{copy.tools.title}</h2>
        <ul>
          {TOOLS.map(tool => (
            <li key={tool.id}>
              <NextLink href={`/${locale}${tool.href}`}>
                <strong>{copy.tools[tool.id].name}</strong>
                <span>{copy.tools[tool.id].desc}</span>
                <i aria-hidden="true">→</i>
              </NextLink>
            </li>
          ))}
        </ul>
      </section>

      <footer className="lv-foot">
        <span>
          © {new Date().getFullYear()} AgroVoiceAI · {copy.footer.what}
        </span>
        <span>
          <NextLink href={`/${locale}/about`}>{copy.footer.about}</NextLink>
          <NextLink href={`/${locale}/contact`}>{copy.footer.contact}</NextLink>
        </span>
      </footer>
    </div>
  )
}
