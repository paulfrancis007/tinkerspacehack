'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Send, Trash } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

interface Message {
  id: string
  client_nonce: string
  body: string
  sender_id: string
  created_at: string
  status: 'pending' | 'sent' | 'failed'
  reactions: Record<string, { count: number; userReacted: boolean }>
}

const EMOJIS = ['👍', '💚', '😂', '✨', '🚀']

export function ChatInterface({ 
  journeyId, 
  conversationId = null, 
  currentUserId,
  hasConsent,
  onGrantConsent
}: { 
  journeyId: string
  conversationId?: string | null
  currentUserId: string
  hasConsent: boolean
  onGrantConsent: () => void
}) {
  const [messages, setMessages] = React.useState<Message[]>([])
  const [inputText, setInputText] = React.useState('')
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [hasMore, setHasMore] = React.useState(true)
  const supabase = createClient()
  const listRef = React.useRef<HTMLDivElement>(null)

  const fetchMessages = React.useCallback(async (before?: string) => {
    let q = supabase
      .from('messages')
      .select('*, reactions(emoji, user_id, active)')
      .eq('journey_id', journeyId)
      
    if (conversationId) {
      q = q.eq('conversation_id', conversationId)
    } else {
      q = q.is('conversation_id', null)
    }

    if (before) {
      q = q.lt('created_at', before)
    }

    const { data } = await q.order('created_at', { ascending: false }).limit(20)

    if (data) {
      setHasMore(data.length === 20)
      const formatted = data.map((m: Record<string, any>) => formatMessage(m, currentUserId))
      if (before) {
        setMessages(prev => {
          // Merge avoiding duplicates
          const existingIds = new Set(prev.map(p => p.id))
          const newUnique = formatted.filter(f => !existingIds.has(f.id))
          return [...prev, ...newUnique].sort((a, b) => b.created_at.localeCompare(a.created_at))
        })
      } else {
        setMessages(prev => {
          // Full reconciliation
          const newMap = new Map(formatted.map(f => [f.id, f]))
          // Keep pending ones that aren't in server response yet
          const pending = prev.filter(p => p.status === 'pending' || p.status === 'failed')
          const merged = [...Array.from(newMap.values()), ...pending]
          // Sort desc
          return merged.sort((a, b) => b.created_at.localeCompare(a.created_at))
        })
      }
    }
  }, [journeyId, conversationId, currentUserId, supabase])

  React.useEffect(() => {
    if (!hasConsent && !conversationId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMessages()

    const channel = supabase.channel(`chat-${conversationId || 'lounge'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `journey_id=eq.${journeyId}` }, () => {
        fetchMessages()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => {
        fetchMessages()
      })
      .subscribe()

    const handleFocus = () => fetchMessages()
    window.addEventListener('focus', handleFocus)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchMessages, hasConsent, conversationId, journeyId, supabase])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return

    const nonce = uuidv4()
    const text = inputText.trim()
    setInputText('')

    const optimisticMsg: Message = {
      id: nonce, // temp
      client_nonce: nonce,
      body: text,
      sender_id: currentUserId,
      created_at: new Date().toISOString(),
      status: 'pending',
      reactions: {}
    }

    setMessages(prev => [optimisticMsg, ...prev])

    const { error } = await supabase.rpc('send_message', {
      p_journey_id: journeyId,
      p_conversation_id: conversationId,
      p_body: text,
      p_nonce: nonce
    })

    if (error) {
      setMessages(prev => prev.map(m => m.client_nonce === nonce ? { ...m, status: 'failed' } : m))
      alert('Failed to send: ' + error.message)
    } else {
      // It will reconcile via subscription
    }
  }

  const handleRetry = async (msg: Message) => {
    setMessages(prev => prev.map(m => m.client_nonce === msg.client_nonce ? { ...m, status: 'pending' } : m))
    const { error } = await supabase.rpc('send_message', {
      p_journey_id: journeyId,
      p_conversation_id: conversationId,
      p_body: msg.body,
      p_nonce: msg.client_nonce
    })
    if (error) {
      setMessages(prev => prev.map(m => m.client_nonce === msg.client_nonce ? { ...m, status: 'failed' } : m))
    }
  }

  const handleDelete = async (id: string) => {
    await supabase.rpc('delete_own_message', { p_message_id: id })
    // Optimistic UI delete
    setMessages(prev => prev.filter(m => m.id !== id))
  }

  const handleReaction = async (id: string, emoji: string, currentActive: boolean) => {
    await supabase.rpc('set_reaction', { p_message_id: id, p_emoji: emoji, p_active: !currentActive })
  }

  if (!hasConsent && !conversationId) {
    return (
      <div className="bg-panel rounded-3xl p-6 text-center">
        <h3 className="font-bold mb-2">Lounge Chat</h3>
        <p className="text-foreground/70 mb-4 text-sm">
          This is a shared space. By entering, you agree to treat others with respect. 
          Messages are public to passengers on this journey.
        </p>
        <Button onClick={onGrantConsent}>I agree, join chat</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col bg-panel rounded-3xl h-[500px] border border-foreground/10 overflow-hidden">
      <div 
        ref={listRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col-reverse gap-4"
      >
        {messages.map(m => {
          const isMe = m.sender_id === currentUserId
          return (
            <div key={m.id || m.client_nonce} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl ${isMe ? 'bg-primary text-background' : 'bg-background text-foreground'}`}>
                <div className="break-words">{m.body}</div>
              </div>
              
              <div className="flex items-center gap-2 mt-1 px-1">
                {isMe && m.status === 'failed' && (
                  <button onClick={() => handleRetry(m)} className="text-xs text-destructive hover:underline">Retry</button>
                )}
                {isMe && (m.status === 'sent' || !m.status) && (
                  <button onClick={() => handleDelete(m.id)} className="text-foreground/40 hover:text-destructive">
                    <Trash size={12} />
                  </button>
                )}
                
                {/* Reactions */}
                {m.status !== 'pending' && m.status !== 'failed' && (
                  <div className="flex gap-1">
                    {EMOJIS.map(emoji => {
                      const r = m.reactions[emoji]
                      const active = r?.userReacted
                      const count = r?.count || 0
                      if (count === 0 && !active) return null // Hide zero-count emojis unless hovered (simplified for MVP: just hide them)
                      return (
                        <button 
                          key={emoji} 
                          onClick={() => handleReaction(m.id, emoji, active)}
                          className={`text-xs px-1.5 py-0.5 rounded-full border ${active ? 'bg-accent/20 border-accent/50' : 'bg-background border-foreground/10'}`}
                        >
                          {emoji} {count > 0 && count}
                        </button>
                      )
                    })}
                    {/* Add Reaction Button (Simplified: just always show the 5 options if hovered? Or a menu? For MVP, we can just show them slightly transparent if 0) */}
                    {EMOJIS.filter(e => !m.reactions[e]?.count).map(emoji => (
                       <button 
                         key={'add-'+emoji}
                         onClick={() => handleReaction(m.id, emoji, false)}
                         className="text-xs px-1 opacity-20 hover:opacity-100"
                       >
                         {emoji}
                       </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {hasMore && (
          <Button 
            variant="ghost" 
             
            onClick={() => fetchMessages(messages[messages.length - 1]?.created_at)}
            disabled={loadingMore}
            className="mx-auto"
          >
            Load older
          </Button>
        )}
      </div>

      <form onSubmit={handleSend} className="p-3 bg-background border-t border-foreground/10 flex gap-2">
        <Input 
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-full"
          maxLength={2000}
        />
        <Button type="submit" disabled={!inputText.trim()} className="rounded-full w-12 p-0 flex justify-center items-center">
          <Send size={18} />
        </Button>
      </form>
    </div>
  )
}

function formatMessage(raw: Record<string, any>, currentUserId: string): Message {
  const reactions: Record<string, { count: number, userReacted: boolean }> = {}
  
  if (raw.reactions) {
    raw.reactions.forEach((r: Record<string, any>) => {
      if (!r.active) return
      if (!reactions[r.emoji]) {
        reactions[r.emoji] = { count: 0, userReacted: false }
      }
      reactions[r.emoji].count++
      if (r.user_id === currentUserId) {
        reactions[r.emoji].userReacted = true
      }
    })
  }

  return {
    id: raw.id,
    client_nonce: raw.client_nonce,
    body: raw.body,
    sender_id: raw.sender_id,
    created_at: raw.created_at,
    status: 'sent',
    reactions
  }
}

