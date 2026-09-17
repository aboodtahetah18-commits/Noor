import fs from 'node:fs';

const root='apps/namaa-final-ui';
const workspacePath=`${root}/src/components/ConversationWorkspace.tsx`;
const cssPath=`${root}/src/app/globals.css`;
for(const file of [workspacePath,cssPath]) if(!fs.existsSync(file)) throw new Error(`Missing conversation surface target: ${file}`);

function replaceOnce(source,from,to,label){
  if(!source.includes(from)) throw new Error(`Conversation surface target missing: ${label}`);
  return source.replace(from,to);
}

let source=fs.readFileSync(workspacePath,'utf8');

const helpers=`\nfunction structuredMessageKind(message:Message){\n  const payload=message.structured_payload??{};\n  const raw=[message.message_type,payload.type,payload.kind,payload.category,payload.status].filter(Boolean).join(' ').toLowerCase();\n  if(raw.includes('risk')||raw.includes('مخاطر')||raw.includes('risk_')) return 'risk';\n  if(raw.includes('decision')||raw.includes('قرار')||raw.includes('approval')) return 'decision';\n  if(raw.includes('recommend')||raw.includes('توص')) return 'recommendation';\n  if(raw.includes('follow')||raw.includes('journey')||raw.includes('متابع')) return 'followup';\n  if(raw.includes('request')||raw.includes('طلب')||raw.includes('action')) return 'request';\n  return 'message';\n}\n\nfunction structuredMessageLabel(kind:string){\n  if(kind==='risk') return 'تقييم مخاطر';\n  if(kind==='decision') return 'قرار / اعتماد';\n  if(kind==='recommendation') return 'توصية';\n  if(kind==='followup') return 'متابعة';\n  if(kind==='request') return 'طلب إجراء';\n  return '';\n}\n\nfunction factValue(value:unknown){\n  if(value===null||value===undefined||value==='') return null;\n  if(typeof value==='boolean') return value?'نعم':'لا';\n  if(typeof value==='number'||typeof value==='string') return String(value);\n  return null;\n}\n`;
source=replaceOnce(source,'const quickPrompts=[',helpers+'\nconst quickPrompts=[','structured message helpers');

source=replaceOnce(
  source,
  `<span className="avatar">{agentName.slice(0,1)}</span>\n          <div>\n            <strong>{agentName}</strong>\n            <small>{threadTitle||'محادثة جديدة'} • خوارزمية مالية</small>\n          </div>`,
  `<span className={\`avatar conversation-entity-avatar avatar-\${effectiveRoomMeta.kind}\`} aria-hidden="true">{agentName.slice(0,1)}</span>\n          <div className="conversation-entity-copy">\n            <div className="conversation-entity-title"><strong>{agentName}</strong><span className="algorithmic-role">شخصية خوارزمية</span></div>\n            <small>{threadTitle||'محادثة جديدة'} • {effectiveRoomMeta.label}</small>\n          </div>`,
  'conversation header identity',
);

source=replaceOnce(
  source,
  `<article className={\`msg \${m.sender_type==='USER'?'user':'agent'}\`} key={m.id}>`,
  `<article className={\`msg \${m.sender_type==='USER'?'user':'agent'} structured-\${structuredMessageKind(m)}\`} key={m.id} data-message-kind={structuredMessageKind(m)}>`,
  'message semantic class',
);

