'use client'

import * as React from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { requestConnection, blockUser, reportTarget, requestCall } from './consentActions'
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
  
  // Reset states on open
  React.useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(null)
      setSuccessMsg(null)
    }
  }, [isOpen])

  if (!passenger) return null

  const isMe = passenger.user_id === currentUserId
  const alias = passenger.alias as string
  const bio = passenger.bio as string
  const interests = passenger.interests as string[]

  const handleRequest = async () => {
    setIsPending(true)
    // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(null)
    const result = await requestConnection(passenger.user_id as string)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccessMsg('Request sent successfully.')
    }
    setIsPending(false)
  }

  const handleBlock = async () => {
    if (!confirm('Are you sure you want to block this user?')) return
    setIsPending(true)
    const result = await blockUser(passenger.user_id as string)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccessMsg('User blocked.')
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
      <div className="flex flex-col gap-6">
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
            <Button onClick={handleRequest} disabled={isPending}>
              Request Connection
            </Button>
            <Button variant="secondary" onClick={handleBlock} disabled={isPending}>
              Block User
            </Button>
            <Button variant="ghost" className="text-destructive" onClick={handleReport} disabled={isPending}>
              Report User
            </Button>
          </div>
        )}
      {conversation && !isMe && (
          <div className="mt-6 border-t border-foreground/10 pt-6">
            <GameInterface conversationId={conversation.id} currentUserId={currentUserId} otherUserId={passenger.user_id as string} />
          </div>
        )}
      </div>
    </Modal>
  )
}



