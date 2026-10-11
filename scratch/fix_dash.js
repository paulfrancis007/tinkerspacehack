const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
code = code.replace("onClick={`window.location.href='/journey'`}", "");
fs.writeFileSync('src/app/dashboard/page.tsx', code);
