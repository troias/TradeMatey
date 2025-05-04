// app/setup/tradie/submit/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const formData = await req.formData()

  const { data: { user } } = await supabase.auth.getUser()

  await supabase.from('tradies').insert({
    user_id: user.id,
    name: formData.get('name'),
    trade: formData.get('trade'),
    location: formData.get('location'),
    bio: formData.get('bio')
  })

  redirect('/dashboard')
}
