// app/book/[tradie_id]/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export default async function BookTradie({ params }: { params: { tradie_id: string } }) {
  const supabase = createServerComponentClient({ cookies })
  const { data: tradie } = await supabase
    .from('tradies')
    .select('name')
    .eq('id', params.tradie_id)
    .single()

  return (
    <form action={`/book/${params.tradie_id}/submit`} method="POST">
      <h1>Request Booking with {tradie.name}</h1>
      <textarea name="details" placeholder="Job details..." required />
      <button type="submit">Send Request</button>
    </form>
  )
}
