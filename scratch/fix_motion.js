const fs = require('fs');
let code = fs.readFileSync('src/app/travelogue/page.tsx', 'utf8');

// Remove import
code = code.replace("import { ClientMotionDiv } from './ClientMotionDiv'", "");

// Replace tags
code = code.replace(/<ClientMotionDiv/g, "<div");
code = code.replace(/<\/ClientMotionDiv>/g, "</div>");

// Remove framer-motion props
code = code.replace(/initial=\{\{.*?\}\}/g, "");
code = code.replace(/animate=\{\{.*?\}\}/g, "");
code = code.replace(/transition=\{\{.*?\}\}/g, "");

fs.writeFileSync('src/app/travelogue/page.tsx', code);
