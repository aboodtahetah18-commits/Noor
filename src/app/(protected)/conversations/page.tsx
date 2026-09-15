import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import {
  listConversationMessages,
  listConversationThreads,
} from '@/repositories/conversation-repository';
import { getConversationContext } from '@/repositories/conversation-context-repository';
import {
  createGovernorConversationAction,
  sendConversationMessageAction,
} from './actions';

type SearchParams = Promise<{ thread?: string }>;

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAuthenticatedUser();
  const params = await searchParams;
  const threads = await listConversationThreads(user.id);
  const activeThreadId = params.thread || String(threads[0]?.id ?? '');
  const messages = activeThreadId
    ? await listConversationMessages(user.id, activeThreadId)
    : [];
  const context = await getConversationContext(user.id);

  return (
    <main className="namaa-conversation-shell" dir="rtl">
      <aside className="namaa-thread-list">
        <header>
          <h1>المحادثات</h1>
          <form action={createGovernorConversationAction}>
            <button type="submit">محادثة جديدة</button>
          </form>
        </header>
        <nav aria-label="قائمة المحادثات">
          {threads.map((thread) => (
            <a
              key={String(thread.id)}
              href={`/conversations?thread=${String(thread.id)}`}
              aria-current={String(thread.id) === activeThreadId ? 'page' : undefined}
            >
              {String(thread.title || thread.primary_agent_name || 'محادثة نماء')}
            </a>
          ))}
        </nav>
      </aside>

      <section className="namaa-chat-panel">
        <header className="namaa-chat-header">
          <div>
            <strong>المحافظ</strong>
            <p>منسق رحلتك المالية</p>
          </div>
        </header>

        <div className="namaa-message-stream" aria-live="polite">
          {!activeThreadId ? (
            <div className="namaa-empty-state">
              <h2>ابدأ محادثتك مع نماء</h2>
              <p>سأستخدم بياناتك المؤكدة ولن أطلب إعادة إدخالها دون حاجة.</p>
            </div>
          ) : (
            messages.map((message) => (
              <article
                key={String(message.id)}
                className={`namaa-message namaa-message--${String(message.sender_type).toLowerCase()}`}
              >
                <p>{String(message.body ?? '')}</p>
              </article>
            ))
          )}
        </div>

        {activeThreadId ? (
          <form action={sendConversationMessageAction} className="namaa-composer">
            <input type="hidden" name="threadId" value={activeThreadId} />
            <textarea
              name="body"
              required
              maxLength={12000}
              placeholder="اكتب رسالتك إلى نماء..."
              aria-label="رسالة إلى نماء"
            />
            <button type="submit">إرسال</button>
          </form>
        ) : null}
      </section>

      <aside className="namaa-context-panel">
        <h2>السياق المالي</h2>
        <dl>
          <div><dt>الدورة</dt><dd>{context.cycle ? String(context.cycle.name) : 'لا توجد دورة نشطة'}</dd></div>
          <div><dt>الحسابات</dt><dd>{context.accounts.length}</dd></div>
          <div><dt>التوصيات</dt><dd>{context.recommendations.length}</dd></div>
          <div><dt>مهام التنفيذ</dt><dd>{context.executionTasks.length}</dd></div>
        </dl>
        <p className="namaa-execution-note">
          نماء لا ينفذ التحويل أو السداد أو الاستثمار تلقائيًا. التنفيذ بيد المستخدم.
        </p>
      </aside>
    </main>
  );
}
