import { createAdminSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { district, item, type } = await req.json()

    console.log('Fetching market prices for district:', district, 'type', type, 'item:', item)

    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('market_prices')
      .select('*')
      .eq('district', district)
      .eq('name', item)
      .eq('type', type)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { data: [], message: 'Failed to fetch market prices' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data || [] })
  } catch (error: any) {
    console.error('Error fetching market prices:', error.message)
    return NextResponse.json(
      { data: [], message: 'Failed to fetch market prices' },
      { status: 500 }
    )
  }
}
