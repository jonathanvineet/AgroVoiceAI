import { profileFieldRoute } from '@/lib/profile-route'

export const POST = profileFieldRoute('imageURL', 'image', { revalidate: true })
