'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { v4 as uuidv4 } from 'uuid'

export function GameInterface({ conversationId, currentUserId, otherUserId }: { conversationId: string, currentUserId: string, otherUserId: string }) {
  const [game, setGame] = React.useState<Record<string, any> | null>(null)
  const [loading, setLoading] = React.useState(true)
  const supabase = createClient()

  const fetchGame = React.useCallback(async () => {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('conversation_id', conversationId)
      .in('status', ['invited', 'active', 'won', 'draw', 'abandoned'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    setGame(data || null)
    setLoading(false)
  }, [conversationId, supabase])

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGame()

    const channel = supabase.channel(`game-${conversationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `conversation_id=eq.${conversationId}` }, () => {
        fetchGame()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_moves' }, () => {
        fetchGame()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchGame, conversationId, supabase])

  const handleInvite = async () => {
    setLoading(true)
    const nonce = uuidv4()
    await supabase.rpc('invite_game', { p_conversation_id: conversationId, p_nonce: nonce })
  }

  const handleRespond = async (accept: boolean) => {
    if (!game) return
    setLoading(true)
    await supabase.rpc('respond_game', { p_game_id: game.id, p_accept: accept })
  }

  const handlePlayMove = async (cellIndex: number) => {
    if (!game || game.status !== 'active' || game.turn_id !== currentUserId) return
    if (game.board[cellIndex] !== '') return

    setLoading(true)
    const nonce = uuidv4()
    
    // Optimistic UI
    const newBoard = [...game.board]
    newBoard[cellIndex] = currentUserId === game.x_id ? 'X' : 'O'
    setGame({ ...game, board: newBoard, turn_id: null }) // null to prevent double click

    const { error } = await supabase.rpc('play_move', {
      p_game_id: game.id,
      p_cell: cellIndex,
      p_expected_version: game.version,
      p_nonce: nonce
    })
    
    if (error) {
      alert(error.message)
      fetchGame() // revert
    }
  }

  if (loading && !game) return <div className="text-center p-4">Loading Game...</div>

  if (!game) {
    return (
      <div className="bg-panel rounded-3xl p-6 text-center border border-primary/20">
        <h3 className="font-bold mb-2">Window Seat XO</h3>
        <p className="text-sm text-foreground/70 mb-4">Play a game of Tic-Tac-Toe to pass the time.</p>
        <Button onClick={handleInvite} disabled={loading}>Invite to Game</Button>
      </div>
    )
  }

  if (game.status === 'invited') {
    if (game.x_id === currentUserId) {
      return (
        <div className="bg-panel rounded-3xl p-6 text-center">
          <p>Waiting for opponent to accept Window Seat XO...</p>
        </div>
      )
    } else {
      return (
        <div className="bg-panel rounded-3xl p-6 text-center border border-primary/20">
          <p className="mb-4 font-bold">Opponent invited you to Window Seat XO!</p>
          <div className="flex gap-4 justify-center">
            <Button variant="secondary" onClick={() => handleRespond(false)} disabled={loading}>Decline</Button>
            <Button onClick={() => handleRespond(true)} disabled={loading}>Accept</Button>
          </div>
        </div>
      )
    }
  }

  const isMyTurn = game.status === 'active' && game.turn_id === currentUserId
  const amIX = game.x_id === currentUserId
  const myMark = amIX ? 'X' : 'O'
  
  let statusText = ''
  if (game.status === 'active') {
    statusText = isMyTurn ? `Your Turn (${myMark})` : `Waiting for Opponent (${amIX ? 'O' : 'X'})`
  } else if (game.status === 'won') {
    statusText = game.winner_id === currentUserId ? 'You Won! 🎉' : 'Opponent Won'
  } else if (game.status === 'draw') {
    statusText = 'Draw'
  } else if (game.status === 'abandoned') {
    statusText = 'Game Abandoned'
  } else if (game.status === 'declined') {
    statusText = 'Invite Declined'
  }

  const showRematch = ['won', 'draw', 'abandoned', 'declined'].includes(game.status)

  return (
    <div className="bg-panel rounded-3xl p-6 border border-foreground/10 flex flex-col items-center">
      <h3 className="font-bold text-lg mb-2">Window Seat XO</h3>
      <div className={`font-bold mb-6 px-4 py-1 rounded-full text-sm ${isMyTurn ? 'bg-primary text-background' : 'bg-background text-foreground'}`}>
        {statusText}
      </div>

      {['active', 'won', 'draw'].includes(game.status) && (
        <div className="grid grid-cols-3 gap-2 w-48 h-48 mb-6">
          {game.board.map((cell: string, index: number) => (
            <button
              key={index}
              onClick={() => handlePlayMove(index)}
              disabled={cell !== '' || !isMyTurn || game.status !== 'active'}
              className={`flex items-center justify-center text-4xl font-black rounded-xl
                ${cell === '' ? 'bg-background hover:bg-background/80' : 'bg-accent text-background'}
                ${isMyTurn && cell === '' && game.status === 'active' ? 'cursor-pointer ring-2 ring-primary' : 'cursor-default'}
              `}
            >
              {cell}
            </button>
          ))}
        </div>
      )}

      {showRematch && (
        <Button onClick={handleInvite} disabled={loading} className="w-full">
          Rematch (New Game)
        </Button>
      )}
    </div>
  )
}
