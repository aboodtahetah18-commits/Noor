import fs from 'node:fs/promises';

const required = [
  'src/infrastructure/db/conversation-schema.ts',
  'src/lib/conversations/store.ts',
  'src/app/api/conversations/route.ts',
  'src/app/api/conversations/[roomKey]/route.ts',
  'src/components/conversations/persistent-conversation-workspace.tsx',
  'database/migrations/20260917_001_conversations.sql',
];
for (const file of required) await fs.access(file);
const [page, store, migration, workspace] = await Promise.all([
  fs.readFile('src/app/(protected)/conversations/page.tsx','utf8'),
  fs.readFile('src/lib/conversations/store.ts','utf8'),
  fs.readFile('database/migrations/20260917_001_conversations.sql','utf8'),
  fs.readFile('src/components/conversations/persistent-conversation-workspace.tsx','utf8'),
]);
const assertions = [
  [page.includes('PersistentConversationWorkspace'), 'protected page must use persistent workspace'],
  [store.includes('where user_id=${userId}'), 'conversation reads must be user-scoped'],
  [store.includes('appendUserMessage'), 'message persistence must exist'],
  [migration.includes('conversation_messages'), 'conversation message table migration missing'],
  [migration.includes('conversation_participants'), 'participant table migration missing'],
  [migration.includes('conversation_attachments'), 'attachment governance table migration missing'],
  [migration.includes('conversation_links'), 'decision/follow-up links table migration missing'],
  [workspace.includes("fetch(`/api/conversations/${activeRoomId}`"), 'workspace must read API'],
  [workspace.includes("method:'POST'"), 'workspace must persist messages through POST'],
  [workspace.includes('التنفيذ المالي الخارجي يتم بواسطة المستخدم'), 'human execution boundary missing'],
];
const failed=assertions.filter(([ok])=>!ok);
if(failed.length){ for(const [,message] of failed) console.error(`FAIL: ${message}`); process.exit(1); }
console.log('Conversation persistence contract OK');
