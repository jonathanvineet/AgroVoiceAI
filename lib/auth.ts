import { createServerSupabaseClient } from './supabase-server'
import { getBackend } from './backend'
import { getLocalSessionUserId, getLocalUser } from './local-auth'

export type Session = {
  user: {
    id: string
    email?: string
    name?: string
    image?: string | null
  }
}

/**
 * Get the current user session.
 * Supabase backend: reads the Supabase auth cookie.
 * Local backend: reads the signed `agrovoice_session` cookie.
 *
 * Returns null if not authenticated.
 */
export async function auth(): Promise<Session | null> {
  if (getBackend() === 'local') {
    const id = getLocalSessionUserId()
    const user = id ? getLocalUser(id) : null
    if (!user) return null
    return {
      user: { id: user.id, email: user.email, name: user.name, image: null }
    }
  }

  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error
    } = await supabase.auth.getUser()

    if (error) {
      // "Auth session missing" is the normal signed-out state.
      if (error.name !== 'AuthSessionMissingError') {
        console.error('Auth error:', error.message)
      }
      return null
    }

    if (user) {
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0],
          image: user.user_metadata?.image || null
        }
      }
    }

    return null
  } catch (error) {
    console.error('Session retrieval error:', error)
    return null
  }
}

export const GET = async () => {
  const session = await auth()
  return new Response(JSON.stringify({ session }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

export const POST = async () => {
  return new Response(JSON.stringify({ message: 'OK' }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
