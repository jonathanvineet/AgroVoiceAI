import { profileFieldGet, profileFieldRoute } from '@/lib/profile-route'

export const POST = profileFieldRoute('userName', 'user_name')
export const GET = profileFieldGet('user_name', 'userName')
