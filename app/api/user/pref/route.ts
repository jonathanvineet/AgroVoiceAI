import { createAdminSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { userId, pref } = await req.json()

  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .update({ chatbot_preference: pref })
    .eq('id', userId)
    .select()
  
  if (error) {
    console.error('Error updating preference:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}
