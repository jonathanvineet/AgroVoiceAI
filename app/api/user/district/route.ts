import { createAdminSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { userId, district } = await req.json()

  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .update({ user_district: district })
    .eq('id', userId)
    .select()
  
  if (error) {
    console.error('Error updating district:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}
