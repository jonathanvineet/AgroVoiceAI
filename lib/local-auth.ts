import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { cookies } from 'next/headers'
import { DATA_DIR, getDoc, listDocs, setDoc, deleteDoc } from './local-store'

/**
 * Email + password authentication for the local (offline) backend.
 * Passwords are hashed with scrypt + per-user salt; sessions are an
 * HMAC-signed, httpOnly cookie.
 */

export const LOCAL_SESSION_COOKIE = 'agrovoice_session'
const SESSION_DAYS = 7

export type LocalUser = {
  id: string
  email: string
  name: string
  passwordHash: string
  salt: string
  created_at: string
}

function getSecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET
  const file = path.join(DATA_DIR, '.session-secret')
  try {
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8')
    fs.mkdirSync(DATA_DIR, { recursive: true })
    const secret = crypto.randomBytes(32).toString('hex')
    fs.writeFileSync(file, secret, { mode: 0o600 })
    return secret
  } catch {
    return 'agrovoice-local-dev-secret'
  }
}

function hash(password: string, salt: string) {
  return crypto.scryptSync(password, salt, 64).toString('hex')
}

function sign(payload: string) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')
}

export function findUserByEmail(email: string): LocalUser | null {
  const lower = email.trim().toLowerCase()
  return listDocs<LocalUser>('users', u => u.email === lower)[0] ?? null
}

export function createLocalUser(email: string, password: string, name: string) {
  const lower = email.trim().toLowerCase()
  if (findUserByEmail(lower)) {
    throw new Error('User already registered')
  }
  const salt = crypto.randomBytes(16).toString('hex')
  const user: LocalUser = {
    id: crypto.randomUUID(),
    email: lower,
    name,
    salt,
    passwordHash: hash(password, salt),
    created_at: new Date().toISOString()
  }
  setDoc('users', user.id, user)
  return user
}

export function verifyLocalUser(email: string, password: string): LocalUser | null {
  const user = findUserByEmail(email)
  if (!user) return null
  const expected = Buffer.from(user.passwordHash, 'hex')
  const actual = Buffer.from(hash(password, user.salt), 'hex')
  if (expected.length !== actual.length) return null
  return crypto.timingSafeEqual(expected, actual) ? user : null
}

export function getLocalUser(id: string): LocalUser | null {
  return getDoc<LocalUser>('users', id)
}

export function updateLocalUserEmail(id: string, email: string) {
  const user = getLocalUser(id)
  if (!user) return
  setDoc('users', id, { ...user, email: email.trim().toLowerCase() })
}

export function deleteLocalUser(id: string) {
  deleteDoc('users', id)
}

export function createSessionToken(userId: string) {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  const payload = `${userId}.${expires}`
  return `${payload}.${sign(payload)}`
}

export function readSessionToken(token?: string | null): string | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [userId, expires, signature] = parts
  const expected = sign(`${userId}.${expires}`)
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null
  }
  if (Number(expires) < Date.now()) return null
  return userId
}

export function setSessionCookie(userId: string) {
  cookies().set(LOCAL_SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.AUTH_URL?.startsWith('https'),
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60
  })
}

export function clearSessionCookie() {
  cookies().delete(LOCAL_SESSION_COOKIE)
}

export function getLocalSessionUserId(): string | null {
  try {
    return readSessionToken(cookies().get(LOCAL_SESSION_COOKIE)?.value)
  } catch {
    return null
  }
}
