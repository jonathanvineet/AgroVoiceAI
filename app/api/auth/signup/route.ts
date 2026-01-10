import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Sign up user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0]
        }
      }
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'User creation failed' },
        { status: 400 }
      )
    }

    // Use admin client to bypass RLS for user creation
    const adminClient = createAdminSupabaseClient()
    const { error: insertError, data: profileData } = await adminClient.from('profiles').insert({
      id: authData.user.id,
      email: email,
      name: name || email.split('@')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    if (insertError) {
      console.error('Error creating profile record:', insertError)
      // Return error so client knows profile creation failed
      return NextResponse.json(
        { error: 'Profile creation failed: ' + insertError.message },
        { status: 500 }
      )
    }
    
    console.log('Profile created successfully:', profileData)

    return NextResponse.json(
      { 
        message: 'User registered successfully',
        user: authData.user 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
