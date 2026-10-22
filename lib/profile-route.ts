import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'

import { auth } from './auth'
import { getBackend } from './backend'
import { getProfile, isUserNameTaken, updateProfile, type ProfilePatch } from './data'
import { updateLocalUserEmail } from './local-auth'

/**
 * Shared handler for the `/api/user/*` settings routes. The user id always
 * comes from the session; a `userId` in the body is ignored.
 */
export function profileFieldRoute(
  bodyKey: string,
  field: keyof ProfilePatch,
  opts: { revalidate?: boolean } = {}
) {
  return async function POST(req: Request) {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    let body: Record<string, any>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }

    const value = body[bodyKey]
    if (value !== null && typeof value !== 'string') {
      return NextResponse.json(
        { success: false, error: `"${bodyKey}" must be a string` },
        { status: 400 }
      )
    }

    const id = session.user.id
    if (field === 'user_name' && value && (await isUserNameTaken(value, id))) {
      return NextResponse.json(
        { success: false, error: 'Username already taken' },
        { status: 409 }
      )
    }

    const { profile, error, status } = await updateProfile(id, {
      [field]: typeof value === 'string' ? value.trim() : value
    })
    if (error) {
      console.error(`[api/user] updating ${field} failed:`, error)
      return NextResponse.json({ success: false, error }, { status: status ?? 500 })
    }

    if (field === 'email' && getBackend() === 'local' && value) {
      updateLocalUserEmail(id, value)
    }
    if (opts.revalidate) revalidateTag('user')

    return NextResponse.json({ success: true, profile })
  }
}

/** GET handler that returns one field of the signed-in user's profile. */
export function profileFieldGet(field: keyof ProfilePatch, as: string) {
  return async function GET() {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const profile = await getProfile(session.user.id)
    return NextResponse.json({ [as]: profile?.[field] ?? null })
  }
}
