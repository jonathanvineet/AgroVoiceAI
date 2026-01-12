import { auth } from '@/lib/auth'
import { nanoid } from '@/lib/utils'
import redis from '@/lib/redis'
import { GoogleGenAI } from '@google/genai'

const client = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY || ''
})

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
        
        // Use the same model that works in your classify route
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
