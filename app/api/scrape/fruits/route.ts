import { getCurrentUser } from '@/app/actions'
import { scrapeMarket } from '@/lib/market-scrape'
import { NextRequest, NextResponse } from 'next/server'

async function respond(location: string | null | undefined) {
  if (!location) {
    return NextResponse.json({ message: 'Missing location parameter' }, { status: 400 })
  }
  try {
    return NextResponse.json(await scrapeMarket(location, 'fruits'))
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Market prices are unavailable right now.', scrapedData: [] },
      { status: 502 }
    )
  }
}

export async function POST(req: NextRequest) {
  const { location } = await req.json().catch(() => ({}))
  return respond(location)
}

export async function GET() {
  const user = await getCurrentUser()
  return respond(user?.user_district)
}
