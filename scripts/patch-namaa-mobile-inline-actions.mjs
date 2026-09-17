import fs from 'node:fs';

const root='apps/namaa-final-ui';
function replaceOnce(path,from,to){
  const full=`${root}/${path}`;
  const before=fs.readFileSync(full,'utf8');
  if(!before.includes(from)) throw new Error(`Expected inline-action target not found: ${path}`);
  fs.writeFileSync(full,before.replace(from,to),'utf8');
}

// Reuse the existing attachment review flow inside the conversation rather than
// introducing a second confirmation path.
replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  "import { AttachmentUploader } from './AttachmentUploader';",
  "import { AttachmentUploader } from './AttachmentUploader';\nimport { AttachmentDraftReview } from './AttachmentDraftReview';",
);

replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  `const quickPrompts=[\n  'راجع ميزانيتي',\n  'اعرض حساباتي',\n  'راجع الالتزامات',\n  'افتح هدفًا ماليًا',\n];`,
  `const quickPrompts=[\n  'راجع ميزانيتي',\n  'اعرض حساباتي',\n  'راجع الالتزامات',\n  'افتح هدفًا ماليًا',\n];\n\ntype InlineActionField={key:string;label:string;placeholder?:string;required?:boolean};\ntype InlineAction={\n  kind?:string;\n  title?:string;\n  description?:string;\n  fields?:InlineActionField[];\n  allow_attachment?:boolean;\n  followup_href?:string;\n};\n\nfunction StructuredActionCard({\n  message,threadId,pending,onSubmit,onReload\n}:{\n  message:Message;\n  threadId:string|null;\n  pending:boolean;\n  onSubmit:(title:string,details:Array<[string,string]>)=>Promise<void>;\n  onReload:()=>void;\n}){\n  const action=(message.structured_payload?.ui_action??null) as InlineAction|null;\n  if(!action) return null;\n  const fields=Array.isArray(action.fields)?action.fields:[];\n  const title=action.title??'المطلوب الآن';\n\n  return <section className={\`inline-chat-action action-\${String(action.kind??'followup').toLowerCase()}\`}>\n    <header>\n      <span><Icon name=\"chat\" size={17}/></span>\n      <div><strong>{title}</strong>{action.description&&<small>{action.description}</small>}</div>\n    </header>\n\n    {fields.length>0 && <form onSubmit={event=>{\n      event.preventDefault();\n      const data=new FormData(event.currentTarget);\n      const details=fields\n        .map(field=>[field.label,String(data.get(field.key)??'').trim()] as [string,string])\n        .filter(([,value])=>Boolean(value));\n      if(details.length) void onSubmit(title,details);\n    }}>\n      <div className=\"inline-chat-fields\">\n        {fields.map(field=><label key={field.key}>\n          <span>{field.label}</span>\n          <input name={field.key} placeholder={field.placeholder??''} required={Boolean(field.required)} disabled={pending}/>
        </label>)}\n      </div>\n      <button type=\"submit\" className=\"inline-chat-primary\" disabled={pending}>\n        <Icon name=\"send\" size={16}/><span>{pending?'جاري الإرسال...':'إرسال البيانات في المحادثة'}</span>\n      </button>\n    </form>}\n\n    {action.allow_attachment&&threadId&&<div className=\"inline-chat-upload\">\n      <div><strong>إرفاق مستند أو إثبات</strong><small>يمر الملف بالاستخراج والمراجعة قبل استخدام بياناته.</small></div>\n      <AttachmentUploader compact threadId={threadId} onDone={onReload}/>\n    </div>}\n\n    {action.followup_href&&<a className=\"inline-chat-followup\" href={action.followup_href}>\n      <Icon name=\"decisions\" size={16}/><span>فتح المتابعة</span>\n    </a>}\n\n    <p className=\"inline-chat-safety\"><Icon name=\"verify\" size={14}/> لا ينفذ هذا النموذج أي تحويل أو سداد أو استثمار تلقائيًا.</p>\n  </section>;\n}`,
);

replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  `  function useQuickPrompt(text:string){\n    if(inputRef.current){\n      inputRef.current.value=text;\n      inputRef.current.focus();\n    }\n  }`,
  `  function useQuickPrompt(text:string){\n    if(inputRef.current){\n      inputRef.current.value=text;\n      inputRef.current.focus();\n    }\n  }\n\n  async function sendStructuredDetails(title:string,details:Array<[string,string]>){\n    if(pending||!details.length) return;\n    setPending(true);\n    setError('');\n    try{\n      const id=await ensureThread();\n      const body=[title,...details.map(([label,value])=>\`${label}: \${value}\`)].join('\\n');\n      const r=await fetch(\`/api/conversations/\${id}/messages\`,{\n        method:'POST',\n        headers:{'content-type':'application/json'},\n        body:JSON.stringify({body})\n      });\n      const d=await r.json();\n      if(!r.ok) throw new Error(d.error??'تعذر إرسال البيانات');\n      await load(id);\n    }catch(err){\n      setError(err instanceof Error?err.message:'تعذر إرسال البيانات');\n    }finally{\n      setPending(false);\n    }\n  }`,
);

replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  `              {m.structured_payload?.journey_id &&\n                <span className=\"message-state\">تم فتح مسار متابعة</span>}\n\n              {(m.attachments??[]).map((a:any)=>\n                <div className=\"attachment-card\" key={a.id}>\n                  <span className=\"attachment-card-icon\"><Icon name=\"files\" size={18}/></span>\n                  <div>\n                    <strong>{a.file_name}</strong>\n                    <small>{a.status}</small>\n                  </div>\n                </div>\n              )}`,
  `              {m.structured_payload?.journey_id &&\n                <span className=\"message-state\">تم فتح مسار متابعة</span>}\n\n              <StructuredActionCard\n                message={m}\n                threadId={threadId}\n                pending={pending}\n                onSubmit={sendStructuredDetails}\n                onReload={()=>threadId?void load(threadId):undefined}\n              />\n\n              {(m.attachments??[]).map((a:any)=>\n                <div className=\"inline-attachment-stack\" key={a.id}>\n                  <div className=\"attachment-card\">\n                    <span className=\"attachment-card-icon\"><Icon name=\"files\" size={18}/></span>\n                    <div>\n                      <strong>{a.file_name}</strong>\n                      <small>{a.status}</small>\n                    </div>\n                  </div>\n                  {a.status==='AWAITING_CONFIRMATION'&&<AttachmentDraftReview attachment={a}/>}\n                </div>\n              )}`,
);

// The routing acknowledgement is the authoritative source for which inline
// intake action should appear. The schema only collects user-provided facts;
// it never commits financial state.
replaceOnce(
  'src/app/api/conversations/[threadId]/messages/route.ts',
  `import { jsonError } from '@/lib/http/errors';`,
  `import { jsonError } from '@/lib/http/errors';\n\nfunction inlineActionForIntent(intent:ReturnType<typeof routeMessage>['intent']){\n  switch(intent){\n    case 'EMERGENCY': return {kind:'DATA_REQUEST',title:'بيانات الحالة الاستثنائية',description:'أكمل الوقائع الأساسية قبل أي تحليل أو توصية.',fields:[{key:'reason',label:'سبب الحالة',required:true},{key:'amount',label:'المبلغ التقريبي'},{key:'needed_by',label:'متى تحتاجه؟'}],allow_attachment:true,followup_href:'/decisions'};\n    case 'EXECUTION': return {kind:'EVIDENCE_REQUEST',title:'إثبات التنفيذ الخارجي',description:'لن يغلق نماء الإجراء قبل استلام الإثبات والتحقق منه.',fields:[{key:'action',label:'ما الذي نفذته؟',required:true},{key:'date',label:'تاريخ التنفيذ'},{key:'reference',label:'المرجع أو الملاحظة'}],allow_attachment:true,followup_href:'/decisions'};\n    case 'FILE': return {kind:'ATTACHMENT_REQUEST',title:'إرسال الملف',description:'ارفع الملف هنا ليبدأ الاستخراج كمسودة قابلة للمراجعة.',fields:[],allow_attachment:true,followup_href:'/files'};\n    case 'MEETING': return {kind:'MEETING_REQUEST',title:'تفاصيل الاجتماع أو اللجنة',description:'أرسل المعلومات الأساسية ليتم توجيهها لمسار الاجتماعات والحوكمة.',fields:[{key:'subject',label:'الموضوع',required:true},{key:'participants',label:'الأعضاء أو الجهات'},{key:'timing',label:'الوقت المقترح'}],allow_attachment:true,followup_href:'/meetings'};\n    case 'BUDGET': return {kind:'DATA_REQUEST',title:'بيانات مراجعة الميزانية',description:'أرسل التفاصيل التي تريد مراجعتها داخل نفس المحادثة.',fields:[{key:'category',label:'البند أو الفئة',required:true},{key:'amount',label:'المبلغ'},{key:'period',label:'الفترة'}],allow_attachment:true,followup_href:'/budget'};\n    case 'OBLIGATION': return {kind:'DATA_REQUEST',title:'بيانات الالتزام',description:'أرسل تفاصيل الالتزام والاستحقاق للمراجعة.',fields:[{key:'obligation',label:'نوع الالتزام',required:true},{key:'amount',label:'المبلغ'},{key:'due',label:'تاريخ الاستحقاق'}],allow_attachment:true,followup_href:'/decisions'};\n    case 'GOAL': return {kind:'DATA_REQUEST',title:'تفاصيل الهدف المالي',description:'عرّف الهدف والزمن والقيمة التي تستهدفها.',fields:[{key:'goal',label:'الهدف',required:true},{key:'target',label:'القيمة المستهدفة'},{key:'date',label:'التاريخ المستهدف'}],allow_attachment:false,followup_href:'/budget'};\n    case 'INVESTMENT': return {kind:'DATA_REQUEST',title:'بيانات طلب الاستثمار',description:'هذه البيانات للتحليل فقط ولا تنفذ استثمارًا تلقائيًا.',fields:[{key:'objective',label:'الهدف الاستثماري',required:true},{key:'horizon',label:'المدة'},{key:'liquidity',label:'احتياج السيولة'}],allow_attachment:true,followup_href:'/advisor'};\n    default: return null;\n  }\n}`,
);

