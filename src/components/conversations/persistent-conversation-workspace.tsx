'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { LucideIcon } from '@/components/ui/lucide-icon';
import styles from './conversation-workspace.module.css';

type RoomKey = 'central' | 'solvency' | 'assets' | 'hilal' | 'advisor' | 'council';
type MessageKind = 'message' | 'risk' | 'decision' | 'recommendation' | 'followup' | 'request';
type Message = { id:string; sender_type:'user'|'agent'|'system'; sender_name:string; message_kind:MessageKind; body:string; structured_data?:Record<string,unknown>; created_at?:string };
type Participant = { participant_key:string; display_name:string; participant_type:string; role_label?:string };

type Room = { id:RoomKey; title:string; subtitle:string; specialists:string };
const rooms: [Room, ...Room[]] = [
  { id:'central', title:'البنك المركزي لنماء', subtitle:'الحوكمة والتنسيق', specialists:'المحافظ والمستشار المختص فقط عند الحاجة' },
  { id:'solvency', title:'بنك الملاءة', subtitle:'الحماية والاحتياطي', specialists:'مدير بنك الملاءة ومستشار المخاطر' },
  { id:'assets', title:'بنك الأصول والأهداف', subtitle:'الأصول والأهداف والاستثمار', specialists:'مدير بنك الأصول ومستشار الاستثمار عند صلة الموضوع' },
  { id:'hilal', title:'بنك الهلال', subtitle:'التمويل الداخلي', specialists:'مدير بنك الهلال ومستشار التمويل' },
  { id:'advisor', title:'المستشار المالي', subtitle:'تحليل وتوصيات', specialists:'المستشار المختص بحسب موضوع الرسالة' },
  { id:'council', title:'مجلس نماء الأعلى', subtitle:'القرارات واللجان', specialists:'أعضاء اللجنة ذات الصلة فقط، وليس جميع الشخصيات' },
];
const labels:Record<MessageKind,string>={message:'',risk:'تقييم مخاطر',decision:'قرار / اعتماد',recommendation:'توصية',followup:'متابعة',request:'طلب إجراء'};

function formatSar(value:number){return new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(value)}
function roomTitle(value:unknown){if(typeof value!=='string')return null;return rooms.find(room=>room.id===value)?.title??null}
function missingLabel(value:string){if(value==='monthly_net_income')return 'الدخل الشهري الصافي';if(value==='recurring_core_obligations')return 'الالتزامات الأساسية';return value}

function StructuredFacts({data}:{data?:Record<string,unknown>}){
  if(!data)return null;
  const confidence=typeof data.confidence_percent==='number'?data.confidence_percent:null;
  const routed=roomTitle(data.routed_room);
  const metrics=data.financial_metrics&&typeof data.financial_metrics==='object'?data.financial_metrics as Record<string,unknown>:null;
  const missing=Array.isArray(data.missing_fields)?data.missing_fields.filter((item):item is string=>typeof item==='string'):[];
  const income=metrics&&typeof metrics.monthly_net_income==='number'?metrics.monthly_net_income:null;
  const obligations=metrics&&typeof metrics.recurring_core_obligations_total==='number'?metrics.recurring_core_obligations_total:null;
  const margin=metrics&&typeof metrics.safety_margin==='number'?metrics.safety_margin:null;
  const ratio=metrics&&typeof metrics.obligation_ratio==='number'?metrics.obligation_ratio:null;
  if(confidence===null&&!routed&&income===null&&!missing.length)return null;
  return <div className={styles.facts}>
    {confidence!==null&&<span><small>درجة الثقة</small><strong>{confidence}٪</strong></span>}
    {routed&&<span><small>الجهة المختصة</small><strong>{routed}</strong></span>}
    {income!==null&&<span><small>الدخل المؤكد</small><strong>{formatSar(income)} ر.س</strong></span>}
    {obligations!==null&&<span><small>الالتزامات المؤكدة</small><strong>{formatSar(obligations)} ر.س</strong></span>}
    {margin!==null&&<span><small>الهامش الأولي</small><strong>{formatSar(margin)} ر.س</strong></span>}
    {ratio!==null&&<span><small>نسبة الالتزامات</small><strong>{(ratio*100).toFixed(1)}٪</strong></span>}
    {missing.length>0&&<span><small>بيانات ناقصة</small><strong>{missing.map(missingLabel).join('، ')}</strong></span>}
  </div>;
}

