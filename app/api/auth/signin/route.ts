import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getBackend } from '@/lib/backend'
import { setSessionCookie, verifyLocalUser } from '@/lib/local-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (getBackend() === 'local') {
      const user = verifyLocalUser(email, password)
      if (!user) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      }
      setSessionCookie(user.id)
      return NextResponse.json(
        {
          message: 'Signed in successfully',
          user: { id: user.id, email: user.email, name: user.name }
        },
        { status: 200 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    if (!data.user) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    return NextResponse.json(
      {
        message: 'Signed in successfully',
        user: data.user,
        session: data.session
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Signin error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
