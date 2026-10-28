import { Hanken_Grotesk, Noto_Sans_Tamil } from 'next/font/google'

export const hanken = Hanken_Grotesk({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap'
})

// Hanken has no Tamil script, so Tamil text falls back to this one.
export const notoTamil = Noto_Sans_Tamil({
  weight: ['400', '500', '600'],
  subsets: ['tamil'],
  variable: '--font-tamil',
  display: 'swap'
})
