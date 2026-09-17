import fs from 'node:fs';
const path='apps/namaa-final-ui/src/components/ConversationWorkspace.tsx';
const source=fs.readFileSync(path,'utf8');
const from='<section className="mobile-inbox-section mobile-governance-groups">';
const to='<section className="mobile-inbox-section mobile-governance-groups" aria-label="مجلس نماء واللجان">';
if(!source.includes(from)) throw new Error('Governance group compatibility target missing');
fs.writeFileSync(path,source.replace(from,to));
console.log('Preserved prior chat-first governance destination contract.');
