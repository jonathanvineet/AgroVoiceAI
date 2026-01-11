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

        controller.close()
      } catch (error) {
        console.error('[Chat] Error:', error)
        controller.error(error)
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  })
}
