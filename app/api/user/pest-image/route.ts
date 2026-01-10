import { createAdminSupabaseClient } from '@/lib/supabase-server'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { userId, imageURL } = await req.json()

  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .update({ pest_image: imageURL })
    .eq('id', userId)
    .select()
  
  if (error) {
    console.error('Error updating pest image:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  revalidateTag('user')
  return NextResponse.json(data)
}
