'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'
import { type Chat } from '@/lib/types'
import { createAdminSupabaseClient } from '@/lib/supabase-server'
import { getBackend } from '@/lib/backend'
import { clearSessionCookie, deleteLocalUser } from '@/lib/local-auth'
import { deleteProfile, getProfile, updateProfile } from '@/lib/data'
import redis from '@/lib/redis'

export async function getChats(userId?: string | null) {
  if (!userId) {
    return []
  }

  try {
    const chats: string[] = await redis.zrange(`user:chat:${userId}`, 0, -1, {
      rev: true
    })
    const results = await Promise.all(chats.map(chat => redis.hgetall<Chat>(chat)))
    return results.filter(Boolean) as Chat[]
  } catch (error) {
    return []
  }
}

export async function getUser() {
  const session = await auth()

  return session?.user
}

export async function updatePageShown(userId?: string) {
  // Always trust the session, never the client-supplied id.
  const id = await getUserId()
  if (!id || (userId && userId !== id)) return
  const { error } = await updateProfile(id, { page_shown: true })
  if (error) {
    console.error('Error updating pageShown:', error)
  }
}

export async function getLocation() {
  const user = await getCurrentUser()
  return user ? [{ user_district: user.user_district }] : []
}

export async function getCurrentUser() {
  const id = await getUserId()
  if (!id) return null

  const profile = await getProfile(id)
  if (!profile) {
    console.log('Profile not found for user:', id, '- returning null')
    return null
  }
  return profile
}

export async function getUserId() {
  const session = await auth()

  return session?.user?.id
}

export async function getChatbotPreference() {
  const user = await getCurrentUser()

  return user?.chatbot_preference
}

export async function removeImage() {
  const id = await getUserId()

  if (!id) {
    return {
      error: 'Unauthorized'
    }
  }

  const { error } = await updateProfile(id, { image: null })
  if (error) {
    return {
      error: 'Something went wrong'
    }
  }
  revalidateTag('user')
}

export async function deleteAccount() {
  const id = await getUserId()

  if (!id) {
    return {
      error: 'Unauthorized'
    }
  }
  try {
    // Remove chat history first
    const chats: string[] = await redis.zrange(`user:chat:${id}`, 0, -1)
    for (const chat of chats) {
      await redis.del(chat)
    }
    await redis.del(`user:chat:${id}`)

    await deleteProfile(id)

    if (getBackend() === 'local') {
      deleteLocalUser(id)
      clearSessionCookie()
    } else {
      const { error } = await createAdminSupabaseClient().auth.admin.deleteUser(id)
      if (error) {
        console.error('Error deleting auth user:', error.message)
        return { error: 'Something went wrong' }
      }
    }
  } catch (error) {
    return {
      error: 'Something went wrong'
    }
  }
}

export async function getChat(id: string, userId: string) {
  let chat: Chat | null = null

  try {
    chat = await redis.hgetall<Chat>(`chat:${id}`)
  } catch (error) {
    console.warn('[Actions] Failed to load chat:', error)
    return null
  }

  if (!chat || (userId && chat.userId !== userId)) {
    return null
  }

  return chat
}

export async function removeChat({ id, path }: { id: string; path: string }) {
  const session = await auth()

  if (!session) {
    return {
      error: 'Unauthorized'
    }
  }

  const uid = String(await redis.hget(`chat:${id}`, 'userId'))

  if (uid !== session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  await redis.del(`chat:${id}`)
  await redis.zrem(`user:chat:${session.user.id}`, `chat:${id}`)

  revalidatePath('/chat/c/[id]')
  return revalidatePath(path || '/chat')
}

export async function clearChats() {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  const chats: string[] = await redis.zrange(
    `user:chat:${session.user.id}`,
    0,
    -1
  )
  if (!chats.length) {
    return redirect('/chat')
  }

  for (const chat of chats) {
    await redis.del(chat)
    await redis.zrem(`user:chat:${session.user.id}`, chat)
  }

  revalidatePath('/chat/c/[id]')
  return redirect('/chat')
}

export async function getSharedChat(id: string) {
  let chat: Chat | null = null

  try {
    chat = await redis.hgetall<Chat>(`chat:${id}`)
  } catch (error) {
    console.warn('[Actions] Failed to load shared chat:', error)
    return null
  }

  if (!chat || !chat.sharePath) {
    return null
  }

  return chat
}

export async function shareChat(id: string) {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  const chat = await redis.hgetall<Chat>(`chat:${id}`)

  if (!chat || chat.userId !== session.user.id) {
    return {
      error: 'Something went wrong'
    }
  }

  const payload = {
    ...chat,
    sharePath: `/share/${chat.id}`
  }

  await redis.hmset(`chat:${chat.id}`, payload)

  return payload
}
