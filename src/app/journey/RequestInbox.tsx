'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { respondConnection } from './consentActions'
import { Button } from '@/components/ui/Button'
import { Check, X, Gamepad2, UserPlus, Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function RequestInbox({ currentUserId, journeyId }: { currentUserId: string, journeyId: string }) {
  const [requests, setRequests] = React.useState<Record<string, unknown>[]>([])
  const supabase = createClient()

  const fetchRequests = React.useCallback(async () => {
    const { data } = await supabase.rpc('get_notifications', { p_journey_id: journeyId })
    if (data) {
      setRequests(data)
    }
  }, [journeyId, supabase])

  React.useEffect(() => {
    fetchRequests()

    const channel = supabase.channel(`notifications-${journeyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `journey_id=eq.${journeyId}` }, () => { fetchRequests() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => { fetchRequests() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchRequests, journeyId, supabase])

  const handleRespondConn = async (id: string, accept: boolean) => {
    await respondConnection(id, accept)
    fetchRequests()
  }

  const handleRespondGame = async (gameId: string, accept: boolean) => {
    await supabase.rpc('respond_game', { p_game_id: gameId, p_accept: accept })
    fetchRequests()
  }

  if (requests.length === 0) return null

  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-panel rounded-3xl p-6 mb-8 border-2 border-primary/40 shadow-lg shadow-primary/10">
      <h3 className="font-bold mb-4 text-primary"><span className="flex items-center gap-2"><Bell size={18} className="text-primary animate-bounce" /> Notification Board</span> ({requests.length})</h3>
      <div className="space-y-3">
        <AnimatePresence>
        {requests.map(req => {
          const isConn = req.type === 'connection'
          
          return (
            <motion.div key={req.id as string} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }} className="flex justify-between items-center bg-background p-3 rounded-2xl border border-foreground/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-background font-bold text-lg bg-accent relative">
                  {(req.alias as string).charAt(0).toUpperCase()}
                  <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                    {isConn ? <UserPlus size={12} className="text-primary" /> : <Gamepad2 size={12} className="text-accent" />}
                  </div>
                </div>
                <div>
                  <p className="font-bold text-sm">{(req.alias as string)}</p>
                  <p className="text-xs text-foreground/70">
                    {isConn ? 'Wants to connect' : 'Invited you to Window Seat XO'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => isConn ? handleRespondConn(req.id as string, false) : handleRespondGame(req.id as string, false)} className="min-w-[44px] px-2 text-destructive">
                  <X size={16} />
                </Button>
                <Button onClick={() => isConn ? handleRespondConn(req.id as string, true) : handleRespondGame(req.id as string, true)} className="min-w-[44px] px-2">
                  <Check size={16} />
                </Button>
              </div>
            </motion.div>
          )
        })}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

