import { createAdminSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createAdminSupabaseClient()
    
    // Check if profiles table exists and get its columns
    const { data: tableInfo, error: tableError } = await supabase.rpc('get_table_columns', {
      table_name: 'profiles'
    }).catch(() => ({ data: null, error: { message: 'RPC not available' } }))

    // Try to query the profiles table
    const { data: profiles, error: queryError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5)

    return NextResponse.json({
      status: 'ok',
      message: 'Checking profiles table',
      tableInfo,
      profilesCount: profiles?.length || 0,
      profilesData: profiles,
      errors: {
        tableInfo: tableError,
        query: queryError
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
      details: String(error)
    }, { status: 500 })
  }
}
