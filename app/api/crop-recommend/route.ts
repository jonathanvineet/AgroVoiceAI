import { recommendCrop } from '@/lib/offline-agri'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Crop recommendation. Proxies to the ML server when SOIL_TEST_SERVER_URL is
 * set; otherwise (or if it fails) uses the built-in nearest-profile model.
 * Response: { crop: <id from cropInEnglish>, source: 'ml' | 'offline' }
 */
export async function POST(req: NextRequest) {
  const data = await req.json().catch(() => null)
  if (!data) {
    return NextResponse.json({ error: 'Soil readings are required' }, { status: 400 })
  }

  const server = process.env.SOIL_TEST_SERVER_URL || process.env.NEXT_PUBLIC_SOIL_TEST_SERVER_URL
  if (server) {
    try {
      const res = await fetch(server, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(8000)
      })
      if (res.ok) {
        const json = await res.json()
        if (json?.crop) return NextResponse.json({ crop: json.crop, source: 'ml' })
      }
    } catch (error: any) {
      console.warn('[crop-recommend] ML server failed, using offline model:', error?.message)
    }
  }

  return NextResponse.json({ crop: recommendCrop(data), source: 'offline' })
}
