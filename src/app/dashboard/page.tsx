import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signout } from '../login/actions'
import { Button } from '@/components/ui/Button'
import { TicketCard } from '@/components/ui/TicketCard'
import { LogOut } from 'lucide-react'

export default async function DashboardPage() {
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
             {/* Simple visual hash for avatar seed */}
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
    </div>
  )
}

export const instant = false

