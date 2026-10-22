import { getBackend } from './backend'
import { createAdminSupabaseClient } from './supabase-server'
import {
  deleteDoc,
  getDoc,
  listDocs,
  readCollection,
  saveUpload,
  setDoc,
  writeCollection
} from './local-store'

/**
 * Data-access layer. Every read/write the app performs goes through here so the
 * same code works against Supabase (cloud) or the local JSON store (offline).
 */

export type Profile = {
  id: string
  email: string | null
  name: string | null
  user_name: string | null
  phone: string | null
  age: string | null
  user_district: string | null
  gender: string | null
  image: string | null
  pest_image: string | null
  chatbot_preference: string | null
  page_shown: boolean | null
  created_at: string
  updated_at: string
}

export const EDITABLE_PROFILE_FIELDS = [
  'email',
  'name',
  'user_name',
  'phone',
  'age',
  'user_district',
  'gender',
  'image',
  'pest_image',
  'chatbot_preference',
  'page_shown'
] as const

export type ProfilePatch = Partial<Pick<Profile, (typeof EDITABLE_PROFILE_FIELDS)[number]>>

function emptyProfile(id: string, email: string | null, name: string | null): Profile {
  const now = new Date().toISOString()
  return {
    id,
    email,
    name,
    user_name: null,
    phone: null,
    age: null,
    user_district: null,
    gender: null,
    image: null,
    pest_image: null,
    chatbot_preference: null,
    page_shown: false,
    created_at: now,
    updated_at: now
  }
}

/* ----------------------------- profiles ----------------------------- */

export async function getProfile(id: string): Promise<Profile | null> {
  if (getBackend() === 'local') return getDoc<Profile>('profiles', id)

  const { data, error } = await createAdminSupabaseClient()
    .from('profiles')
    .select('*')
    .eq('id', id)
    .limit(1)
  if (error) {
    console.error('[data] getProfile failed:', error.message)
    return null
  }
  return (data?.[0] as Profile) ?? null
}

export async function createProfile(
  id: string,
  email: string,
  name: string
): Promise<{ error?: string }> {
  const profile = emptyProfile(id, email, name)
  if (getBackend() === 'local') {
    setDoc('profiles', id, profile)
    return {}
  }
  const { error } = await createAdminSupabaseClient().from('profiles').insert({
    id,
    email,
    name,
    created_at: profile.created_at,
    updated_at: profile.updated_at
  })
  return error ? { error: error.message } : {}
}

export async function updateProfile(
  id: string,
  patch: ProfilePatch
): Promise<{ profile?: Profile; error?: string; status?: number }> {
  const clean: Record<string, any> = {}
  for (const key of EDITABLE_PROFILE_FIELDS) {
    if (key in patch) clean[key] = (patch as any)[key]
  }
  clean.updated_at = new Date().toISOString()

  if (getBackend() === 'local') {
    const current = getDoc<Profile>('profiles', id)
    if (!current) return { error: 'Profile not found', status: 404 }
    const profile = { ...current, ...clean }
    setDoc('profiles', id, profile)
    return { profile }
  }

  const { data, error } = await createAdminSupabaseClient()
    .from('profiles')
    .update(clean)
    .eq('id', id)
    .select()
  if (error) return { error: error.message, status: 500 }
  if (!data || data.length === 0) return { error: 'Profile not found', status: 404 }
  return { profile: data[0] as Profile }
}

export async function isUserNameTaken(userName: string, exceptId: string) {
  if (getBackend() === 'local') {
    return listDocs<Profile>(
      'profiles',
      p => p.user_name?.toLowerCase() === userName.toLowerCase() && p.id !== exceptId
    ).length > 0
  }
  const { data } = await createAdminSupabaseClient()
    .from('profiles')
    .select('id')
    .ilike('user_name', userName)
    .neq('id', exceptId)
    .limit(1)
  return Boolean(data && data.length)
}

