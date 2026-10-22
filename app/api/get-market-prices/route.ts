import { getPriceHistory } from '@/lib/data'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { district, item, type } = await req.json()
    if (!district || !item || !type) {
      return NextResponse.json(
        { data: [], message: 'district, item and type are required' },
        { status: 400 }
      )
    }
    const data = await getPriceHistory(district, item, type)
    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error fetching market prices:', error.message)
    return NextResponse.json(
      { data: [], message: 'Failed to fetch market prices' },
      { status: 500 }
    )
  }
}
