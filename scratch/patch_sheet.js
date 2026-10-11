const fs = require('fs');
let content = fs.readFileSync('src/app/journey/PassengerSheet.tsx', 'utf8');

// 1. Add fetchConversation in useEffect
const useEffectStr = `React.useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(null)
      setSuccessMsg(null)
    }
  }, [isOpen])`;

const newUseEffectStr = `const fetchConversation = React.useCallback(async () => {
    if (!passenger) return
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('journey_id', passenger.journey_id)
      .or(\`and(user_a.eq.\${currentUserId},user_b.eq.\${passenger.user_id}),and(user_a.eq.\${passenger.user_id},user_b.eq.\${currentUserId})\`)
      .single()
    
    setConversation(data || null)
  }, [passenger, currentUserId, supabase])

  React.useEffect(() => {
    if (isOpen) {
      setError(null)
      setSuccessMsg(null)
      fetchConversation()
    }
  }, [isOpen, fetchConversation])`;

content = content.replace(useEffectStr, newUseEffectStr);

// 2. Fix the buttons display logic
const buttonsStr = `        {!isMe && (
          <div className="grid grid-cols-1 gap-3 mt-4 pt-4 border-t border-foreground/10">
            <Button onClick={handleRequest} disabled={isPending}>
              Request Connection
            </Button>
            {conversation && (
              <div className="flex gap-2">
                <Button onClick={() => handleCall('audio')} disabled={isPending} className="flex-1">Audio Call</Button>
                <Button onClick={() => handleCall('video')} disabled={isPending} className="flex-1">Video Call</Button>
              </div>
            )}`;

const newButtonsStr = `        {!isMe && (
          <div className="grid grid-cols-1 gap-3 mt-4 pt-4 border-t border-foreground/10">
            {(!conversation || conversation.status === 'declined' || conversation.status === 'revoked') && (
              <Button onClick={handleRequest} disabled={isPending}>
                Request Connection
              </Button>
            )}
            {conversation?.status === 'pending' && (
              <Button disabled variant="secondary">Request Pending...</Button>
            )}
            {conversation?.status === 'accepted' && (
              <div className="flex gap-2">
                <Button onClick={() => handleCall('audio')} disabled={isPending} className="flex-1 text-background bg-primary">Audio Call</Button>
                <Button onClick={() => handleCall('video')} disabled={isPending} className="flex-1 text-background bg-primary">Video Call</Button>
              </div>
            )}`;

content = content.replace(buttonsStr, newButtonsStr);

// 3. Fix GameInterface check
const gameStr = `{conversation && !isMe && (
          <div className="mt-6 border-t border-foreground/10 pt-6">
            <GameInterface conversationId={conversation.id} currentUserId={currentUserId} otherUserId={passenger.user_id as string} />
          </div>
        )}`;

const newGameStr = `{conversation?.status === 'accepted' && !isMe && (
          <div className="mt-6 border-t border-foreground/10 pt-6">
            <GameInterface conversationId={conversation.id} currentUserId={currentUserId} otherUserId={passenger.user_id as string} />
          </div>
        )}`;

content = content.replace(gameStr, newGameStr);

fs.writeFileSync('src/app/journey/PassengerSheet.tsx', content);
