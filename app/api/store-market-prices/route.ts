import { savePriceSnapshot } from '@/lib/data'
import { toPrice } from '@/lib/market-scrape'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { district, items, type } = await req.json()
    if (!district || !Array.isArray(items) || !['vegetables', 'fruits'].includes(type)) {
      return NextResponse.json({ message: 'Invalid payload.' }, { status: 400 })
    }

    const { inserted } = await savePriceSnapshot(
      district,
      type,
      items.map((item: any) => ({ name: item.name, marketPrice: toPrice(item.marketPrice) }))
    )
    return NextResponse.json({ message: 'Data stored successfully.', inserted })
  } catch (error) {
    console.error('Error storing market prices:', error)
    return NextResponse.json({ message: 'Failed to store.' }, { status: 500 })
  }
}
