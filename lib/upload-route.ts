import { NextRequest, NextResponse } from 'next/server'

import { auth } from './auth'
import { storeUpload } from './data'

const ALLOWED = ['image/png', 'image/jpeg', 'image/webp']
const MAX_BYTES = 8 * 1024 * 1024

export async function handleImageUpload(request: NextRequest, defaultBucket: 'pests' | 'avatars') {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const imageFile = formData.get('image')
  if (!imageFile || typeof imageFile === 'string') {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }
  const type = imageFile.type || 'image/jpeg'
  if (!ALLOWED.includes(type)) {
    return NextResponse.json({ error: 'Only PNG, JPEG or WEBP images are allowed' }, { status: 400 })
  }
  if (imageFile.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image must be under 8 MB' }, { status: 400 })
  }

  const bucket = formData.get('bucket') === 'pests' ? 'pests' : defaultBucket
  try {
    const { url, path, storage } = await storeUpload(
      bucket,
      session.user.id,
      await imageFile.arrayBuffer(),
      type
    )
    return NextResponse.json({ success: true, url, fileName: path, storage })
  } catch (error: any) {
    console.error('[upload] failed:', error?.message)
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
  }
}
