'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { leaveJourney, updateMembership } from './actions'
import { Button } from '@/components/ui/Button'
import { TicketCard } from '@/components/ui/TicketCard'
import { PassengerSheet } from './PassengerSheet'
import { motion } from 'framer-motion'
import { RequestInbox } from './RequestInbox'
import { LogOut } from 'lucide-react'
import { ChatInterface } from './ChatInterface'

function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Minimal types for the demo
type MembershipRecord = Record<string, unknown>;

export function LoungeClient({ initialMembership, journey, currentUserId }: { initialMembership: MembershipRecord, journey: Record<string, unknown>, currentUserId: string }) {
  const [members, setMembers] = React.useState<MembershipRecord[]>([initialMembership])
  const [discoverable, setDiscoverable] = React.useState(Boolean(initialMembership.discoverable))
    const [socialMode, setSocialMode] = React.useState(initialMembership.social_mode as string)
  const [isPending, setIsPending] = React.useState(false)
  const [hasConsent, setHasConsent] = React.useState(Boolean(initialMembership.lounge_consent))
  const [currentTime, setCurrentTime] = React.useState<number>(0)
  const [selectedPassenger, setSelectedPassenger] = React.useState<MembershipRecord | null>(null)
  const supabase = createClient()

  const fetchMembers = React.useCallback(async () => {
    const { data } = await supabase
      .from('memberships')
      .select('*')
      .eq('journey_id', journey.id)
      .is('left_at', null)
    
    if (data) {
      setMembers(data as MembershipRecord[])
    }
  }, [journey.id, supabase])

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    // setCurrentTime(Date.now())
    
    // Initial fetch to get everyone currently visible
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMembers()

    // Subscribe to changes
    const channel = supabase.channel('lounge-members')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'memberships', filter: `journey_id=eq.${journey.id}` },
        () => {
          fetchMembers()
        }
      )
      .subscribe()

    // 15s reconciliation
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchMembers()
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentTime(Date.now())
    }, 15000)

    // 30s heartbeat
    const heartbeat = setInterval(() => {
      if (document.visibilityState === 'visible') {
        supabase.rpc('heartbeat', { p_journey_id: journey.id as string })
      }
    }, 30000)

    const handleFocus = () => fetchMembers()
    window.addEventListener('focus', handleFocus)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
      clearInterval(heartbeat)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchMembers, journey.id, supabase])

  const handleToggleDiscovery = async () => {
    setIsPending(true)
    const nextState = !discoverable
    setDiscoverable(nextState)
    await updateMembership(journey.id as string, nextState, hasConsent, socialMode)
    setIsPending(false)
  }

  const handleSocialMode = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newMode = e.target.value;
      setSocialMode(newMode);
      await updateMembership(journey.id as string, discoverable, hasConsent, newMode);
    }

    const handleGrantConsent = async () => {
    setIsPending(true)
    setHasConsent(true)
    await updateMembership(journey.id as string, discoverable, true, socialMode)
    setIsPending(false)
  }

  const handleLeave = async () => {
    setIsPending(true)
    await leaveJourney(journey.id as string)
  }

  const visibleMembers = members.filter(m => m.user_id === currentUserId || m.discoverable)

  return (
    <div className="flex flex-col min-h-[80vh]">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Lounge: {journey.operator_code as string} {journey.service_number as string}</h1>
          <p className="text-foreground/50">{journey.origin_code as string} → {journey.destination_code as string}</p>
        </div>
        <Button variant="ghost" onClick={handleLeave} disabled={isPending} className="text-destructive hover:bg-destructive/10">
          <LogOut size={20} className="mr-2" /> Leave
        </Button>
      </header>

      <div className="bg-panel rounded-3xl p-6 mb-8 flex justify-between items-center">
        <div>
          <h3 className="font-bold">Discovery Mode</h3>
          <p className="text-sm text-foreground/70">
            {discoverable ? 'You are visible to others in this journey.' : 'You are hidden from others.'}
          </p>
        </div>
        <Button 
          variant={discoverable ? 'secondary' : 'primary'} 
          onClick={handleToggleDiscovery}
          disabled={isPending}
        >
          {discoverable ? 'Go Dark' : 'Become Visible'}
        </Button>
      </div>

      <div className="bg-panel rounded-3xl p-6 mb-8 flex justify-between items-center">
        <div>
          <h3 className="font-bold">Social Mode</h3>
          <p className="text-sm text-foreground/70">
            Set your interaction preference.
          </p>
        </div>
        <select value={socialMode} onChange={handleSocialMode} disabled={isPending} className="bg-background border border-foreground/10 rounded-xl p-2 text-sm text-foreground">
          <option value="quiet">Quiet (No Invites)</option>
          <option value="chat">Chat</option>
          <option value="game">Game</option>
        </select>
      </div>

      <RequestInbox currentUserId={currentUserId} journeyId={journey.id as string} />

      <div className="mb-4 text-xs text-foreground/50 uppercase tracking-widest font-bold">
        Self-Reported Passenger Constellation
      </div>
      
      {/* Constellation Visualization */}
      <div className="relative bg-background rounded-3xl h-64 overflow-hidden mb-8 border border-foreground/10 flex items-center justify-center">
        {visibleMembers.map((m) => {
          const hash = hashString(m.user_id as string)
          const top = 10 + (hash % 80) + '%'
          const left = 10 + ((hash >> 8) % 80) + '%'
          const isMe = m.user_id === currentUserId
          const alias = m.alias as string
          
          return (
            <div 
              key={m.user_id as string}
              className={`absolute flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ${isMe ? 'z-10' : 'z-0'}`}
              style={{ top, left }}
              title={alias}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-background font-bold text-lg shadow-lg ${isMe ? 'bg-primary' : 'bg-accent opacity-80'}`}>
                {alias.charAt(0).toUpperCase()}
              </div>
              {isMe && <span className="text-[10px] mt-1 font-bold text-primary bg-background/80 px-2 rounded-full">YOU</span>}
            </div>
          )
        })}
      </div>

      {/* Accessible List */}
      <div className="space-y-4">
        <h3 className="font-bold">Visible Passengers ({visibleMembers.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleMembers.map((m) => {
            const isMe = m.user_id === currentUserId
            const isActive = currentTime > 0 && new Date(m.last_seen_at as string).getTime() > currentTime - 90000
            const alias = m.alias as string
            
            return (
              <div key={m.user_id as string} onClick={() => setSelectedPassenger(m)} className="cursor-pointer"><TicketCard className="opacity-90 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-background font-bold text-xl ${isMe ? 'bg-primary' : 'bg-accent'}`}>
                    {alias.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold">{alias} {isMe && '(You)'}</div>
                    <div className="text-xs opacity-60">
                      {isActive ? 'Recently active' : 'Away'} • {m.social_mode as string}
                    </div>
                  </div>
                </div>
              </TicketCard></div>
            )
          })}
        </div>
      </div>

      <div className="mt-8">
        <ChatInterface journeyId={journey.id as string} currentUserId={currentUserId} hasConsent={hasConsent} onGrantConsent={handleGrantConsent} />
      </div>

      <PassengerSheet isOpen={!!selectedPassenger} onClose={() => setSelectedPassenger(null)} passenger={selectedPassenger} currentUserId={currentUserId} />
    </div>
  )
}




