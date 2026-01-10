import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { location } = await req.json()
    
    if (!location) {
      return NextResponse.json(
        { error: 'location is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENWEATHERMAP_API_KEY
    
    if (!apiKey || apiKey === 'local-openweathermap-demo') {
      console.warn('OpenWeatherMap API key not configured. Using mock data.')
      // Return mock forecast data for development
      return NextResponse.json({
        cod: '200',
        message: 0,
        cnt: 40,
        list: Array.from({ length: 8 }, (_, i) => ({
          dt: Math.floor(Date.now() / 1000) + i * 10800,
          dt_txt: new Date(Date.now() + i * 10800000).toISOString().replace('T', ' ').substring(0, 19),
          main: {
            temp: 28 - i * 0.5,
            feels_like: 30 - i * 0.5,
            temp_min: 26,
            temp_max: 30,
            pressure: 1013,
            humidity: 75 - i * 2
          },
          weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
          clouds: { all: 10 },
          wind: { speed: 5, deg: 230, gust: 8 },
          visibility: 10000,
          pop: 0.1,
          sys: { pod: 'd' }
        })),
        city: {
          id: 1174872,
          name: location,
          coord: { lat: 13.09, lon: 80.27 },
          country: 'IN',
          population: 1000000,
          timezone: 19800,
          sunrise: 1673587200,
          sunset: 1673625600
        }
      })
    }

    // Use 5 day forecast API (returns list of weather data points)
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`,
      { next: { tags: ['weather'] }, cache: 'force-cache' }
    )
    
    if (!response.ok) {
      console.error(`Weather API error: ${response.status} ${response.statusText}`)
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.message || 'Failed to fetch weather data' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Weather API error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const location = searchParams.get('location')
  
  if (!location) {
    return NextResponse.json(
      { error: 'location query parameter is required' },
      { status: 400 }
    )
  }
  
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?q=${location}&appid=${process.env.OPENWEATHERMAP_API_KEY}`,
    { next: { tags: ['weather'] }, cache: 'force-cache' }
  )
  const data = await response.json()

  return NextResponse.json(data)
}