source=replaceOnce(
  source,
  `{m.sender_type==='AGENT' && m.agent_name && <b>{m.agent_name}</b>}\n              {m.sender_type==='SYSTEM' && <b>نماء</b>}\n              <p>{m.body}</p>`,
  `{m.sender_type==='AGENT' && m.agent_name && <div className="message-agent-identity"><span className="message-agent-avatar" aria-hidden="true">{m.agent_name.slice(0,1)}</span><span><b>{m.agent_name}</b><small>شخصية خوارزمية</small></span></div>}\n              {m.sender_type==='SYSTEM' && <div className="message-agent-identity system"><span className="message-agent-avatar" aria-hidden="true">ن</span><span><b>نماء</b><small>رسالة نظام</small></span></div>}\n              <p>{m.body}</p>\n\n              {structuredMessageKind(m)!=='message' && <section className={\`message-structured-card kind-\${structuredMessageKind(m)}\`} aria-label={structuredMessageLabel(structuredMessageKind(m))}>\n                <header><span>{structuredMessageLabel(structuredMessageKind(m))}</span>{factValue(m.structured_payload?.status)&&<strong>{factValue(m.structured_payload?.status)}</strong>}</header>\n                <div className="message-facts">\n                  {factValue(m.structured_payload?.confidence)&&<span><small>الثقة</small><b>{factValue(m.structured_payload?.confidence)}</b></span>}\n                  {factValue(m.structured_payload?.risk_level)&&<span><small>المخاطر</small><b>{factValue(m.structured_payload?.risk_level)}</b></span>}\n                  {factValue(m.structured_payload?.amount)&&<span><small>المبلغ</small><b>{factValue(m.structured_payload?.amount)}</b></span>}\n                  {factValue(m.structured_payload?.percentage)&&<span><small>النسبة</small><b>{factValue(m.structured_payload?.percentage)}</b></span>}\n                  {factValue(m.structured_payload?.due_date)&&<span><small>التاريخ</small><b>{factValue(m.structured_payload?.due_date)}</b></span>}\n                </div>\n                {factValue(m.structured_payload?.reason)&&<p className="message-structured-reason"><strong>السبب:</strong> {factValue(m.structured_payload?.reason)}</p>}\n                {factValue(m.structured_payload?.next_action)&&<p className="message-structured-next"><strong>الخطوة التالية:</strong> {factValue(m.structured_payload?.next_action)}</p>}\n                {(structuredMessageKind(m)==='decision'||structuredMessageKind(m)==='request')&&<small className="message-human-execution">أي تنفيذ مالي خارجي يظل بيد المستخدم، ويحتاج إثباتًا قبل الإغلاق.</small>}\n              </section>}`,
  'message identity and structured cards',
);

source=replaceOnce(
  source,
  `{m.structured_payload?.journey_id &&\n                <span className="message-state">تم فتح مسار متابعة</span>}`,
  `{m.structured_payload?.journey_id &&\n                <span className="message-state governed-followup-state"><Icon name="verify" size={13}/><span>مسار متابعة مفتوح</span></span>}`,
  'followup state',
);

source=replaceOnce(
  source,
  `<div className="attachment-card" key={a.id}>\n                  <span className="attachment-card-icon"><Icon name="files" size={18}/></span>\n                  <div>\n                    <strong>{a.file_name}</strong>\n                    <small>{a.status}</small>\n                  </div>\n                </div>`,
  `<div className="attachment-card governed-attachment-card" key={a.id}>\n                  <span className="attachment-card-icon"><Icon name="files" size={18}/></span>\n                  <div className="attachment-card-copy">\n                    <strong>{a.file_name}</strong>\n                    <span className="attachment-status"><Icon name="verify" size={12}/>{a.status}</span>\n                    <small>مرفق للمراجعة والتحقق؛ لا يُحوّل إلى حركة مالية بمجرد رفعه.</small>\n                  </div>\n                </div>`,
  'governed attachment card',
);

source=replaceOnce(
  source,
  `<div className="composer-stack">\n        <form className="composer refined-composer" onSubmit={send}>`,
  `<div className="composer-stack">\n        <div className="conversation-execution-note"><Icon name="verify" size={14}/><span>نماء يوصي ويتابع؛ التنفيذ المالي الخارجي يتم بواسطة المستخدم.</span></div>\n        <form className="composer refined-composer" onSubmit={send}>`,
  'composer execution note',
);

source=replaceOnce(
  source,
  `<div className="context-card">\n        <span>الرسائل</span>\n        <b>توجيه ذكي</b>\n        <small>للمستشار أو البنك المختص حسب الموضوع.</small>\n      </div>`,
  `<div className="context-card context-entity-card">\n        <span>الجهة الحالية</span>\n        <b>{effectiveRoomMeta.label}</b>\n        <small>{agentName} • شخصية خوارزمية ضمن اختصاصها.</small>\n      </div>\n\n      <div className="context-card">\n        <span>الرسائل</span>\n        <b>توجيه ذكي</b>\n        <small>للمستشار أو البنك المختص حسب الموضوع، دون استدعاء جميع الجهات تلقائيًا.</small>\n      </div>`,
  'context entity card',
);

fs.writeFileSync(workspacePath,source,'utf8');

