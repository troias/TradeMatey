// app/setup/tradie/page.tsx (Server Component)
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export default async function TradieSetup() {
  return (
    <form action="/setup/tradie/submit" method="POST">
      <input name="name" placeholder="Name" />
      <input name="trade" placeholder="Trade" />
      <input name="location" placeholder="Location" />
      <textarea name="bio" placeholder="Bio" />
      <button type="submit">Save</button>
    </form>
  )
}
