import createMiddleware from 'next-intl/middleware'
import { pathnames, locales, localePrefix } from './config'
import { createServerClient } from '@supabase/ssr'
import { type NextRequest } from 'next/server'

const intlMiddleware = createMiddleware({
  defaultLocale: 'en',
  locales,
  pathnames,
  localePrefix
})

// Mirrors lib/backend.ts (kept inline: middleware runs on the edge runtime).
function useSupabase() {
  if (process.env.DATA_BACKEND === 'local') return false
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function middleware(request: NextRequest) {
  const response = intlMiddleware(request)

  if (!useSupabase()) return response

  // Refresh the Supabase SSR session cookie.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        }
      }
    }
  )

  try {
    await supabase.auth.getUser()
  } catch (error) {
    // Supabase unreachable: keep serving pages, the session just isn't refreshed.
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
