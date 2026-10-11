import { createClient } from '@/lib/supabase/server'
import { CallBanner } from './CallBanner'
import { connection } from 'next/server'

export async function AppCallBanner() {
  await connection() // Opt-out of static prerendering for this component
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  return <CallBanner currentUserId={user.id} />
}
