// @ts-check

const withNextIntl = require('next-intl/plugin')()

const withPWA = require('next-pwa')({
  dest: 'public/en',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development' // Disable PWA in dev to suppress warnings
})

/** @type {import('next').NextConfig} */
const config = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '**'
      }
    ]
  }
}
// @ts-ignore
module.exports = withNextIntl(withPWA(config))
