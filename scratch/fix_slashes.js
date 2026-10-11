const fs = require('fs');
let code = fs.readFileSync('src/app/travelogue/page.tsx', 'utf8');

// The file currently has literal backslashes in the template string
const brokenStr = "src={`\\${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/travelogue/\\${drop.object_path}`}";
const fixedStr = "src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/travelogue/${drop.object_path}`}";

code = code.replace(brokenStr, fixedStr);
fs.writeFileSync('src/app/travelogue/page.tsx', code);
