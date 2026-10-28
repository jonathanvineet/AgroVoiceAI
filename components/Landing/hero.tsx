'use client'

import dynamic from 'next/dynamic'
import NextLink from 'next/link'
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from '@/navigation'
import MyToast from '@/components/ui/my-toast'
import type { Wind } from './field-scene'
import type { LandingCopy } from './types'

const FieldScene = dynamic(() => import('./field-scene'), { ssr: false })

// Sample plot. The probe section and its chat answer use the same figures.
const READING = [
  { key: 'n', value: '18', unit: 'mg/kg' },
  { key: 'p', value: '22', unit: 'mg/kg' },
  { key: 'k', value: '145', unit: 'mg/kg' },
  { key: 'moisture', value: '41', unit: '%' },
  { key: 'ph', value: '6.4', unit: '' },
  { key: 'temp', value: '27.5', unit: '°C' }
] as const

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function useInstallPrompt() {
  const [prompt, setPrompt] = useState<any>(null)
  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPrompt(event)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])
  return prompt
}

export default function Hero({
  copy,
  locale,
  signedIn
}: {
  copy: LandingCopy
  locale: string
  signedIn: boolean
}) {
  const t = copy.hero
  const wind = useRef<Wind>({ target: 0, value: 0 })
  const level = useRef<HTMLSpanElement>(null)
  const audio = useRef<{ stream: MediaStream; ctx: AudioContext; raf: number } | null>(null)
  const lastPointer = useRef<{ x: number; t: number } | null>(null)
  const [listening, setListening] = useState(false)
  const [denied, setDenied] = useState(false)
  const installPrompt = useInstallPrompt()

  const stop = useCallback(() => {
    const a = audio.current
    if (a) {
      cancelAnimationFrame(a.raf)
      a.stream.getTracks().forEach(track => track.stop())
      a.ctx.close()
      audio.current = null
    }
    if (level.current) level.current.style.transform = 'scaleX(0)'
    setListening(false)
  }, [])

  const start = useCallback(async () => {
    if (audio.current || !navigator.mediaDevices?.getUserMedia) {
      if (!navigator.mediaDevices?.getUserMedia) setDenied(true)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      ctx.createMediaStreamSource(stream).connect(analyser)
      const samples = new Uint8Array(analyser.fftSize)
      const tick = () => {
        analyser.getByteTimeDomainData(samples)
        let sum = 0
        for (const s of samples) sum += ((s - 128) / 128) ** 2
        const loudness = Math.min(1, Math.sqrt(sum / samples.length) * 7)
        wind.current.target = Math.max(wind.current.target, loudness)
        if (level.current) level.current.style.transform = `scaleX(${loudness})`
        if (audio.current) audio.current.raf = requestAnimationFrame(tick)
      }
      audio.current = { stream, ctx, raf: requestAnimationFrame(tick) }
      setDenied(false)
      setListening(true)
    } catch {
      setDenied(true)
    }
  }, [])

  useEffect(() => stop, [stop])

  // Without a microphone, a quick sweep of the pointer or finger is a gust.
  const onStagePointer = (e: React.PointerEvent) => {
    const now = performance.now()
    const last = lastPointer.current
    if (last) {
      const speed = Math.abs(e.clientX - last.x) / Math.max(16, now - last.t)
      wind.current.target = Math.max(wind.current.target, Math.min(1, speed * 0.6))
    }
    lastPointer.current = { x: e.clientX, t: now }
  }

  const install = () => {
    if (!installPrompt) {
      MyToast({
        message:
          locale === 'ta'
            ? 'உங்கள் உலாவி நிறுவலை ஆதரிக்கவில்லை அல்லது செயலி ஏற்கனவே நிறுவப்பட்டுள்ளது. Chrome உலாவியைப் பயன்படுத்தவும்.'
            : 'Your browser cannot install the app, or it is already installed. Try Chrome.',
        type: 'error'
      })
      return
    }
    installPrompt.prompt()
  }

  return (
    <section className="lv-hero" aria-labelledby="lv-title">
      <header className="lv-nav lv-wrap">
        <NextLink href={`/${locale}`} className="lv-wordmark">
          AgroVoiceAI
        </NextLink>
        <nav className="lv-nav-links" aria-label="Main">
          <NextLink href={`/${locale}/chat`}>{copy.nav.chat}</NextLink>
          <NextLink href={`/${locale}/weather`}>{copy.nav.weather}</NextLink>
          <NextLink href={`/${locale}/market`}>{copy.nav.market}</NextLink>
          <Link href="/" locale={locale === 'ta' ? 'en' : 'ta'} lang={locale === 'ta' ? 'en' : 'ta'}>
            {copy.nav.switch}
          </Link>
          <NextLink
            href={`/${locale}/${signedIn ? 'options' : 'sign-in'}`}
            className="lv-nav-action"
          >
            {signedIn ? copy.nav.explore : copy.nav.signin}
          </NextLink>
        </nav>
      </header>

      <div className="lv-stage" onPointerMove={onStagePointer}>
        <SceneBoundary
          fallback={
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="lv-stage-fallback"
              src="/landing/paddy-field-in-tamil-nadu-india.jpg"
              alt={t.stage}
              width={1920}
              height={2557}
            />
          }
        >
          <FieldScene wind={wind} label={t.stage} />
        </SceneBoundary>

        <dl className="lv-reading" data-ui data-reveal>
          <div className="lv-reading-head">{t.reading}</div>
          {READING.map(r => (
            <div key={r.key} className="lv-reading-row">
              <dt>{t[r.key]}</dt>
              <dd>
                {r.value}
                {r.unit && <span> {r.unit}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="lv-hero-text lv-wrap lv-grid">
        <h1 id="lv-title" className="lv-display lv-lines lv-hero-title">
          <span className="lv-line">
            <span data-line style={{ '--i': 0 } as React.CSSProperties}>
              {t.l1}
            </span>
          </span>
          <span className="lv-line">
            <span data-line style={{ '--i': 1 } as React.CSSProperties}>
              {t.l2}
            </span>
          </span>
        </h1>
        <div className="lv-hero-side lv-after-lines">
          <p className="lv-lead">{t.desc}</p>
          <div className="lv-actions">
            <NextLink href={`/${locale}/chat`} className="lv-btn lv-btn-primary">
              {t.cta}
            </NextLink>
            <button type="button" className="lv-btn" onClick={install}>
              {t.install}
            </button>
          </div>
          <button
            type="button"
            className="lv-mic"
            aria-pressed={listening}
            onPointerDown={e => {
              e.currentTarget.setPointerCapture(e.pointerId)
              start()
            }}
            onPointerUp={stop}
            onPointerCancel={stop}
            onKeyDown={e => {
              if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
                e.preventDefault()
                start()
              }
            }}
            onKeyUp={e => {
              if (e.key === ' ' || e.key === 'Enter') stop()
            }}
            onBlur={stop}
          >
            <span className="lv-mic-level" ref={level} aria-hidden="true" />
            <span className="lv-mic-label">{listening ? t.listening : t.mic}</span>
          </button>
          <p className="lv-note" role="status">
            {denied ? t.denied : ''}
          </p>
        </div>
      </div>
    </section>
  )
}
