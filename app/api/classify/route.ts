import { auth } from '@/lib/auth'
import { getCurrentUser } from '@/app/actions'
import { GoogleGenAI } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'

const client = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY || ''
})

// Supported image formats according to Gemini docs
const SUPPORTED_FORMATS = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif']
const MAX_IMAGE_SIZE = 20 * 1024 * 1024 // 20 MB for inline data per Gemini docs

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const imageFile = formData.get('image') as File

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      )
    }

    // Validate image format
    if (!SUPPORTED_FORMATS.includes(imageFile.type)) {
      return NextResponse.json(
        {
          error: `Unsupported image format. Supported formats: PNG, JPEG, WEBP, HEIC, HEIF. Received: ${imageFile.type}`
        },
        { status: 400 }
      )
    }

    // Validate image size
    if (imageFile.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: `Image size exceeds 20 MB limit for inline data. Size: ${imageFile.size} bytes` },
        { status: 400 }
      )
    }

    // Convert file to base64 for Gemini inline data
    const buffer = await imageFile.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    console.log(`[Classify] Processing image for user ${user.id}, size: ${imageFile.size}, type: ${imageFile.type}`)

    // Use Gemini Vision API following official docs format
    // https://ai.google.dev/gemini-api/docs/image-understanding
    const prompt = `You are an expert agricultural pest identification specialist. Analyze this plant image for pests and diseases.

Respond ONLY with valid JSON (no markdown, no extra text) with this exact structure:
{
  "pest_name": "name of pest or disease, or 'none' if no issues found",
  "confidence": "high|medium|low",
  "affected_part": "description of which plant part is affected",
  "treatment": "detailed treatment recommendation",
  "severity": "mild|moderate|severe",
  "description": "brief description of the condition"
}`

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: imageFile.type,
            data: base64
          }
        },
        { text: prompt }
      ]
    })

    const content = response.text || ''
    
    console.log(`[Classify] Response received: ${content?.substring(0, 100)}...`)

    // Parse the response (should be JSON)
    let classificationResult
    try {
      // Remove markdown code fences if present
      let jsonText = content.trim()
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '')
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '')
      }
      
      classificationResult = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('[Classify] JSON parse error:', parseError)
      classificationResult = {
        pest_name: 'Unable to parse',
        analysis: content,
        confidence: 'low',
        raw_response: content
      }
    }

    return NextResponse.json({
      success: true,
      classification: classificationResult,
      user_id: user.id,
      model: 'gemini-2.5-flash',
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Classify] Error:', {
      message: error?.message,
      stack: error?.stack
    })

    // Handle specific Gemini API errors
    if (error?.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'Google API key is invalid or missing' },
        { status: 401 }
      )
    }

    if (error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json(
        {
          error: 'Gemini API quota exceeded. Please check your usage at https://console.cloud.google.com/apis/dashboard',
          details: error?.message
        },
        { status: 429 }
      )
    }

    if (error?.message?.includes('rate limit') || error?.message?.includes('RATE_LIMIT_EXCEEDED')) {
      return NextResponse.json(
        {
          error: 'Rate limited by Gemini API. Please wait before retrying.',
          details: error?.message
        },
        { status: 429 }
      )
    }

    if (error?.message?.includes('model') || error?.message?.includes('NOT_FOUND')) {
      return NextResponse.json(
        {
          error: 'Model gemini-2.5-flash not available. Please check your API configuration.'
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to classify image',
        details: error?.message
      },
      { status: 500 }
    )
  }
}
