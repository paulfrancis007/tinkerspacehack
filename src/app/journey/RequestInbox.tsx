'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { respondConnection } from './consentActions'
import { Button } from '@/components/ui/Button'
import { Check, X } from 'lucide-react'

export function RequestInbox({ currentUserId, journeyId }: { currentUserId: string, journeyId: string }) {
  const [requests, setRequests] = React.useState<Record<string, unknown>[]>([])
  const supabase = createClient()

  const fetchRequests = React.useCallback(async () => {
    // We fetch conversations where we are user_a or user_b, status is pending, and requested_by != us.
    const { data } = await supabase
      .from('conversations')
      .select('*, profiles:requested_by (id, display_name, avatar_seed)')
      .eq('journey_id', journeyId)
      .eq('status', 'pending')
      .neq('requested_by', currentUserId)
      
    // Wait, the RPC is "respond_connection(conversation_id, accept)". We need the ID.
    // Also, due to RLS, pair_conversations allows us to see them if we are in it.
    if (data) {
      setRequests(data)
    }
  }, [journeyId, currentUserId, supabase])

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRequests()

    const channel = supabase.channel('conversations-inbox')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `journey_id=eq.${journeyId}` },
        () => { fetchRequests() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchRequests, journeyId, supabase])

  const handleRespond = async (id: string, accept: boolean) => {
    await respondConnection(id, accept)
    fetchRequests()
  }

  if (requests.length === 0) return null

  return (
    <div className="bg-panel rounded-3xl p-6 mb-8 border border-primary/20">
      <h3 className="font-bold mb-4 text-primary">Connection Requests ({requests.length})</h3>
      <div className="space-y-3">
        {requests.map(req => (
          <div key={req.id as string} className="flex justify-between items-center bg-background p-3 rounded-2xl">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full flex items-center justify-center text-background font-bold text-lg bg-accent">
                {(req.profiles as any).display_name.charAt(0).toUpperCase()}
               </div>
               <div>
                 <p className="font-bold text-sm">{(req.profiles as any).display_name}</p>
                 <p className="text-xs text-foreground/50">Wants to connect</p>
               </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => handleRespond(req.id as string, false)} className="min-w-[44px] px-2 text-destructive">
                <X size={16} />
              </Button>
              <Button onClick={() => handleRespond(req.id as string, true)} className="min-w-[44px] px-2">
                <Check size={16} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
