import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getBackend } from '@/lib/backend'
import { clearSessionCookie } from '@/lib/local-auth'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    if (getBackend() === 'local') {
      clearSessionCookie()
      return NextResponse.json({ message: 'Signed out successfully' }, { status: 200 })
    }

    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Signed out successfully' }, { status: 200 })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
