import { GoogleGenAI } from '@google/genai'

import { auth } from '@/lib/auth'
import { getChatbotPreference } from '@/app/actions'
import { offlineAnswer } from '@/lib/offline-agri'

const client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || '' })

const userRequestQueues: { [key: string]: number[] } = {}

const SYSTEM = `You are AgroVoiceAI, an agricultural assistant. The user has just received a crop recommendation from a soil test (NPK, pH, moisture, temperature). Explain how to grow the recommended crop: season, land preparation, seed rate, fertilizer schedule, irrigation, common pests and expected yield. Be concise and practical. Reply in the user's language (English or Tamil).`

export async function POST(req: Request) {
  const { messages } = await req.json()
  const userId = (await auth())?.user.id
  if (!userId) return new Response('Unauthorized', { status: 401 })

  const now = Date.now()
  userRequestQueues[userId] = (userRequestQueues[userId] || []).filter(t => now - t < 60000)
  if (userRequestQueues[userId].length >= 10) {
    return new Response('Too Many Requests', { status: 429 })
  }
  userRequestQueues[userId].push(now)

  const preferences = await getChatbotPreference()
  const lastQuestion = messages[messages.length - 1]?.content || ''
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let sent = false
      try {
        if (!process.env.GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY not set')
        const response = await client.models.generateContentStream({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: preferences
              ? `${SYSTEM}\nOptional context about the farmer: ${preferences}`
              : SYSTEM
          },
          contents: messages.map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          }))
        })
        for await (const chunk of response) {
          if (chunk.text) {
            sent = true
            controller.enqueue(encoder.encode(chunk.text))
          }
        }
      } catch (error: any) {
        console.warn('[soil-test-chat] Gemini unavailable, using offline assistant:', error?.message)
        if (!sent) controller.enqueue(encoder.encode(offlineAnswer(lastQuestion)))
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
