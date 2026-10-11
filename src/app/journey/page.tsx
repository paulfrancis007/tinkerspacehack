import { createClient } from '@/lib/supabase/server'
import { connection } from 'next/server'
import { JoinForm } from './JoinForm'
import { LoungeClient } from './LoungeClient'

export const instant = false

export default async function JourneyPage() {
  await connection()
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


  if (!membership || !membership.journeys) {
    if (membership && !membership.journeys) {
      // Auto-fix the stuck membership state by setting left_at
      await supabase.from('memberships').update({ left_at: new Date().toISOString() }).eq('id', membership.id);
    }
    return (
      <div className="max-w-xl mx-auto py-12">
        <h1 className="text-3xl font-bold mb-8">Find or Create Journey</h1>
        {membership && !membership.journeys && (
           <p className="text-destructive mb-4 p-4 bg-destructive/10 rounded-xl">Your previous journey expired. You can now join a new one!</p>
        )}
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

