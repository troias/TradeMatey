// app/search/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Link from 'next/link'

export default async function SearchPage() {
  const supabase = createServerComponentClient({ cookies })

  const { data: tradies } = await supabase
    .from('tradies')
    .select('id, name, trade, location, bio')

  return (
    <div>
      <h1>Find a Tradie</h1>
      <ul>
        {tradies?.map((tradie) => (
          <li key={tradie.id}>
            <h3>{tradie.name}</h3>
            <p>{tradie.trade} — {tradie.location}</p>
            <p>{tradie.bio}</p>
            <Link href={`/book/${tradie.id}`}>Request Booking</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
