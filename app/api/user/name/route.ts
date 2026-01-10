import { createAdminSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { userId, name } = await req.json()

  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .update({ name })
    .eq('id', userId)
    .select()
  
  if (error) {
    console.error('Error updating name:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}

export async function GET(req: Request) {
  const userId = await auth()
  console.log(userId?.user.id)

  const userName = await db.user.findFirst({
    where: {
      id: userId?.user.id
    },
    select: {
      name: true
    }
  })
  return NextResponse.json(userName)
}
