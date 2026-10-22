import fs from 'fs'
import path from 'path'

/**
 * Tiny JSON-file document store used as the offline / no-cloud fallback.
 * Each collection lives in `.data/<name>.json` and is cached in memory.
 * Writes are atomic (write temp file + rename) so a crash never corrupts data.
 */

export const DATA_DIR = process.env.LOCAL_DATA_DIR
  ? path.resolve(process.env.LOCAL_DATA_DIR)
  : path.join(process.cwd(), '.data')

type Collection = Record<string, any>

const cache: Map<string, Collection> = (globalThis as any).__agvStoreCache ||
  new Map<string, Collection>()
;(globalThis as any).__agvStoreCache = cache

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function fileFor(name: string) {
  return path.join(DATA_DIR, `${name}.json`)
}

export function readCollection<T = any>(name: string): Record<string, T> {
  if (cache.has(name)) return cache.get(name) as Record<string, T>
  let data: Collection = {}
  try {
    const file = fileFor(name)
    if (fs.existsSync(file)) {
      data = JSON.parse(fs.readFileSync(file, 'utf8') || '{}')
    }
  } catch (error) {
    console.warn(`[local-store] Could not read ${name}, starting empty`, error)
    data = {}
  }
  cache.set(name, data)
  return data as Record<string, T>
}

export function writeCollection(name: string, data: Collection) {
  ensureDir(DATA_DIR)
  cache.set(name, data)
  const file = fileFor(name)
  const tmp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, file)
}

export function getDoc<T = any>(name: string, id: string): T | null {
  const col = readCollection<T>(name)
  return (col[id] as T) ?? null
}

export function setDoc<T = any>(name: string, id: string, value: T): T {
  const col = readCollection<T>(name)
  col[id] = value
  writeCollection(name, col)
  return value
}

export function updateDoc<T extends Record<string, any>>(
  name: string,
  id: string,
  patch: Partial<T>
): T | null {
  const col = readCollection<T>(name)
  if (!col[id]) return null
  col[id] = { ...col[id], ...patch }
  writeCollection(name, col)
  return col[id]
}

export function deleteDoc(name: string, id: string) {
  const col = readCollection(name)
  if (id in col) {
    delete col[id]
    writeCollection(name, col)
  }
}

export function listDocs<T = any>(
  name: string,
  filter?: (doc: T) => boolean
): T[] {
  const docs = Object.values(readCollection<T>(name))
  return filter ? docs.filter(filter) : docs
}

/** Binary uploads (profile pictures, pest photos) for the local backend. */
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')

export function saveUpload(relPath: string, data: Buffer) {
  const safe = relPath.replace(/\.\.+/g, '').replace(/^\/+/, '')
  const full = path.join(UPLOAD_DIR, safe)
  ensureDir(path.dirname(full))
  fs.writeFileSync(full, data)
  return safe
}

export function readUpload(relPath: string): Buffer | null {
  const full = path.join(UPLOAD_DIR, relPath)
  if (!full.startsWith(UPLOAD_DIR) || !fs.existsSync(full)) return null
  return fs.readFileSync(full)
}

export function deleteUpload(relPath: string) {
  const full = path.join(UPLOAD_DIR, relPath)
  if (full.startsWith(UPLOAD_DIR) && fs.existsSync(full)) fs.unlinkSync(full)
}
