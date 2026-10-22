import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AccountsTab } from '@/components/Form/auth-tab'
import SessionPageContainer from '@/components/Miscellaneous/no-session-page-container'

export default async function SignInPage() {
  // redirect() throws, so it must stay outside any try/catch.
  const user = (await auth())?.user
  if (user) {
    redirect('/options')
  }

  return <SessionPageContainer component={<AccountsTab />} />
}
