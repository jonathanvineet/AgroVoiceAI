import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { AccountsTab } from '@/components/Form/auth-tab'
import { Spotlight } from '@/components/ui/spotlight'
import SessionPageContainer from '@/components/Miscellaneous/no-session-page-container'

export default async function SignInPage() {
  const supabase = await createServerSupabaseClient()
  
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/options')
  }

  return <SessionPageContainer component={<AccountsTab />} />
}
