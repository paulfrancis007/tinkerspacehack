import { createClient } from '@/lib/supabase/server'
import { CallBanner } from './CallBanner'

export async function AppCallBanner() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  return <CallBanner currentUserId={user.id} />
}
