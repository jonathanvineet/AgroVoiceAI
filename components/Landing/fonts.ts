import LocalFont from 'next/font/local'
import { Hanken_Grotesk, Noto_Sans_Tamil } from 'next/font/google'

// Display face for the landing page (Zodiak, Fontshare free licence).
export const zodiak = LocalFont({
  src: [
    { path: '../../public/fonts/Zodiak-Thin.woff2', weight: '100' },
    { path: '../../public/fonts/Zodiak-Light.woff2', weight: '300' }
  ],
  variable: '--font-zodiak',
  display: 'swap'
})

export const hanken = Hanken_Grotesk({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap'
})

// Neither face carries Tamil script, so Tamil text falls back to this one.
export const notoTamil = Noto_Sans_Tamil({
  weight: ['300', '400', '500'],
  subsets: ['tamil'],
  variable: '--font-tamil',
  display: 'swap'
})
