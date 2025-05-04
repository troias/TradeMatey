// app/auth/callback/page.tsx

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/ssr'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }

      // You might want to fetch user profile to decide where to send them
      const { data: tradie } = await supabase
        .from('tradies')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!tradie && !client) {
        router.push('/onboarding')
      } else {
        router.push('/')
      }
    })
  }, [])

  return <p>Redirecting...</p>
}
