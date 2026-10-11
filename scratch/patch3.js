const fs = require('fs');
let content = fs.readFileSync('src/app/journey/RequestInbox.tsx', 'utf8');

content = content.replace(/const \{ data \} = await supabase[\s\S]*?\.neq\('requested_by', currentUserId\)/, "const { data } = await supabase.rpc('get_pending_requests', { p_journey_id: journeyId })");

content = content.replace(/\{\(req\.profiles as any\)\.display_name\.charAt\(0\)\.toUpperCase\(\)\}/g, "{(req.alias as string).charAt(0).toUpperCase()}");
content = content.replace(/\{\(req\.profiles as any\)\.display_name\}/g, "{(req.alias as string)}");

fs.writeFileSync('src/app/journey/RequestInbox.tsx', content);
