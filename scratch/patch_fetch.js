const fs = require('fs');
let content = fs.readFileSync('src/app/journey/PassengerSheet.tsx', 'utf8');

const search = `.eq('journey_id', passenger.journey_id)
      .or(\`and(user_a.eq.\${currentUserId},user_b.eq.\${passenger.user_id}),and(user_a.eq.\${passenger.user_id},user_b.eq.\${currentUserId})\`)
      .single()`;

const replace = `const uA = currentUserId < (passenger.user_id as string) ? currentUserId : passenger.user_id;
    const uB = currentUserId < (passenger.user_id as string) ? passenger.user_id : currentUserId;
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('journey_id', passenger.journey_id)
      .eq('user_a', uA)
      .eq('user_b', uB)
      .single();`;

// Wait, the original code had `.from('conversations').select('*').eq(...)`.
// So replacing just the `.eq().or().single()` part won't work well if I insert variable declarations.
// Let's replace the whole fetchConversation body.

const oldFunc = `const fetchConversation = React.useCallback(async () => {
    if (!passenger) return
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('journey_id', passenger.journey_id)
      .or(\`and(user_a.eq.\${currentUserId},user_b.eq.\${passenger.user_id}),and(user_a.eq.\${passenger.user_id},user_b.eq.\${currentUserId})\`)
      .single()
    
    setConversation(data || null)
  }, [passenger, currentUserId, supabase])`;

const newFunc = `const fetchConversation = React.useCallback(async () => {
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
  }, [passenger, currentUserId, supabase])`;

content = content.replace(oldFunc, newFunc);
fs.writeFileSync('src/app/journey/PassengerSheet.tsx', content);
