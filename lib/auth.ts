import { createServerSupabaseClient } from './supabase-server'

/**
 * Get the current user session using Supabase
 * This is a compatibility layer for existing code that imports from @/lib/auth
 * 
 * Returns the Supabase user object or null if not authenticated
 */
export async function auth() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error
    } = await supabase.auth.getUser()

    if (error) {
      console.error('Auth error:', error)
      return null
    }

    // Return a user object compatible with existing code
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
  // Dummy handler for NextAuth compatibility
  const session = await auth()
  return new Response(JSON.stringify({ session }))
}

export const POST = async () => {
  // Dummy handler for NextAuth compatibility
  return new Response(JSON.stringify({ message: 'OK' }))
}