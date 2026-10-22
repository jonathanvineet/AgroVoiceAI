/** Uploads an image through the server (Supabase Storage or local disk) and returns its URL. */
export async function uploadImage(file: Blob, bucket: 'avatars' | 'pests' = 'avatars') {
  const formData = new FormData()
  formData.append('image', file, (file as File).name || 'image.jpeg')
  formData.append('bucket', bucket)
  const res = await fetch('/api/upload-image', { method: 'POST', body: formData })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Upload failed')
  const { url } = await res.json()
  return url as string
}
