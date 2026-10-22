import { auth } from '@/lib/auth'
import { listSoilReadings, saveSoilReading } from '@/lib/data'
import { NextRequest, NextResponse } from 'next/server'

const FIELDS = ['nitrogen', 'phosphorus', 'potassium', 'temperature', 'moisture', 'ph', 'ec'] as const

// GET - latest reading (from the ESP8266/Arduino sensor or the simulator)
export async function GET() {
  const [latest] = await listSoilReadings(1)
  if (!latest) {
    return NextResponse.json(
      {
        status: 'info',
        message: 'No soil data received yet from ESP8266/Arduino',
        data: null
      },
      { status: 200 }
    )
  }

  return NextResponse.json(
    {
      status: 'success',
      message: 'Latest soil data from sensor',
      data: { ...latest, timestamp: latest.created_at, deviceId: latest.device_id }
    },
    { status: 200 }
  )
}

// POST - receives soil sensor data from ESP8266/Arduino
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const sharedKey = process.env.SOIL_SENSOR_KEY
    if (sharedKey && request.headers.get('x-sensor-key') !== sharedKey) {
      return NextResponse.json({ status: 'error', message: 'Invalid sensor key' }, { status: 401 })
    }

    const missing = FIELDS.filter(f => !(f in body))
    if (missing.length > 0) {
      return NextResponse.json(
        { status: 'error', message: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      )
    }
    const invalid = FIELDS.filter(f => !Number.isFinite(Number(body[f])))
    if (invalid.length > 0) {
      return NextResponse.json(
        { status: 'error', message: `Non-numeric fields: ${invalid.join(', ')}` },
        { status: 400 }
      )
    }

    const session = await auth().catch(() => null)
    const reading = await saveSoilReading({
      device_id: body.deviceId ?? null,
      user_id: session?.user.id ?? null,
      source: session?.user ? 'manual' : 'sensor',
      nitrogen: Number(body.nitrogen),
      phosphorus: Number(body.phosphorus),
      potassium: Number(body.potassium),
      temperature: Number(body.temperature),
      moisture: Number(body.moisture),
      ph: Number(body.ph),
      ec: Number(body.ec),
      created_at: new Date().toISOString()
    })

    console.log('✓ Received soil data:', reading)

    return NextResponse.json(
      {
        status: 'success',
        message: 'Soil data received and stored',
        data: reading,
        timestamp: reading.created_at
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('✗ Error processing soil data:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
