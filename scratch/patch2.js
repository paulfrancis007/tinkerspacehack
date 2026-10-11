const fs = require('fs');
let content = fs.readFileSync('src/app/journey/RequestInbox.tsx', 'utf8');

const searchData = `    const { data } = await supabase
      .from('conversations')
      .select('*, profiles:requested_by (id, display_name, avatar_seed)')
      .eq('journey_id', journeyId)
      .eq('status', 'pending')
      .neq('requested_by', currentUserId)`;

const replaceData = `    const { data } = await supabase.rpc('get_pending_requests', { p_journey_id: journeyId })`;

content = content.replace(searchData, replaceData);

content = content.replace(/\{\(req\.profiles as any\)\.display_name\.charAt\(0\)\.toUpperCase\(\)\}/g, "{(req.alias as string).charAt(0).toUpperCase()}");
content = content.replace(/\{\(req\.profiles as any\)\.display_name\}/g, "{(req.alias as string)}");

fs.writeFileSync('src/app/journey/RequestInbox.tsx', content);
