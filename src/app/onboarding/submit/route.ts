// app/onboarding/submit/route.ts (Server Action or Route Handler)
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const formData = await req.formData()
  const role = formData.get('role')

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  await supabase.from('profiles').insert({
    id: user.id,
    role,
    created_at: new Date().toISOString()
  })

  if (role === 'tradie') {
    redirect('/setup/tradie')
  } else {
    redirect('/dashboard')
  }
}
