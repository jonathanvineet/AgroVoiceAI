'use client'

import { useEffect, useRef, useState } from 'react'
import type { LandingCopy } from './types'

// The same photograph at three distances: the field, the row of planters,
// then the hands and seedlings.
const STAGES = [
  { scale: 1, origin: '50% 50%' },
  { scale: 1.7, origin: '58% 72%' },
  { scale: 2.6, origin: '62% 80%' }
]

export default function Showcase({ copy }: { copy: LandingCopy['show'] }) {
  const markers = useRef<(HTMLDivElement | null)[]>([])
  const [stage, setStage] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) setStage(Number((e.target as HTMLElement).dataset.stage))
        }
      },
      { rootMargin: '-50% 0px -50% 0px' }
    )
    markers.current.forEach(m => m && io.observe(m))
    return () => io.disconnect()
  }, [])

  const s = STAGES[stage]
  // Until the script runs, everything shows at once.
  const shown = (from: number) => !ready || stage >= from

  return (
    <section className="lv-show" aria-labelledby="lv-show-title">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="lv-show-marker"
          style={{ top: `${i * 33.3}%` }}
          data-stage={i}
          ref={el => {
            markers.current[i] = el
          }}
        />
      ))}
      <div className="lv-show-stage lv-wrap">
        <h2 id="lv-show-title" className="lv-show-heading">
          <span className="lv-display lv-show-a">{copy.a}</span>
          <span
            className="lv-display lv-show-b"
            data-on={shown(1) ? '' : undefined}
          >
            {copy.b}
          </span>
        </h2>
        <div className="lv-show-frame">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing/paddy-fields-thanjavur.jpg"
            alt={copy.alt}
            width={1920}
            height={1280}
            loading="lazy"
            style={{ transform: `scale(${s.scale})`, transformOrigin: s.origin }}
          />
        </div>
        <p className="lv-show-caption" data-on={shown(2) ? '' : undefined}>
          {copy.caption}
        </p>
      </div>
    </section>
  )
}