export function PersistentConversationWorkspace(){
  const [activeRoomId,setActiveRoomId]=useState<RoomKey>('central');
  const [loadedRoomId,setLoadedRoomId]=useState<RoomKey|null>(null);
  const [messages,setMessages]=useState<Message[]>([]);
  const [participants,setParticipants]=useState<Participant[]>([]);
  const [draft,setDraft]=useState('');
  const [sending,setSending]=useState(false);
  const [error,setError]=useState('');
  const [roomsOpen,setRoomsOpen]=useState(false);
  const [contextOpen,setContextOpen]=useState(false);
  const [desktopRoomsVisible,setDesktopRoomsVisible]=useState(true);
  const [desktopContextVisible,setDesktopContextVisible]=useState(true);
  const activeRoom=useMemo(()=>rooms.find(r=>r.id===activeRoomId)??rooms[0],[activeRoomId]);
  const loading=loadedRoomId!==activeRoomId;

  useEffect(()=>{ let cancelled=false; fetch(`/api/conversations/${activeRoomId}`,{cache:'no-store'})
    .then(async response=>{ if(!response.ok) throw new Error('تعذر تحميل المحادثة.'); return response.json(); })
    .then(data=>{ if(!cancelled){ setMessages(Array.isArray(data.messages)?data.messages:[]); setParticipants(Array.isArray(data.participants)?data.participants:[]); setLoadedRoomId(activeRoomId); } })
    .catch(()=>{ if(!cancelled){ setError('تعذر تحميل المحادثة الآن. حاول مرة أخرى.'); setLoadedRoomId(activeRoomId); } }); return()=>{cancelled=true}; },[activeRoomId]);

  function chooseRoom(id:RoomKey){setError('');setActiveRoomId(id);setRoomsOpen(false)}
  async function send(event:FormEvent){ event.preventDefault(); const body=draft.trim(); if(!body||sending)return; setSending(true); setError('');
    try{
      const response=await fetch(`/api/conversations/${activeRoomId}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({body})});
      const data=await response.json() as {message?:Message;reply?:Message};
      if(!response.ok||!data.message)throw new Error('write');
      setMessages(current=>[...current,data.message as Message,...(data.reply?[data.reply as Message]:[])]);
      setDraft('');
    }
    catch{setError('لم تُحفظ الرسالة أو تعذر توليد الرد. لم يعتبر نماء الإرسال مكتملًا؛ أعد المحاولة.')} finally{setSending(false)} }

  const roomButtons=<div className={styles.roomList}>{rooms.map(room=><button key={room.id} type="button" onClick={()=>chooseRoom(room.id)} className={`${styles.roomItem} ${activeRoom.id===room.id?styles.activeRoom:''}`}><span className={styles.entityAvatar}>{room.title.slice(0,1)}</span><span className={styles.roomCopy}><strong>{room.title}</strong><small>{room.subtitle}</small></span></button>)}</div>;

  const contextCards=<><section className={styles.contextCard}><small>الجهة الحالية</small><strong>{activeRoom.title}</strong><p>{activeRoom.subtitle}</p></section><section className={styles.contextCard}><small>المشاركون الفعليون</small><strong>{participants.length?`${participants.length} اختصاصيين`:'اختصاصيون حسب الموضوع'}</strong><p>{participants.length?participants.map(p=>p.display_name).join('، '):activeRoom.specialists}. لا تُستدعى جميع الجهات تلقائيًا.</p></section><section className={styles.contextCard}><small>حد التنفيذ</small><strong>توصية ومتابعة فقط</strong><p>لا تحويل، لا سداد، ولا إجراء مالي خارجي يُعد منفذًا من المنصة.</p></section></>;

  return <section className={styles.page} dir="rtl" aria-label="محادثات نماء">
    <header className={styles.workspaceHeader}><div className={styles.headingCopy}><span className={styles.eyebrow}>محادثات نماء</span><h1>مركز الحوار والقرار</h1><p>المحادثات محفوظة في حسابك، وتصل رسالتك إلى الجهة والمتخصصين المرتبطين بالموضوع.</p></div><div className={styles.headerActions}><button type="button" className={styles.secondaryButton} onClick={()=>setDesktopRoomsVisible(v=>!v)}><LucideIcon name="layoutGrid" size={16}/><span>{desktopRoomsVisible?'إخفاء الجهات':'إظهار الجهات'}</span></button><button type="button" className={styles.secondaryButton} onClick={()=>setDesktopContextVisible(v=>!v)}><LucideIcon name="info" size={16}/><span>{desktopContextVisible?'إخفاء السياق':'إظهار السياق'}</span></button></div></header>
    <div className={`${styles.workspace} ${desktopRoomsVisible?'':styles.withoutRooms} ${desktopContextVisible?'':styles.withoutContext}`}>
      {desktopRoomsVisible&&<aside className={styles.roomsPane} aria-label="قائمة المحادثات"><div className={styles.paneTitle}><span>الجهات والمحادثات</span><small>{rooms.length} جهات</small></div>{roomButtons}</aside>}
      <main className={styles.chatPane}><header className={styles.chatHeader}><div className={styles.chatIdentity}><span className={styles.entityAvatar}>{activeRoom.title.slice(0,1)}</span><div><div className={styles.entityTitle}><strong>{activeRoom.title}</strong><span>شخصية خوارزمية</span></div><small>{activeRoom.subtitle}</small></div></div><div className={styles.mobileTools}><button type="button" aria-label="فتح الجهات" onClick={()=>setRoomsOpen(true)}><LucideIcon name="messageSquareText" size={20}/></button><button type="button" aria-label="فتح سياق المحادثة" onClick={()=>setContextOpen(true)}><LucideIcon name="info" size={20}/></button></div></header>
        <div className={styles.routingNote}><LucideIcon name="sparkles" size={16}/><span><strong>التوجيه الذكي:</strong> {activeRoom.specialists}.</span></div>
        <div className={styles.messages} aria-live="polite">{loading&&<p>جارٍ تحميل سجل المحادثة…</p>}{!loading&&!messages.length&&<article className={`${styles.message} ${styles.agentMessage}`}><p>هذه بداية محادثتك مع {activeRoom.title}. اكتب سؤالك أو القرار الذي تريد دراسته.</p></article>}{messages.map(message=><article key={message.id} className={`${styles.message} ${message.sender_type==='user'?styles.userMessage:styles.agentMessage}`}>{message.sender_type!=='user'&&<div className={styles.messageIdentity}><span className={styles.miniAvatar}>{message.sender_name.slice(0,1)}</span><span><strong>{message.sender_name}</strong><small>{message.sender_type==='system'?'رسالة نظام':'شخصية خوارزمية'}</small></span></div>}<p>{message.body}</p>{message.message_kind!=='message'&&<section className={`${styles.structuredCard} ${styles[`kind_${message.message_kind}`]}`}><header><strong>{labels[message.message_kind]}</strong></header><StructuredFacts data={message.structured_data}/>{(message.message_kind==='decision'||message.message_kind==='request')&&<small className={styles.executionBoundary}>أي تنفيذ مالي خارجي يظل بيد المستخدم، ويحتاج تأكيدًا وإثباتًا قبل الإغلاق.</small>}</section>}</article>)}</div>
        {error&&<div className={styles.routingNote} role="alert"><LucideIcon name="triangleAlert" size={16}/><span>{error}</span></div>}
        <div className={styles.attachmentPolicy}><LucideIcon name="upload" size={16}/><span>المرفق للمراجعة والتحقق فقط؛ لا ينشئ حركة مالية ولا يثبت التنفيذ تلقائيًا.</span></div><div className={styles.executionNote}><LucideIcon name="circleCheck" size={16}/><span>نماء يوصي ويتابع؛ التنفيذ المالي الخارجي يتم بواسطة المستخدم.</span></div>
        <form className={styles.composer} onSubmit={send}><button type="button" className={styles.attachButton} aria-label="إرفاق ملف" title="الإرفاق سيُفعّل بعد ربط التخزين الآمن"><LucideIcon name="upload" size={20}/></button><textarea value={draft} onChange={e=>setDraft(e.target.value)} placeholder={`اكتب إلى ${activeRoom.title}…`} rows={1} aria-label="نص الرسالة" maxLength={8000}/><button type="submit" className={styles.sendButton} disabled={!draft.trim()||sending}><span>{sending?'جارٍ التحليل…':'إرسال'}</span><LucideIcon name="chevronLeft" size={20}/></button></form>
      </main>
      {desktopContextVisible&&<aside className={styles.contextPane} aria-label="سياق المحادثة"><div className={styles.paneTitle}><span>السياق</span><small>حيّز العمل</small></div>{contextCards}</aside>}
    </div>
    {roomsOpen&&<div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label="الجهات والمحادثات"><button type="button" className={styles.scrim} aria-label="إغلاق" onClick={()=>setRoomsOpen(false)}/><aside className={styles.mobileSheet}><div className={styles.sheetHeader}><strong>الجهات والمحادثات</strong><button type="button" onClick={()=>setRoomsOpen(false)} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button></div>{roomButtons}</aside></div>}
    {contextOpen&&<div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label="سياق المحادثة"><button type="button" className={styles.scrim} aria-label="إغلاق" onClick={()=>setContextOpen(false)}/><aside className={styles.mobileSheet}><div className={styles.sheetHeader}><strong>سياق المحادثة</strong><button type="button" onClick={()=>setContextOpen(false)} aria-label="إغلاق"><LucideIcon name="x" size={20}/></button></div>{contextCards}</aside></div>}
  </section>;
}
