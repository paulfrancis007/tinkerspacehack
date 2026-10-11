'use client'

import * as React from 'react'
import { Modal } from '@/components/ui/Modal'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { requestConnection, blockUser, reportTarget, requestCall, respondConnection } from './consentActions'
import { createClient } from '@/lib/supabase/client'
import { GameInterface } from './GameInterface'

interface PassengerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  passenger: Record<string, unknown> | null;
  currentUserId: string;
}

export function PassengerSheet({ isOpen, onClose, passenger, currentUserId }: PassengerSheetProps) {
  const [isPending, setIsPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)
  const [conversation, setConversation] = React.useState<Record<string, any> | null>(null)
  const supabase = createClient()
  
  const fetchConversation = React.useCallback(async () => {
    if (!passenger) return
    const uA = currentUserId < (passenger.user_id as string) ? currentUserId : passenger.user_id;
    const uB = currentUserId < (passenger.user_id as string) ? passenger.user_id : currentUserId;
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('journey_id', passenger.journey_id)
      .eq('user_a', uA)
      .eq('user_b', uB)
      .single();
    
    setConversation(data || null)
  }, [passenger, currentUserId, supabase])

  // Reset states on open
  React.useEffect(() => {
    if (isOpen) {
      setError(null)
      setSuccessMsg(null)
      fetchConversation()
    }
  }, [isOpen, fetchConversation])

  if (!passenger) return null

  const isMe = passenger.user_id === currentUserId
  const alias = passenger.alias as string
  const bio = passenger.bio as string
  const interests = passenger.interests as string[]

  const handleRequest = async () => {
    setIsPending(true)
    setError(null)
    const result = await requestConnection(passenger.user_id as string)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccessMsg('Request sent successfully.')
      fetchConversation() // Refresh conversation status immediately
    }
    setIsPending(false)
  }

    const handleRespond = async (accept: boolean) => {
    if (!conversation) return;
    setIsPending(true);
    const result = await respondConnection(conversation.id, accept);
    if (result.error) setError(result.error);
    else {
      setSuccessMsg(accept ? "Connection accepted." : "Connection declined.");
      fetchConversation();
    }
    setIsPending(false);
  }

  const handleBlock = async () => {
    if (!confirm('Are you sure you want to block this user?')) return
    setIsPending(true)
    const result = await blockUser(passenger.user_id as string)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccessMsg('User blocked.')
      fetchConversation()
    }
    setIsPending(false)
  }

  const handleCall = async (kind: string) => {
    if (!conversation) return;
    setIsPending(true);
    const result = await requestCall(conversation.id, kind);
    if (result.error) setError(result.error);
    else setSuccessMsg('Call ringing...');
    setIsPending(false);
  }

  const handleReport = async () => {
    const reason = prompt('Reason for reporting (max 500 chars):')
    if (!reason) return
    setIsPending(true)
    const result = await reportTarget('user', passenger.user_id as string, reason)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccessMsg('Report submitted privately.')
    }
    setIsPending(false)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isMe ? 'Your Profile' : 'Passenger'}>
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-background font-bold text-2xl bg-accent">
            {alias.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold">{alias} {isMe && '(You)'}</h2>
            <p className="text-foreground/70">{passenger.social_mode as string}</p>
          </div>
        </div>

        {bio && (
          <div>
            <h4 className="text-xs uppercase font-bold text-foreground/50 mb-1">Bio</h4>
            <p>{bio}</p>
          </div>
        )}

        {interests && interests.length > 0 && (
          <div>
            <h4 className="text-xs uppercase font-bold text-foreground/50 mb-1">Interests</h4>
            <div className="flex flex-wrap gap-2">
              {interests.map(i => (
                <span key={i} className="px-3 py-1 bg-background rounded-full text-xs font-medium">
                  {i}
                </span>
              ))}
            </div>
          </div>
        )}

        {error && <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-lg">{error}</div>}
        {successMsg && <div className="text-primary text-sm bg-primary/10 p-3 rounded-lg">{successMsg}</div>}

        {!isMe && (
          <div className="grid grid-cols-1 gap-3 mt-4 pt-4 border-t border-foreground/10">
            
            {(!conversation || conversation.status === 'declined' || conversation.status === 'revoked') && (
              <Button onClick={handleRequest} disabled={isPending}>
                Request Connection
              </Button>
            )}
            
            {conversation?.status === 'pending' && conversation.requested_by === currentUserId && (
              <Button disabled variant="secondary" className="opacity-50">Request Pending...</Button>
            )}

            {conversation?.status === 'pending' && conversation.requested_by !== currentUserId && (
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1 text-destructive" onClick={() => handleRespond(false)} disabled={isPending}>Decline</Button>
                <Button className="flex-1" onClick={() => handleRespond(true)} disabled={isPending}>Accept Request</Button>
              </div>
            )}

            {conversation?.status === 'accepted' && (
              <div className="flex gap-2">
                <Button onClick={() => handleCall('audio')} disabled={isPending} className="flex-1 bg-primary text-background">Audio Call</Button>
                <Button onClick={() => handleCall('video')} disabled={isPending} className="flex-1 bg-primary text-background">Video Call</Button>
              </div>
            )}

            <Button variant="secondary" onClick={handleBlock} disabled={isPending}>
              Block User
            </Button>
            
            <Button variant="ghost" className="text-destructive" onClick={handleReport} disabled={isPending}>
              Report User
            </Button>
          </div>
        )}
        
        {conversation?.status === 'accepted' && !isMe && (
          <div className="mt-6 border-t border-foreground/10 pt-6">
            <GameInterface conversationId={conversation.id} currentUserId={currentUserId} otherUserId={passenger.user_id as string} />
          </div>
        )}
      </motion.div>
    </Modal>
  )
}



