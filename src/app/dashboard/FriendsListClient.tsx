'use client'

import * as React from 'react'
import { Modal } from '@/components/ui/Modal'
import { GameInterface } from '../journey/GameInterface'
import { Gamepad2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function FriendsListClient({ friends, currentUserId }: { friends: any[], currentUserId: string }) {
  const [selectedFriend, setSelectedFriend] = React.useState<any | null>(null)

  if (!friends || friends.length === 0) {
    return (
      <div className="bg-panel rounded-3xl p-8 border border-foreground/10 text-center text-foreground/50">
        You haven't made any connections yet.
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {friends.map((friend: any) => (
          <div key={friend.conversation_id} className="bg-panel rounded-2xl p-4 border border-foreground/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-accent text-background font-bold flex items-center justify-center text-lg shadow-inner">
                {friend.alias.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold">{friend.alias}</p>
                <p className="text-xs text-foreground/50">Since {new Date(friend.connected_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="px-3" onClick={() => setSelectedFriend(friend)}>
                <Gamepad2 size={16} className="text-primary" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {selectedFriend && (
        <Modal isOpen={true} onClose={() => setSelectedFriend(null)} title={`XO with ${selectedFriend.alias}`}>
          <div className="pt-4">
            <GameInterface 
              conversationId={selectedFriend.conversation_id} 
              currentUserId={currentUserId} 
              otherUserId={selectedFriend.friend_id} 
            />
          </div>
        </Modal>
      )}
    </>
  )
}
