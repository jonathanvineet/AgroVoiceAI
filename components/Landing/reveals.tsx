'use client'

import { useEffect } from 'react'

// Marks the landing root as scripted and plays each [data-reveal] block once
// as it enters. Without script, nothing is hidden.
export default function Reveals({ root }: { root: string }) {
  useEffect(() => {
    const el = document.getElementById(root)
    if (!el) return
    el.classList.add('js')
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px' }
    )
    el.querySelectorAll('[data-reveal]').forEach(n => io.observe(n))
    return () => io.disconnect()
  }, [root])

  return null
}
