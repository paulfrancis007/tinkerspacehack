'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from './Button'

export function CallBanner({ currentUserId }: { currentUserId: string }) {
  const [incomingCall, setIncomingCall] = React.useState<Record<string, any> | null>(null)
  const supabase = createClient()

  const fetchRinging = React.useCallback(async () => {
    const { data } = await supabase
      .from('calls')
      .select('*, caller:caller_id(id, display_name)')
      .eq('callee_id', currentUserId)
      .eq('status', 'ringing')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    setIncomingCall(data || null)
  }, [currentUserId, supabase])

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRinging()

    const channel = supabase.channel('incoming-calls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls', filter: `callee_id=eq.${currentUserId}` }, () => {
        fetchRinging()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchRinging, currentUserId, supabase])

  const handleRespond = async (decision: 'accepted' | 'rejected') => {
    if (!incomingCall) return
    await supabase.rpc('respond_call', { 
      p_call_id: incomingCall.id, 
      p_decision: decision,
      p_expected_version: incomingCall.version
    })
    setIncomingCall(null)
  }

  if (!incomingCall) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md bg-panel rounded-2xl shadow-2xl border border-primary/30 p-4 animate-in slide-in-from-top-10">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg">Incoming {incomingCall.kind} call</h3>
          <p className="text-foreground/70">{incomingCall.caller.display_name} is calling...</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => handleRespond('rejected')} className="bg-destructive/10 text-destructive hover:bg-destructive/20">
            Decline
          </Button>
          <Button onClick={() => handleRespond('accepted')} className="bg-accent text-background hover:bg-accent/90">
            Accept
          </Button>
        </div>
      </div>
    </div>
  )
}
