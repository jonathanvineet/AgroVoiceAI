import { handleImageUpload } from '@/lib/upload-route'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  return handleImageUpload(request, 'pests')
}
