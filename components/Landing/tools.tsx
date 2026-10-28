'use client'

import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import type { LandingCopy } from './types'

const TOOLS = [
  { id: 'chat', key: 'C', href: '/chat' },
  { id: 'weather', key: 'W', href: '/weather' },
  { id: 'market', key: 'M', href: '/market' },
  { id: 'soil', key: 'S', href: '/soiltest' },
  { id: 'pest', key: 'P', href: '/pest-identification' },
  { id: 'settings', key: 'D', href: '/settings' }
] as const

export default function Tools({
  copy,
  locale
}: {
  copy: LandingCopy['tools']
  locale: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string>('chat')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return TOOLS.filter(
      tool =>
        !q ||
        tool.id.includes(q) ||
        copy[tool.id].name.toLowerCase().includes(q) ||
        copy[tool.id].desc.toLowerCase().includes(q)
    )
  }, [query, copy])

  const active = rows.find(r => r.id === selected) ?? rows[0]

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!rows.length) return
    const at = Math.max(0, rows.indexOf(active!))
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = (at + (e.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length
      setSelected(rows[next].id)
    } else if (e.key === 'Enter' && active) {
      router.push(`/${locale}${active.href}`)
    } else if (e.altKey) {
      // Alt and a tool's letter opens it (e.code, since Alt changes e.key on a Mac).
      const hit = TOOLS.find(r => e.code === `Key${r.key}`)
      if (hit) {
        e.preventDefault()
        router.push(`/${locale}${hit.href}`)
      }
    }
  }

  return (
    <section className="lv-tools lv-wrap" aria-labelledby="lv-tools-title">
      <h2 id="lv-tools-title" className="lv-head" data-reveal>
        {copy.title}
      </h2>
      <div className="lv-cmd" data-ui data-reveal>
        <input
          className="lv-cmd-input"
          type="search"
          placeholder={copy.find}
          aria-label={copy.find}
          aria-controls="lv-cmd-list"
          aria-activedescendant={active ? `lv-cmd-${active.id}` : undefined}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <ul id="lv-cmd-list" className="lv-cmd-list" role="listbox" aria-label={copy.title}>
          {rows.map(tool => {
            const on = tool.id === active?.id
            return (
              <li
                key={tool.id}
                id={`lv-cmd-${tool.id}`}
                role="option"
                aria-selected={on}
                className="lv-cmd-row"
                data-on={on ? '' : undefined}
                onPointerEnter={() => setSelected(tool.id)}
              >
                <NextLink
                  href={`/${locale}${tool.href}`}
                  className="lv-cmd-link"
                  onFocus={() => setSelected(tool.id)}
                >
                  <span className="lv-cmd-name">{copy[tool.id].name}</span>
                  <span className="lv-cmd-keys" aria-hidden="true">
                    <kbd>Alt</kbd>
                    <kbd>{tool.key}</kbd>
                  </span>
                </NextLink>
                {on && <p className="lv-cmd-desc">{copy[tool.id].desc}</p>}
              </li>
            )
          })}
          {!rows.length && <li className="lv-cmd-empty">{copy.empty}</li>}
        </ul>
      </div>
    </section>
  )
}
