import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { AccountsTab } from '@/components/Form/auth-tab'
import { Spotlight } from '@/components/ui/spotlight'
import SessionPageContainer from '@/components/Miscellaneous/no-session-page-container'

export default async function SignInPage() {
  const supabase = await createServerSupabaseClient()
  
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (user) {
      redirect('/options')
    }
  } catch (error) {
    // Expected error when no session exists
    // User will see the sign-in form
  }

  return <SessionPageContainer component={<AccountsTab />} />
}
