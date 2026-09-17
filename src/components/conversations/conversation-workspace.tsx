'use client';

import { FormEvent, useMemo, useState } from 'react';
import { LucideIcon } from '@/components/ui/lucide-icon';
import styles from './conversation-workspace.module.css';

type RoomKind = 'advisor' | 'bank' | 'governor' | 'council';
type MessageKind = 'message' | 'risk' | 'decision' | 'recommendation' | 'followup' | 'request';

type Room = {
  id: string;
  title: string;
  subtitle: string;
  kind: RoomKind;
  specialists: string;
};

type Message = {
  id: string;
  sender: 'user' | 'agent' | 'system';
  senderName: string;
  body: string;
  kind: MessageKind;
  facts?: Array<{ label: string; value: string }>;
  reason?: string;
  nextAction?: string;
};

const rooms: [Room, ...Room[]] = [
  { id: 'central', title: 'البنك المركزي لنماء', subtitle: 'الحوكمة والتنسيق', kind: 'governor', specialists: 'المحافظ والمستشار المختص فقط عند الحاجة' },
  { id: 'solvency', title: 'بنك الملاءة', subtitle: 'الحماية والاحتياطي', kind: 'bank', specialists: 'مدير بنك الملاءة ومستشار المخاطر' },
  { id: 'assets', title: 'بنك الأصول والأهداف', subtitle: 'الأصول والأهداف والاستثمار', kind: 'bank', specialists: 'مدير بنك الأصول ومستشار الاستثمار عند صلة الموضوع' },
  { id: 'hilal', title: 'بنك الهلال', subtitle: 'التمويل الداخلي', kind: 'bank', specialists: 'مدير بنك الهلال ومستشار التمويل' },
  { id: 'advisor', title: 'المستشار المالي', subtitle: 'تحليل وتوصيات', kind: 'advisor', specialists: 'المستشار المختص بحسب موضوع الرسالة' },
  { id: 'council', title: 'مجلس نماء الأعلى', subtitle: 'القرارات واللجان', kind: 'council', specialists: 'أعضاء اللجنة ذات الصلة فقط، وليس جميع الشخصيات' },
];

const initialMessages: Message[] = [
  {
    id: 'm1', sender: 'agent', senderName: 'المستشار المالي', kind: 'recommendation',
    body: 'بعد مراجعة التغطية الحالية، الأفضل المحافظة على سيولة الحماية قبل زيادة الاستثمار.',
    facts: [{ label: 'الثقة', value: 'مرتفعة' }, { label: 'المخاطر', value: 'متوسطة' }],
    reason: 'لأن أي زيادة استثمارية الآن تقلل هامش المرونة أمام الالتزامات القريبة.',
    nextAction: 'راجع مبلغ الاحتياطي المتاح ثم اختر إن كنت تريد فتح دراسة استثمار جديدة.',
  },
  {
    id: 'm2', sender: 'system', senderName: 'نماء', kind: 'followup',
    body: 'تم فتح مسار متابعة للتوصية. لن تعتبر أي خطوة منفذة قبل أن تؤكدها وترفق ما يثبت التنفيذ عند الحاجة.',
  },
];

const kindLabel: Record<MessageKind, string> = {
  message: '', risk: 'تقييم مخاطر', decision: 'قرار / اعتماد', recommendation: 'توصية', followup: 'متابعة', request: 'طلب إجراء',
};

