import { createAdminSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { userId, email } = await req.json()

  try {
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('profiles')
      .update({ email })
      .eq('id', userId)
      .select()
    
    if (error) {
      console.error('Error updating email:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    if (data && data.length > 0) {
      return NextResponse.json({ success: true }, { status: 200 })
    } else {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }
  } catch (error: any) {
    console.error('Error updating email:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
        { success: false, error: 'Failed to update email number' },
        { status: 400 }
      )
    }
  } catch (error) {
    // console.error("Error updating email number:", error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