export async function deleteProfile(id: string) {
  if (getBackend() === 'local') {
    deleteDoc('profiles', id)
    return
  }
  await createAdminSupabaseClient().from('profiles').delete().eq('id', id)
}

/* ------------------- optional tables with local fallback ------------------- */

const missingTables = new Set<string>()

/**
 * Runs `remote` against Supabase when that backend is active and the table
 * exists; otherwise (or on failure) runs `local`. Lets optional tables such as
 * `soil_readings` or `pest_feedback` work even before their SQL migration has
 * been applied in Supabase.
 */
async function withTableFallback<T>(
  table: string,
  remote: () => Promise<{ data: T | null; error: any }>,
  local: () => T
): Promise<T> {
  if (getBackend() === 'supabase' && !missingTables.has(table)) {
    try {
      const { data, error } = await remote()
      if (!error) return data as T
      if (['42P01', 'PGRST205', 'PGRST204'].includes(error.code)) {
        missingTables.add(table)
        console.warn(
          `[data] Supabase table "${table}" is missing; using local store (see supabase/migrations).`
        )
      } else {
        console.warn(`[data] Supabase ${table} error, using local store:`, error.message)
      }
    } catch (error: any) {
      console.warn(`[data] Supabase ${table} unreachable, using local store:`, error?.message)
    }
  }
  return local()
}

/* ----------------------------- market prices ----------------------------- */

export type PricePoint = {
  id?: string | number
  district: string
  name: string
  type: string
  market_price: number
  created_at: string
}

const dayKey = (iso: string) => iso.slice(0, 10)

/**
 * Stores one price point per item, district, type and day. Called after every
 * successful scrape so the Insights chart builds real history over time.
 */
export async function savePriceSnapshot(
  district: string,
  type: string,
  items: { name: string; marketPrice: number }[]
): Promise<{ inserted: number }> {
  const valid = items.filter(i => i.name && Number.isFinite(i.marketPrice))
  if (!valid.length) return { inserted: 0 }
  const now = new Date().toISOString()
  const today = dayKey(now)

  const saveLocal = () => {
    const col = readCollection<PricePoint>('market_prices')
    let inserted = 0
    for (const item of valid) {
      const id = `${district}|${type}|${item.name}|${today}`
      if (!col[id]) inserted++
      col[id] = {
        id,
        district,
        type,
        name: item.name,
        market_price: item.marketPrice,
        created_at: col[id]?.created_at ?? now
      }
    }
    writeCollection('market_prices', col)
    return { inserted }
  }

  return withTableFallback(
    'market_prices',
    async () => {
      const supabase = createAdminSupabaseClient()
      const { data: existing, error } = await supabase
        .from('market_prices')
        .select('name')
        .eq('district', district)
        .eq('type', type)
        .gte('created_at', `${today}T00:00:00Z`)
      if (error) return { data: null, error }
      const seen = new Set((existing || []).map((r: any) => r.name))
      const rows = valid
        .filter(i => !seen.has(i.name))
        .map(i => ({
          district,
          type,
          name: i.name,
          market_price: i.marketPrice,
          created_at: now,
          updated_at: now
        }))
      if (!rows.length) return { data: { inserted: 0 }, error: null }
      const { error: insertError } = await supabase.from('market_prices').insert(rows)
      return { data: { inserted: rows.length }, error: insertError }
    },
    saveLocal
  )
}

export async function getPriceHistory(
  district: string,
  name: string,
  type: string
): Promise<PricePoint[]> {
  const local = () =>
    listDocs<PricePoint>(
      'market_prices',
      p => p.district === district && p.name === name && p.type === type
    ).sort((a, b) => a.created_at.localeCompare(b.created_at))

  return withTableFallback(
    'market_prices',
    async () => {
      const { data, error } = await createAdminSupabaseClient()
        .from('market_prices')
        .select('*')
        .eq('district', district)
        .eq('name', name)
        .eq('type', type)
        .order('created_at', { ascending: true })
      return { data: (data as PricePoint[]) || [], error }
    },
    local
  )
}