export function ConversationWorkspace() {
  const [activeRoomId, setActiveRoomId] = useState(rooms[0].id);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [desktopRoomsVisible, setDesktopRoomsVisible] = useState(true);
  const [desktopContextVisible, setDesktopContextVisible] = useState(true);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState(initialMessages);

  const activeRoom = useMemo(() => rooms.find((room) => room.id === activeRoomId) ?? rooms[0], [activeRoomId]);

  function chooseRoom(id: string) {
    setActiveRoomId(id);
    setRoomsOpen(false);
  }

  function send(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setMessages((current) => [...current, {
      id: `local-${Date.now()}`,
      sender: 'user',
      senderName: 'أنت',
      body,
      kind: 'message',
    }]);
    setDraft('');
  }

  return (
    <section className={styles.page} dir="rtl" aria-label="محادثات نماء">
      <header className={styles.workspaceHeader}>
        <div className={styles.headingCopy}>
          <span className={styles.eyebrow}>محادثات نماء</span>
          <h1>مركز الحوار والقرار</h1>
          <p>تصل رسالتك إلى الجهة والمتخصصين المرتبطين بموضوعها، دون استدعاء جميع الشخصيات تلقائيًا.</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.secondaryButton} onClick={() => setDesktopRoomsVisible((value) => !value)}>
            <LucideIcon name="layoutGrid" size={16}/><span>{desktopRoomsVisible ? 'إخفاء الجهات' : 'إظهار الجهات'}</span>
          </button>
          <button type="button" className={styles.secondaryButton} onClick={() => setDesktopContextVisible((value) => !value)}>
            <LucideIcon name="info" size={16}/><span>{desktopContextVisible ? 'إخفاء السياق' : 'إظهار السياق'}</span>
          </button>
        </div>
      </header>

      <div className={`${styles.workspace} ${desktopRoomsVisible ? '' : styles.withoutRooms} ${desktopContextVisible ? '' : styles.withoutContext}`}>
        {desktopRoomsVisible && <aside className={styles.roomsPane} aria-label="قائمة المحادثات">
          <div className={styles.paneTitle}><span>الجهات والمحادثات</span><small>{rooms.length} جهات</small></div>
          <div className={styles.roomList}>
            {rooms.map((room) => <button key={room.id} type="button" onClick={() => chooseRoom(room.id)} className={`${styles.roomItem} ${activeRoom.id === room.id ? styles.activeRoom : ''}`}>
              <span className={styles.entityAvatar}>{room.title.slice(0, 1)}</span>
              <span className={styles.roomCopy}><strong>{room.title}</strong><small>{room.subtitle}</small></span>
            </button>)}
          </div>
        </aside>}

        <main className={styles.chatPane}>
          <header className={styles.chatHeader}>
            <div className={styles.chatIdentity}>
              <span className={styles.entityAvatar}>{activeRoom.title.slice(0, 1)}</span>
              <div><div className={styles.entityTitle}><strong>{activeRoom.title}</strong><span>شخصية خوارزمية</span></div><small>{activeRoom.subtitle}</small></div>
            </div>
            <div className={styles.mobileTools}>
              <button type="button" aria-label="فتح الجهات" onClick={() => setRoomsOpen(true)}><LucideIcon name="messageSquareText" size={20}/></button>
              <button type="button" aria-label="فتح سياق المحادثة" onClick={() => setContextOpen(true)}><LucideIcon name="info" size={20}/></button>
            </div>
          </header>

          <div className={styles.routingNote}><LucideIcon name="sparkles" size={16}/><span><strong>التوجيه الذكي:</strong> المشاركون في هذه الغرفة: {activeRoom.specialists}.</span></div>

          <div className={styles.messages} aria-live="polite">
            {messages.map((message) => <article key={message.id} className={`${styles.message} ${message.sender === 'user' ? styles.userMessage : styles.agentMessage}`}>
              {message.sender !== 'user' && <div className={styles.messageIdentity}>
                <span className={styles.miniAvatar}>{message.senderName.slice(0, 1)}</span>
                <span><strong>{message.senderName}</strong><small>{message.sender === 'system' ? 'رسالة نظام' : 'شخصية خوارزمية'}</small></span>
              </div>}
              <p>{message.body}</p>
              {message.kind !== 'message' && <section className={`${styles.structuredCard} ${styles[`kind_${message.kind}`]}`}>
                <header><strong>{kindLabel[message.kind]}</strong></header>
                {message.facts && <div className={styles.facts}>{message.facts.map((fact) => <span key={fact.label}><small>{fact.label}</small><strong>{fact.value}</strong></span>)}</div>}
                {message.reason && <p><strong>السبب:</strong> {message.reason}</p>}
                {message.nextAction && <p><strong>الخطوة التالية:</strong> {message.nextAction}</p>}
                {(message.kind === 'decision' || message.kind === 'request') && <small className={styles.executionBoundary}>أي تنفيذ مالي خارجي يظل بيد المستخدم، ويحتاج تأكيدًا وإثباتًا قبل الإغلاق.</small>}
              </section>}
            </article>)}
          </div>

          <div className={styles.attachmentPolicy}><LucideIcon name="upload" size={16}/><span>المرفق يُرفع للمراجعة والتحقق فقط؛ رفعه لا ينشئ حركة مالية ولا يثبت التنفيذ تلقائيًا.</span></div>
          <div className={styles.executionNote}><LucideIcon name="circleCheck" size={16}/><span>نماء يوصي ويتابع؛ التنفيذ المالي الخارجي يتم بواسطة المستخدم.</span></div>

          <form className={styles.composer} onSubmit={send}>
            <button type="button" className={styles.attachButton} aria-label="إرفاق ملف" title="إرفاق ملف"><LucideIcon name="upload" size={20}/></button>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`اكتب إلى ${activeRoom.title}…`} rows={1} aria-label="نص الرسالة" />
            <button type="submit" className={styles.sendButton} disabled={!draft.trim()}><span>إرسال</span><LucideIcon name="chevronLeft" size={20}/></button>
          </form>
        </main>

        {desktopContextVisible && <aside className={styles.contextPane} aria-label="سياق المحادثة">
          <div className={styles.paneTitle}><span>السياق</span><small>حيّز العمل</small></div>
          <section className={styles.contextCard}><small>الجهة الحالية</small><strong>{activeRoom.title}</strong><p>{activeRoom.subtitle}</p></section>
          <section className={styles.contextCard}><small>المشاركون</small><strong>اختصاصيون حسب الموضوع</strong><p>{activeRoom.specialists}. لا تُستدعى جميع الجهات تلقائيًا.</p></section>
          <section className={styles.contextCard}><small>حد التنفيذ</small><strong>توصية ومتابعة فقط</strong><p>لا تحويل، لا سداد، ولا إجراء مالي خارجي يُعد منفذًا من المنصة.</p></section>
          <section className={styles.contextCard}><small>المرفقات</small><strong>مراجعة قبل الإثبات</strong><p>المستند لا يغيّر حالة القرار أو العملية حتى يمر بمسار التحقق.</p></section>
        </aside>}
      </div>

      {roomsOpen && <div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label="الجهات والمحادثات">
        <button type="button" className={styles.scrim} aria-label="إغلاق" onClick={() => setRoomsOpen(false)}/>
        <aside className={styles.mobileSheet}><div className={styles.sheetHeader}><strong>الجهات والمحادثات</strong><button type="button" onClick={() => setRoomsOpen(false)} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button></div>
          <div className={styles.roomList}>{rooms.map((room) => <button key={room.id} type="button" onClick={() => chooseRoom(room.id)} className={`${styles.roomItem} ${activeRoom.id === room.id ? styles.activeRoom : ''}`}><span className={styles.entityAvatar}>{room.title.slice(0, 1)}</span><span className={styles.roomCopy}><strong>{room.title}</strong><small>{room.subtitle}</small></span></button>)}</div>
        </aside>
      </div>}

      {contextOpen && <div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label="سياق المحادثة">
        <button type="button" className={styles.scrim} aria-label="إغلاق" onClick={() => setContextOpen(false)}/>
        <aside className={styles.mobileSheet}><div className={styles.sheetHeader}><strong>سياق المحادثة</strong><button type="button" onClick={() => setContextOpen(false)} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button></div>
          <section className={styles.contextCard}><small>الجهة الحالية</small><strong>{activeRoom.title}</strong><p>{activeRoom.subtitle}</p></section>
          <section className={styles.contextCard}><small>المشاركون</small><strong>اختصاصيون حسب الموضوع</strong><p>{activeRoom.specialists}.</p></section>
          <section className={styles.contextCard}><small>حد التنفيذ</small><strong>المستخدم هو المنفّذ</strong><p>نماء يوصي ويتابع ويطلب الإثبات، ولا ينفذ الإجراء المالي الخارجي بدلًا عنك.</p></section>
        </aside>
      </div>}
    </section>
  );
}