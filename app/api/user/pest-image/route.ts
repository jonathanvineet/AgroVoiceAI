import { profileFieldRoute } from '@/lib/profile-route'

export const POST = profileFieldRoute('imageURL', 'pest_image', { revalidate: true })
