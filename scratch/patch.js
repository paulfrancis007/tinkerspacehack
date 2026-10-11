const fs = require('fs');
let content = fs.readFileSync('src/app/journey/LoungeClient.tsx', 'utf8');
const searchString = '<RequestInbox';
const replacement = `<div className="bg-panel rounded-3xl p-6 mb-8 flex justify-between items-center">
        <div>
          <h3 className="font-bold">Social Mode</h3>
          <p className="text-sm text-foreground/70">
            Set your interaction preference.
          </p>
        </div>
        <select value={socialMode} onChange={handleSocialMode} disabled={isPending} className="bg-background border border-foreground/10 rounded-xl p-2 text-sm text-foreground">
          <option value="quiet">Quiet (No Invites)</option>
          <option value="chat">Chat</option>
          <option value="game">Game</option>
        </select>
      </div>

      <RequestInbox`;
content = content.replace(searchString, replacement);
fs.writeFileSync('src/app/journey/LoungeClient.tsx', content);
