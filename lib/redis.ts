import { Redis } from '@upstash/redis'
import { readCollection, writeCollection } from './local-store'

/**
 * Key-value store used for chat history, share links and short-lived locks.
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL/TOKEN are set and reachable.
 * If they are missing, or Upstash fails (network down, deleted database), it
 * transparently falls back to a local JSON-backed store in `.data/kv.json`
 * so chat history keeps working offline.
 */

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

const remote: Redis | null =
  url && token && url.startsWith('https://') ? new Redis({ url, token }) : null

const RETRY_REMOTE_AFTER_MS = 5 * 60 * 1000
const REMOTE_TIMEOUT_MS = 4000
let remoteDownUntil = 0

type Entry =
  | { type: 'string'; value: any; expiresAt?: number }
  | { type: 'hash'; value: Record<string, any> }
  | { type: 'zset'; value: { member: string; score: number }[] }

const KV = 'kv'

function now() {
  return Date.now()
}

function getEntry(key: string): Entry | undefined {
  const col = readCollection<Entry>(KV)
  const entry = col[key]
  if (entry && entry.type === 'string' && entry.expiresAt && entry.expiresAt < now()) {
    delete col[key]
    writeCollection(KV, col)
    return undefined
  }
  return entry
}

function putEntry(key: string, entry: Entry | undefined) {
  const col = readCollection<Entry>(KV)
  if (entry) col[key] = entry
  else delete col[key]
  writeCollection(KV, col)
}

const local = {
  async get<T = any>(key: string): Promise<T | null> {
    const e = getEntry(key)
    return e && e.type === 'string' ? (e.value as T) : null
  },
  async set(
    key: string,
    value: any,
    opts?: { ex?: number; nx?: boolean }
  ): Promise<'OK' | null> {
    if (opts?.nx && getEntry(key)) return null
    putEntry(key, {
      type: 'string',
      value,
      expiresAt: opts?.ex ? now() + opts.ex * 1000 : undefined
    })
    return 'OK'
  },
  async del(...keys: string[]): Promise<number> {
    let n = 0
    for (const k of keys) {
      if (getEntry(k)) {
        putEntry(k, undefined)
        n++
      }
    }
    return n
  },
  async hgetall<T = Record<string, any>>(key: string): Promise<T | null> {
    const e = getEntry(key)
    return e && e.type === 'hash' ? (structuredClone(e.value) as T) : null
  },
  async hget<T = any>(key: string, field: string): Promise<T | null> {
    const e = getEntry(key)
    return e && e.type === 'hash' ? ((e.value[field] ?? null) as T) : null
  },
  async hmset(key: string, values: Record<string, any>): Promise<'OK'> {
    const e = getEntry(key)
    const current = e && e.type === 'hash' ? e.value : {}
    putEntry(key, { type: 'hash', value: { ...current, ...structuredClone(values) } })
    return 'OK'
  },
  async zadd(key: string, item: { score: number; member: string }): Promise<number> {
    const e = getEntry(key)
    const list = e && e.type === 'zset' ? e.value : []
    const existing = list.find(i => i.member === item.member)
    if (existing) existing.score = item.score
    else list.push({ ...item })
    putEntry(key, { type: 'zset', value: list })
    return existing ? 0 : 1
  },
  async zrem(key: string, ...members: string[]): Promise<number> {
    const e = getEntry(key)
    if (!e || e.type !== 'zset') return 0
    const before = e.value.length
    const value = e.value.filter(i => !members.includes(i.member))
    putEntry(key, { type: 'zset', value })
    return before - value.length
  },
  async zrange(
    key: string,
    start: number,
    stop: number,
    opts?: { rev?: boolean }
  ): Promise<string[]> {
    const e = getEntry(key)
    if (!e || e.type !== 'zset') return []
    const sorted = [...e.value].sort((a, b) =>
      opts?.rev ? b.score - a.score : a.score - b.score
    )
    const end = stop < 0 ? sorted.length + stop + 1 : stop + 1
    return sorted.slice(start, end).map(i => i.member)
  }
}

type Local = typeof local

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Upstash request timed out')), REMOTE_TIMEOUT_MS)
    )
  ])
}

async function run<K extends keyof Local>(
  method: K,
  args: Parameters<Local[K]>,
  remoteCall: (r: Redis) => Promise<any>
): Promise<Awaited<ReturnType<Local[K]>>> {
  if (remote && now() > remoteDownUntil) {
    try {
      return await withTimeout(remoteCall(remote))
    } catch (error: any) {
      remoteDownUntil = now() + RETRY_REMOTE_AFTER_MS
      console.warn(
        `[kv] Upstash unavailable (${error?.message || error}); using local store for the next 5 minutes`
      )
    }
  }
  return (local[method] as any)(...args)
}

export function kvMode(): 'upstash' | 'local' {
  return remote && now() > remoteDownUntil ? 'upstash' : 'local'
}

const redis = {
  get: <T = any>(key: string) =>
    run('get', [key], r => r.get<T>(key)) as Promise<T | null>,
  set: (key: string, value: any, opts?: { ex?: number; nx?: boolean }) =>
    run('set', [key, value, opts], r =>
      opts?.nx
        ? r.set(key, value, { ex: opts.ex ?? 60, nx: true })
        : opts?.ex
          ? r.set(key, value, { ex: opts.ex })
          : r.set(key, value)
    ),
  del: (...keys: string[]) => run('del', keys as any, r => r.del(...keys)),
  hgetall: <T = Record<string, any>>(key: string) =>
    run('hgetall', [key], r => r.hgetall(key)) as Promise<T | null>,
  hget: <T = any>(key: string, field: string) =>
    run('hget', [key, field], r => r.hget(key, field)) as Promise<T | null>,
  hmset: (key: string, values: Record<string, any>) =>
    run('hmset', [key, values], r => r.hset(key, values)),
  zadd: (key: string, item: { score: number; member: string }) =>
    run('zadd', [key, item], r => r.zadd(key, item)),
  zrem: (key: string, ...members: string[]) =>
    run('zrem', [key, ...members] as any, r => r.zrem(key, ...members)),
  zrange: (key: string, start: number, stop: number, opts?: { rev?: boolean }) =>
    run('zrange', [key, start, stop, opts], r =>
      r.zrange(key, start, stop, opts?.rev ? { rev: true } : undefined)
    ) as Promise<string[]>
}

export default redis
