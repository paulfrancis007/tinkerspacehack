import { createClient } from '@/lib/supabase/server'
import { JoinForm } from './JoinForm'
import { LoungeClient } from './LoungeClient'

export const instant = false

export default async function JourneyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>Not authenticated</div>
  }

  // Check for active membership
  const { data: membership } = await supabase
    .from('memberships')
    .select('*, journeys(*)')
    .eq('user_id', user.id)
    .is('left_at', null)
    .single()

  if (!membership) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <h1 className="text-3xl font-bold mb-8">Find or Create Journey</h1>
        <JoinForm />
      </div>
    )
  }

  return (
    <LoungeClient 
      initialMembership={membership} 
      journey={membership.journeys}
      currentUserId={user.id}
    />
  )
}
