import { createAdminSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { userId, userName } = await req.json()

  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .update({ user_name: userName })
    .eq('id', userId)
    .select()
  
  if (error) {
    console.error('Error updating username:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}

export async function GET(req: Request) {
  const { userId } = await req.json()

  const userName = await db.user.findFirst({
    where: {
      id: userId
    },
    select: {
      userName: true
    }
  })
  return NextResponse.json(userName)
}
