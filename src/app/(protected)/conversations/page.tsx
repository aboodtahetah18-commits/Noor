import { PersistentConversationWorkspace } from '@/components/conversations/persistent-conversation-workspace';

const ROOM_KEYS=new Set(['central','operations','solvency','assets','hilal','advisor','secretary','council']);

export default async function ConversationsPage({searchParams}:{searchParams:Promise<{room?:string}>}) {
  const q=await searchParams;
  const initialRoom=ROOM_KEYS.has(q.room??'') ? q.room as 'central'|'operations'|'solvency'|'assets'|'hilal'|'advisor'|'secretary'|'council' : 'central';
  return (
    <div data-chat-first-route="true">
      <PersistentConversationWorkspace initialRoom={initialRoom} />
    </div>
  );
}
