import { PersistentConversationWorkspace } from '@/components/conversations/persistent-conversation-workspace';

export default function ConversationsPage() {
  return (
    <div data-chat-first-route="true">
      <PersistentConversationWorkspace />
    </div>
  );
}