let css=fs.readFileSync(cssPath,'utf8');
const marker='/* Namaa governed conversation surface contract */';
if(css.includes(marker)) throw new Error('Governed conversation surface contract unexpectedly already exists');
css+=`\n\n${marker}\n.conversation-entity-copy{min-width:0}.conversation-entity-title{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.algorithmic-role{font-size:9px;font-weight:800;color:var(--namaa-green-900);border:1px solid var(--namaa-border);background:var(--namaa-surface-2);border-radius:999px;padding:2px 6px}.conversation-entity-avatar{border:1px solid var(--namaa-border-strong)}.conversation-entity-avatar.avatar-advisor{background:color-mix(in srgb,var(--namaa-gold-500) 13%,var(--namaa-surface))}.conversation-entity-avatar.avatar-bank,.conversation-entity-avatar.avatar-governor{background:color-mix(in srgb,var(--namaa-green-700) 10%,var(--namaa-surface))}\n.message-agent-identity{display:flex;align-items:center;gap:7px;margin-bottom:7px}.message-agent-avatar{width:28px;height:28px;flex:0 0 28px;border-radius:9px;display:grid;place-items:center;background:color-mix(in srgb,var(--namaa-green-700) 9%,var(--namaa-surface));border:1px solid var(--namaa-border);color:var(--namaa-green-900);font-size:11px;font-weight:900}.message-agent-identity>span:last-child{display:grid;gap:1px}.message-agent-identity b{font-size:11px}.message-agent-identity small{font-size:8px;color:var(--namaa-muted)}\n.message-structured-card{margin-top:9px;border:1px solid var(--namaa-border);border-radius:14px;background:var(--namaa-surface);padding:10px;display:grid;gap:8px}.message-structured-card>header{display:flex;justify-content:space-between;align-items:center;gap:8px}.message-structured-card>header>span{font-size:10px;font-weight:900;color:var(--namaa-green-900)}.message-structured-card>header>strong{font-size:9px;border-radius:999px;padding:3px 7px;background:var(--namaa-surface-2);color:var(--namaa-text)}.message-structured-card.kind-risk{border-inline-start:3px solid var(--namaa-gold-500)}.message-structured-card.kind-decision{border-inline-start:3px solid var(--namaa-green-700)}.message-structured-card.kind-recommendation{border-inline-start:3px solid var(--namaa-green-500)}.message-facts{display:flex;gap:6px;flex-wrap:wrap}.message-facts>span{min-width:82px;display:grid;gap:2px;padding:7px 8px;border:1px solid var(--namaa-border);border-radius:10px;background:var(--namaa-surface-2)}.message-facts small{font-size:8px;color:var(--namaa-muted)}.message-facts b{font-size:10px;color:var(--namaa-text-strong)}.message-structured-reason,.message-structured-next{margin:0!important;font-size:10px!important;line-height:1.6!important}.message-human-execution{display:block;padding-top:7px;border-top:1px solid var(--namaa-border);font-size:8px!important;line-height:1.55;color:var(--namaa-muted)}\n.governed-followup-state{display:inline-flex!important;align-items:center;gap:4px}.governed-attachment-card{align-items:flex-start}.attachment-card-copy{min-width:0;display:grid;gap:3px}.attachment-status{width:max-content;max-width:100%;display:inline-flex;align-items:center;gap:4px;border:1px solid var(--namaa-border);border-radius:999px;padding:2px 6px;color:var(--namaa-green-900);background:var(--namaa-surface-2);font-size:8px;font-weight:800}.governed-attachment-card .attachment-card-copy>small{white-space:normal;font-size:8px;line-height:1.45;color:var(--namaa-muted)}\n.conversation-execution-note{margin:0 12px 7px;display:flex;align-items:center;justify-content:center;gap:5px;color:var(--namaa-muted);font-size:8px;line-height:1.4}.conversation-execution-note .namaa-icon{color:var(--namaa-green-700)}.context-entity-card{border-color:color-mix(in srgb,var(--namaa-green-700) 24%,var(--namaa-border))}\n@media(max-width:767px){.conversation-entity-title{gap:5px}.algorithmic-role{font-size:8px}.message-structured-card{border-radius:12px;padding:9px}.message-facts>span{min-width:72px;flex:1 1 72px}.conversation-execution-note{margin-inline:10px}.governed-attachment-card .attachment-card-copy>small{display:block}.message-agent-avatar{width:26px;height:26px;flex-basis:26px}}\n`;
fs.writeFileSync(cssPath,css,'utf8');
console.log('Applied governed Namaa conversation identity, structured cards, attachments and execution states.');
