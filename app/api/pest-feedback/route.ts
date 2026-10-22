import { auth } from '@/lib/auth'
import { listPestFeedback, savePestFeedback } from '@/lib/data'
import { NextRequest, NextResponse } from 'next/server'

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 2000) : null)

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  if (!['correct', 'incorrect'].includes(body.correctness)) {
    return NextResponse.json({ error: 'correctness must be correct or incorrect' }, { status: 400 })
  }
  await savePestFeedback({
    user_id: session.user.id,
    pest_image: str(body.pestImage),
    model_answer: str(body.modelAnswer),
    user_answer: str(body.userAnswer),
    confidence: str(body.confidence),
    correctness: body.correctness,
    feedback: str(body.feedback),
    created_at: new Date().toISOString()
  })
  return NextResponse.json({ success: true })
}

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const all = await listPestFeedback()
  return NextResponse.json({ data: all.filter(f => f.user_id === session.user.id) })
}
