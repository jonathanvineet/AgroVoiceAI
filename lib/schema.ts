import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

export const nameSchema = z.string().min(3).max(50)
// Absolute URL, or a path served by the local upload route.
export const imageURLSchema = z
  .string()
  .refine(v => v.startsWith('/api/uploads/') || z.string().url().safeParse(v).success)
export const ageSchema = z.string().regex(/^(1[89]|[2-9][0-9]|1[01][0-9]|120)$/)
export const phoneNumberSchema = z.string().regex(/^\d{10}$/)
export const inputSchema = z.string()
export const prefSchema = z.string()
export const districtSchema = z.string()
export const emailSchema = z.string().email()

export function validateInput(input: string) {
  let harmfulPattern = /<script>|script|\)|\(|<|>|}|{|!|\+|=|<\/script>/i

  input = DOMPurify.sanitize(input)

  if (harmfulPattern.test(input)) {
    return false
  }

  return true
}
