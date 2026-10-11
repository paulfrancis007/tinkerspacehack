import { createClient } from '@/lib/supabase/server'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { signout } from '../login/actions'
import { Button } from '@/components/ui/Button'
import { TicketCard } from '@/components/ui/TicketCard'
import { LogOut } from 'lucide-react'

export const instant = false

export default async function DashboardPage() {
  await connection()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch the private profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/onboarding')
  }

  // Fetch my connections (friends)
  const { data: friends } = await supabase.rpc('get_my_friends')
  const friendsList = friends || []

  // Fetch journeys the user is part of
  const { data: journeys } = await supabase
    .from('journeys')
    .select('*, memberships!inner(user_id, left_at)')
    .eq('memberships.user_id', user.id)
    .is('memberships.left_at', null)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <form action={signout}>
          <Button variant="secondary" type="submit" className="gap-2">
            <LogOut size={16} />
            Sign Out
          </Button>
        </form>
      </div>

      <TicketCard className="mt-8">
        <div className="flex items-center gap-6 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-background flex items-center justify-center text-primary overflow-hidden">
            <div className="w-full h-full bg-gradient-to-br from-primary to-accent opacity-50 flex items-center justify-center font-bold text-2xl text-background">
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black">{profile.display_name}</h2>
            <p className="text-background/70 font-mono text-sm">Seed: {profile.avatar_seed}</p>
          </div>
        </div>
        
        <div className="space-y-4 border-t border-background/20 pt-4">
          {profile.bio && (
            <div>
              <div className="text-xs opacity-60 uppercase mb-1">Bio</div>
              <div>{profile.bio}</div>
            </div>
          )}
          
          {profile.interests && profile.interests.length > 0 && (
            <div>
              <div className="text-xs opacity-60 uppercase mb-2">Interests</div>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest: string) => (
                  <span key={interest} className="px-3 py-1 rounded-full bg-background/20 text-xs font-medium">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </TicketCard>

      <div className="bg-panel rounded-3xl p-6 border border-primary/20">
        <h2 className="text-xl font-bold mb-4">My Connections (Friends)</h2>
        {friendsList.length === 0 ? (
          <p className="text-foreground/70">You haven't made any connections yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {friendsList.map((f: any) => (
              <div key={f.conversation_id} className="flex items-center gap-3 bg-background p-3 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center font-bold text-background text-lg">
                  {f.alias.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold">{f.alias}</p>
                  <p className="text-xs text-foreground/50">Connected {new Date(f.connected_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Recent Journeys</h2>
        {!journeys || journeys.length === 0 ? (
          <p className="text-foreground/70">You haven't joined any journeys yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {journeys.map((journey: any) => (
              <TicketCard key={journey.id} className="cursor-pointer hover:-translate-y-1 transition-transform" >
                <div className="text-xs opacity-50 mb-1">{new Date(journey.service_date).toLocaleDateString()}</div>
                <div className="font-bold text-lg mb-2">{journey.operator_code} {journey.service_number}</div>
                <div className="flex justify-between items-center text-sm">
                  <span>{journey.origin_code}</span>
                  <div className="flex-1 h-px bg-background/30 mx-4" />
                  <span>{journey.destination_code}</span>
                </div>
              </TicketCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


