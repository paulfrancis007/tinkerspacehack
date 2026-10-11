const fs = require('fs');
let content = fs.readFileSync('src/app/journey/PassengerSheet.tsx', 'utf8');

if (!content.includes('import { requestConnection, blockUser, reportTarget, requestCall, respondConnection }')) {
    content = content.replace('requestCall } from', 'requestCall, respondConnection } from');
}

if (!content.includes('const handleRespond =')) {
    const blockIdx = content.indexOf('const handleBlock = async');
    content = content.slice(0, blockIdx) + 
`  const handleRespond = async (accept: boolean) => {
    setIsPending(true);
    const result = await respondConnection(conversation.id, accept);
    if (result.error) setError(result.error);
    else {
      setSuccessMsg(accept ? "Connection accepted." : "Connection declined.");
      fetchConversation();
    }
    setIsPending(false);
  }

  ` + content.slice(blockIdx);
}

fs.writeFileSync('src/app/journey/PassengerSheet.tsx', content);