replaceOnce(
  'src/app/api/conversations/[threadId]/messages/route.ts',
  `        analytical_response_pending:true\n      }`,
  `        analytical_response_pending:true,\n        ui_action:inlineActionForIntent(routing.intent)\n      }`,
);

const globalsPath=`${root}/src/app/globals.css`;
const css=fs.readFileSync(globalsPath,'utf8');
const marker='/* Namaa mobile inline conversation actions contract */';
if(css.includes(marker)) throw new Error('Inline conversation actions contract unexpectedly already exists');
fs.appendFileSync(globalsPath,`\n\n${marker}\n
.inline-chat-action{margin-top:10px;padding:11px;border:1px solid var(--namaa-border);border-radius:14px;background:var(--namaa-surface-2);display:grid;gap:10px}
.inline-chat-action>header{display:flex;gap:8px;align-items:flex-start}.inline-chat-action>header>span{width:30px;height:30px;display:grid;place-items:center;border-radius:10px;background:color-mix(in srgb,var(--namaa-green-700) 10%,var(--namaa-surface));color:var(--namaa-green-900)}
.inline-chat-action>header>div{min-width:0;display:grid;gap:2px}.inline-chat-action>header strong{font-size:12px;color:var(--namaa-text-strong)}.inline-chat-action>header small{font-size:10px;line-height:1.45;color:var(--namaa-muted)}
.inline-chat-fields{display:grid;gap:8px}.inline-chat-fields label{display:grid;gap:4px}.inline-chat-fields label>span{font-size:10px;font-weight:800;color:var(--namaa-text)}.inline-chat-fields input{width:100%;min-height:40px!important;border:1px solid var(--namaa-border)!important;border-radius:11px!important;background:var(--namaa-surface)!important;padding:8px 10px!important;font:inherit;color:var(--namaa-text)!important;box-shadow:none!important}
.inline-chat-primary,.inline-chat-followup{min-height:40px;border-radius:11px;border:1px solid var(--namaa-green-700);background:var(--namaa-green-700);color:white;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:6px;padding:7px 10px;font:inherit;font-size:11px;font-weight:800}.inline-chat-followup{background:transparent;color:var(--namaa-green-900);border-color:var(--namaa-border)}
.inline-chat-upload{display:grid;gap:7px;padding-top:8px;border-top:1px solid var(--namaa-border)}.inline-chat-upload>div{display:grid;gap:2px}.inline-chat-upload strong{font-size:11px}.inline-chat-upload small{font-size:9px;color:var(--namaa-muted);line-height:1.4}
.inline-chat-safety{margin:0!important;display:flex;align-items:flex-start;gap:5px;font-size:9px!important;line-height:1.45!important;color:var(--namaa-muted)!important}.inline-chat-safety .namaa-icon{flex:0 0 auto;margin-top:1px;color:var(--namaa-green-700)}
.inline-attachment-stack{display:grid;gap:8px;margin-top:8px}.inline-attachment-stack .draft-review{margin:0;padding:10px;border-radius:14px}.inline-attachment-stack .draft-review-head{gap:8px}.inline-attachment-stack .draft-review textarea{max-height:180px}
@media(max-width:767px){.inline-chat-action{border-radius:13px;padding:10px}.inline-chat-fields{grid-template-columns:1fr}.inline-chat-primary,.inline-chat-followup{width:100%}}
`,'utf8');

console.log('Applied Namaa inline data, evidence, attachment, and review actions inside chat.');
