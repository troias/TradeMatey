// app/dashboard/client/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Link from 'next/link'

export default async function ClientDashboard() {
  const supabase = createServerComponentClient({ cookies })

  const { data: { user } } = await supabase.auth.getUser()

  const { data: requests } = await supabase
    .from('booking_requests')
    .select('id, tradie_id, details, status')
    .eq('client_id', user?.id)

  return (
    <div>
      <h1>Client Dashboard</h1>
      <Link href="/search">🔍 Search Tradies</Link>

      <h2>Your Requests</h2>
      <ul>
        {requests?.map((req) => (
          <li key={req.id}>
            To Tradie ID {req.tradie_id} — {req.details} ({req.status})
          </li>
        ))}
      </ul>
    </div>
  )
}