/* ------------------------------ soil readings ------------------------------ */

export type SoilReading = {
  id?: string
  device_id: string | null
  user_id: string | null
  source: 'sensor' | 'manual'
  nitrogen: number
  phosphorus: number
  potassium: number
  temperature: number
  moisture: number
  ph: number
  ec: number
  created_at: string
}

export async function saveSoilReading(reading: SoilReading): Promise<SoilReading> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return withTableFallback(
    'soil_readings',
    async () => {
      const { data, error } = await createAdminSupabaseClient()
        .from('soil_readings')
        .insert(reading)
        .select()
      return { data: (data?.[0] as SoilReading) ?? reading, error }
    },
    () => setDoc('soil_readings', id, { ...reading, id })
  )
}

export async function listSoilReadings(limit = 20): Promise<SoilReading[]> {
  return withTableFallback(
    'soil_readings',
    async () => {
      const { data, error } = await createAdminSupabaseClient()
        .from('soil_readings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
      return { data: (data as SoilReading[]) || [], error }
    },
    () =>
      listDocs<SoilReading>('soil_readings')
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, limit)
  )
}

/* ------------------------------ pest feedback ------------------------------ */

export type PestFeedback = {
  id?: string
  user_id: string
  pest_image: string | null
  model_answer: string | null
  user_answer: string | null
  confidence: string | null
  correctness: 'correct' | 'incorrect'
  feedback: string | null
  created_at: string
}

export async function savePestFeedback(fb: PestFeedback) {
  const id = `${Date.now()}-${fb.user_id.slice(0, 8)}`
  return withTableFallback(
    'pest_feedback',
    async () => {
      const { error } = await createAdminSupabaseClient().from('pest_feedback').insert(fb)
      return { data: fb, error }
    },
    () => setDoc('pest_feedback', id, { ...fb, id })
  )
}

export async function listPestFeedback(): Promise<PestFeedback[]> {
  return withTableFallback(
    'pest_feedback',
    async () => {
      const { data, error } = await createAdminSupabaseClient()
        .from('pest_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      return { data: (data as PestFeedback[]) || [], error }
    },
    () =>
      listDocs<PestFeedback>('pest_feedback').sort((a, b) =>
        b.created_at.localeCompare(a.created_at)
      )
  )
}

/* --------------------------------- uploads --------------------------------- */

/**
 * Stores an uploaded image and returns a URL the browser can load.
 * Supabase Storage bucket when available, otherwise `.data/uploads`
 * served through `/api/uploads/...`.
 */
export async function storeUpload(
  bucket: 'pests' | 'avatars',
  userId: string,
  data: ArrayBuffer,
  contentType: string
): Promise<{ url: string; path: string; storage: 'supabase' | 'local' }> {
  const ext =
    contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpeg'
  const fileName = `${userId}/${Date.now()}.${ext}`

  if (getBackend() === 'supabase') {
    try {
      const supabase = createAdminSupabaseClient()
      const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, data, { contentType, upsert: false })
      if (!error) {
        const {
          data: { publicUrl }
        } = supabase.storage.from(bucket).getPublicUrl(fileName)
        return { url: publicUrl, path: fileName, storage: 'supabase' }
      }
      console.warn(`[upload] Supabase bucket "${bucket}" failed, saving locally:`, error.message)
    } catch (error: any) {
      console.warn('[upload] Supabase storage unreachable, saving locally:', error?.message)
    }
  }

  const rel = saveUpload(`${bucket}/${fileName}`, Buffer.from(data))
  return { url: `/api/uploads/${rel}`, path: rel, storage: 'local' }
}

/* ------------------------------ generic cache ------------------------------ */

/** Small local cache (weather / market snapshots) used when the network is down. */
export function putCache<T>(key: string, value: T) {
  setDoc('cache', key, { value, saved_at: new Date().toISOString() })
}

export function getCache<T>(key: string): { value: T; saved_at: string } | null {
  return getDoc<{ value: T; saved_at: string }>('cache', key)
}
