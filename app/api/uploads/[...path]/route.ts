import { readUpload } from '@/lib/local-store'

const TYPES: Record<string, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  webp: 'image/webp'
}

/** Serves images saved by the local backend (see storeUpload in lib/data.ts). */
export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
  const rel = params.path.join('/')
  if (rel.includes('..')) return new Response('Bad path', { status: 400 })
  const data = readUpload(rel)
  if (!data) return new Response('Not found', { status: 404 })
  const ext = rel.split('.').pop()?.toLowerCase() || ''
  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  })
}
