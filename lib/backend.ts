/**
 * Decides which persistence backend the app uses.
 *
 * - `supabase`: Supabase Auth + Postgres + Storage (needs the three Supabase env vars).
 * - `local`:    JSON files under `.data/` (auth, profiles, prices, uploads ...).
 *               Used automatically when Supabase is not configured, or forced with
 *               DATA_BACKEND=local (e.g. for an offline demo).
 */
export type Backend = 'supabase' | 'local'

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export function getBackend(): Backend {
  if (process.env.DATA_BACKEND === 'local') return 'local'
  if (process.env.DATA_BACKEND === 'supabase') return 'supabase'
  return isSupabaseConfigured() ? 'supabase' : 'local'
}

export const isLocalBackend = () => getBackend() === 'local'
