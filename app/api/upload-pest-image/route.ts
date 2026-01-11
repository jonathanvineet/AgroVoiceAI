import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const imageFile = formData.get('image') as File

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      )
    }

    // Create unique filename
    const fileName = `${session.user.id}/${Date.now()}.jpeg`
    
    // Convert file to buffer
    const buffer = await imageFile.arrayBuffer()
    
    console.log(`[Upload] Uploading to Supabase: ${fileName}, size: ${imageFile.size}`)
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('pests')
      .upload(fileName, buffer, {
        contentType: imageFile.type || 'image/jpeg',
        upsert: false
      })

    if (error) {
      console.error('[Upload] Supabase error:', error)
      throw error
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('pests')
      .getPublicUrl(fileName)

    console.log(`[Upload] Image uploaded successfully: ${publicUrl}`)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName
    })
  } catch (error: any) {
    console.error('[Upload] Error:', {
      message: error?.message,
      stack: error?.stack,
      code: error?.code
    })

    return NextResponse.json(
      {
        error: 'Failed to upload image',
        details: error?.message,
        code: error?.code
      },
      { status: 500 }
    )
  }
}
