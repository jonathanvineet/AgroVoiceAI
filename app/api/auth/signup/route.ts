import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getBackend } from '@/lib/backend'
import { createProfile } from '@/lib/data'
import { createLocalUser } from '@/lib/local-auth'
import { NextRequest, NextResponse } from 'next/server'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 })
    }
    if (String(password).length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const displayName = name || email.split('@')[0]

    if (getBackend() === 'local') {
      let user
      try {
        user = createLocalUser(email, password, displayName)
      } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      await createProfile(user.id, user.email, displayName)
      return NextResponse.json(
        { message: 'User registered successfully', user: { id: user.id, email: user.email } },
        { status: 201 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: displayName } }
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'User creation failed' }, { status: 400 })
    }

    const { error: insertError } = await createProfile(authData.user.id, email, displayName)
    if (insertError) {
      console.error('Error creating profile record:', insertError)
      return NextResponse.json(
        { error: 'Profile creation failed: ' + insertError },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'User registered successfully', user: authData.user },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
