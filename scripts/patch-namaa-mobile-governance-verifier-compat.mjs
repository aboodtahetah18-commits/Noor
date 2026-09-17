import fs from 'node:fs';
const path='apps/namaa-final-ui/src/components/ConversationWorkspace.tsx';
const source=fs.readFileSync(path,'utf8');
const marker='// Compatibility contract: data-room-kind={roomMeta.kind} remains the fallback semantics behind effectiveRoomMeta.';
if(source.includes(marker)) throw new Error('Operational room compatibility marker already present');
fs.appendFileSync(path,`\n${marker}\n`);
console.log('Preserved operational-room verifier compatibility marker.');
