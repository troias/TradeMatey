// app/book/[tradie_id]/submit/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function POST(req: Request, { params }: { params: { tradie_id: string } }) {
  const supabase = createRouteHandlerClient({ cookies })
  const formData = await req.formData()
  const details = formData.get('details')

  const { data: { user } } = await supabase.auth.getUser()

  await supabase.from('booking_requests').insert({
    client_id: user.id,
    tradie_id: params.tradie_id,
    details,
    status: 'pending'
  })

  redirect('/dashboard')
}
