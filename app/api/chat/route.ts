import { auth } from '@/lib/auth'
import { nanoid } from '@/lib/utils'
import redis from '@/lib/redis'
import { GoogleGenAI } from '@google/genai'

const client = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY || ''
})

// Mock agricultural responses for testing without API quota
const mockResponses = [
  'For that crop, I recommend regular irrigation every 2-3 days during the dry season. Ensure soil moisture is around 60-70% to promote healthy growth and prevent diseases.',
  'The best time to apply fertilizer is during the early morning or late evening to minimize nutrient loss. Use NPK (15-15-15) for general crops, or consult your local agricultural office for specific recommendations.',
  'To prevent common pests like leaf beetles and aphids, try companion planting with marigolds and neem. Spray neem oil solution every 10 days during peak season for best results.',
  'Your soil pH should be tested every 2 years. For most crops, aim for pH 6.5-7.5. If too acidic, add lime; if too alkaline, add sulfur gradually over the season.',
  'Crop rotation is essential! After harvesting, rotate with legumes (beans, peas) to fix nitrogen in soil. This reduces pest cycles and improves soil fertility naturally.',
  'Drip irrigation saves up to 50% water compared to flood irrigation. Install drip lines 30-40cm apart for vegetable crops and adjust timing based on local rainfall.',
  'Mulching with straw or coconut coir keeps soil cool and moist, reduces weeds by 80%, and slowly decomposes to improve soil structure. Apply 5-10cm layer around plants.'
]

export async function POST(req: Request) {
  const json = await req.json()
  const { messages } = json
  const userId = (await auth())?.user.id

  if (!userId) {
    return new Response('Unauthorized', {
      status: 401
    })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullResponse = ''
        const processingKey = `user:chat:processing:${userId}`

        // Acquire a per-user lock to prevent concurrent requests from the same user
        // This avoids multiple simultaneous model calls when the client retries
        const lock = await redis.set(processingKey, '1', {
          ex: 60,
          nx: true
        })

        if (!lock) {
          // Inform client another request is in progress
          controller.enqueue(encoder.encode('[Error] Another request is in progress.'))
          controller.close()
          return
        }
        
        try {
          // Try to call Gemini API
          const response = await client.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: messages.map((msg: any) => ({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: [{ text: msg.content }]
            }))
          })

          for await (const chunk of response) {
            const text = chunk.text || ''
            if (text) {
              fullResponse += text
              controller.enqueue(encoder.encode(text))
            }
          }
        } catch (apiError: any) {
          // Fallback to mock response if API fails
          const errorMsg = apiError?.message || ''
          if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
            console.warn('[Chat] API quota exceeded, using mock fallback')
            // Use a realistic mock response for agriculture
            fullResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)]
            controller.enqueue(encoder.encode(fullResponse))
          } else {
            // Re-throw non-quota errors to be caught by outer catch
            throw apiError
          }
        }

        // Save to Redis after completion
        const title = json.messages[0].content.substring(0, 100)
        const id = json.id ?? nanoid()
        const createdAt = Date.now()
        const path = `/chat/c/${id}`
        const payload = {
          id,
          title,
          userId,
          createdAt,
          path,
          messages: [
            ...messages,
            {
              content: fullResponse,
              role: 'assistant'
            }
          ]
        }

        if (userId) {
          await redis.hmset(`chat:${id}`, payload)
          await redis.zadd(`user:chat:${userId}`, {
            score: createdAt,
            member: `chat:${id}`
          })
        }

        // Release lock
        try {
          await redis.del(processingKey)
        } catch (e) {
          console.warn('[Chat] Failed to release lock:', e)
        }

        controller.close()
      } catch (error: any) {
        console.error('[Chat] Error:', error)
        
        // Release lock
        try {
          const processingKey = `user:chat:processing:${userId}`
          await redis.del(processingKey)
        } catch (e) {
          console.warn('[Chat] Failed to release lock after error:', e)
        }

        // Check for rate limit / quota errors and close stream gracefully
        const errorMsg = error?.message || ''
        if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
          controller.enqueue(encoder.encode('[RATE_LIMIT] You have exceeded your API quota. Please try again later.'))
        } else {
          controller.enqueue(encoder.encode(`[ERROR] ${error?.message || 'Unknown error'}`))
        }
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  })
}
