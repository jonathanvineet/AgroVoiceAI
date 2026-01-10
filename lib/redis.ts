import { Redis } from '@upstash/redis'

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

if (!url) {
  throw new Error(
    'UPSTASH_REDIS_REST_URL is not set. Add your Upstash REST URL to your .env (must start with https://).'
  )
}

if (!url.startsWith('https://')) {
  throw new Error(
    `Invalid UPSTASH_REDIS_REST_URL. Expected a REST URL starting with "https://" but got: "${url}".\n` +
      'If you copied a redis-cli command, extract the host and use the REST URL (for example: https://maximum-cat-5246.upstash.io) and set UPSTASH_REDIS_REST_TOKEN to the REST token from the Upstash dashboard.'
  )
}

const redis = new Redis({
  url,
  token,
})

export default redis