// app/onboarding/page.tsx (Server Component)
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function Onboarding() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single()

  if (profile) redirect('/dashboard')

  return (
    <form action="/onboarding/submit" method="POST">
      <label>Select your role:</label><br />
      <button name="role" value="tradie">Tradie</button>
      <button name="role" value="client">Client</button>
    </form>
  )
}
