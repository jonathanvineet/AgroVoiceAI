'use client'

import { useState } from 'react'
import type { LandingCopy } from './types'

const STEPS = ['s1', 's2', 's3', 's4'] as const

export default function Probe({
  copy,
  hero
}: {
  copy: LandingCopy['probe']
  hero: LandingCopy['hero']
}) {
  const [step, setStep] = useState(0)
  const current = copy[STEPS[step]]

  return (
    <section className="lv-probe" aria-labelledby="lv-probe-title">
      <div className="lv-probe-text">
        <h2 id="lv-probe-title" className="lv-head" aria-live="polite" key={step}>
          {current.clause}
        </h2>
      </div>

      <div className="lv-probe-ui">
        <div className="lv-frag" data-ui key={step}>
          <div className="lv-frag-bar">
            <span>{copy.device}</span>
            <span className="lv-frag-ok">{copy.online}</span>
          </div>

          {step === 0 && (
            <div className="lv-frag-body">
              <p className="lv-frag-big">{copy.plotName}</p>
              <p>{copy.every}</p>
            </div>
          )}

          {step === 1 && (
            <table className="lv-frag-table">
              <caption>
                {copy.plot}: {copy.plotName}
              </caption>
              <tbody>
                <tr><th scope="row">{hero.n}</th><td>18 mg/kg</td></tr>
                <tr><th scope="row">{hero.p}</th><td>22 mg/kg</td></tr>
                <tr><th scope="row">{hero.k}</th><td>145 mg/kg</td></tr>
                <tr><th scope="row">{hero.moisture}</th><td>41 %</td></tr>
                <tr><th scope="row">{hero.ph}</th><td>6.4</td></tr>
                <tr><th scope="row">{hero.temp}</th><td>27.5 °C</td></tr>
              </tbody>
            </table>
          )}

          {step >= 2 && (
            <div className="lv-frag-chat">
              <div className="lv-msg lv-msg-you">
                <span>{copy.you}</span>
                <p>{copy.question}</p>
              </div>
              {step === 3 && (
                <div className="lv-msg">
                  <span>{copy.bot}</span>
                  <p>{copy.answer}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="lv-probe-slider">
        <input
          type="range"
          min={0}
          max={3}
          step={1}
          value={step}
          aria-label={copy.label}
          aria-valuetext={current.name}
          onChange={e => setStep(Number(e.target.value))}
          style={{ '--fill': `${(step / 3) * 100}%` } as React.CSSProperties}
        />
        <ol className="lv-probe-names">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                data-on={i === step ? '' : undefined}
                onClick={() => setStep(i)}
              >
                {copy[s].name}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
