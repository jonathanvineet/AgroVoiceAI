import { NextRequest, NextResponse } from 'next/server';

// Define the soil data type
interface SoilData {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  temperature: number;
  moisture: number;
  ph: number;
  ec: number;
  deviceId?: string;
  timestamp?: string;
}

// In-memory storage for latest sensor data
let latestSoilData: (SoilData & { timestamp: string }) | null = null;

// GET endpoint - returns latest soil data received from ESP8266/Arduino
export async function GET(request: NextRequest) {
  if (!latestSoilData) {
    return NextResponse.json(
      {
        status: 'info',
        message: 'No soil data received yet from ESP8266/Arduino',
        data: null,
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      status: 'success',
      message: 'Latest soil data from sensor',
      data: latestSoilData,
    },
    { status: 200 }
  );
}

// POST endpoint - receives soil sensor data from ESP8266/Arduino
export async function POST(request: NextRequest) {
  try {
    const body: SoilData = await request.json();

    // Validate required fields
    const requiredFields = ['nitrogen', 'phosphorus', 'potassium', 'temperature', 'moisture', 'ph', 'ec'];
    const missingFields = requiredFields.filter(field => !(field in body));

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          status: 'error',
          message: `Missing required fields: ${missingFields.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Store the latest data with timestamp
    const timestamp = new Date().toISOString();
    latestSoilData = {
      ...body,
      timestamp,
    };

    // Log the soil data
    console.log('✓ Received soil data from ESP8266:', {
      ...body,
      timestamp,
    });

    // Here you can:
    // 1. Store in database (Supabase/Prisma)
    // 2. Process the data
    // 3. Trigger alerts if values are outside normal range
    // 4. Send to ML models for recommendations

    return NextResponse.json(
      {
        status: 'success',
        message: 'Soil data received and processed',
        data: body,
        timestamp,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('✗ Error processing soil data:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
