import fs from 'node:fs';

const root='apps/namaa-final-ui';
function replaceOnce(path,from,to){
  const full=`${root}/${path}`;
  const before=fs.readFileSync(full,'utf8');
  if(!before.includes(from)) throw new Error(`Expected governance-room target not found: ${path}`);
  fs.writeFileSync(full,before.replace(from,to),'utf8');
}

replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  "import { Icon } from './Icon';",
  "import { Icon, type IconName } from './Icon';"
);

replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  'function StructuredActionCard({',
  String.raw`type GovernanceRoom={
  key:'supreme'|'standing'|'temporary'|'emergency';
  title:string;
  subtitle:string;
  coordinatorCode:string;
  prompt:string;
  icon:IconName;
};

const governanceRooms:GovernanceRoom[]=[
  {key:'supreme',title:'مجلس نماء الأعلى',subtitle:'مجلس دائم • تهيئة وجدول أعمال ومحضر ومتابعة',coordinatorCode:'SECRETARY',prompt:'أريد فتح موضوع لاجتماع مجلس نماء الأعلى',icon:'meetings'},
  {key:'standing',title:'اللجان الدائمة',subtitle:'لجان مستمرة • نطاق وسجل مستقلان',coordinatorCode:'SECRETARY',prompt:'أريد فتح موضوع للجنة دائمة وتحديد نطاقها',icon:'minutes'},
  {key:'temporary',title:'اللجان المؤقتة',subtitle:'غرفة تهيئة لموضوع محدد حتى إغلاق الغرض',coordinatorCode:'SECRETARY',prompt:'أريد تشكيل لجنة مؤقتة لموضوع محدد',icon:'risk'},
  {key:'emergency',title:'لجنة الطوارئ',subtitle:'مسار جماعي للحالات الاستثنائية متعددة الأعضاء',coordinatorCode:'SECRETARY',prompt:'أريد عرض حالة على لجنة الطوارئ',icon:'alerts'},
];

function StructuredActionCard({`
);

replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  "  const [mobileInbox,setMobileInbox]=useState(!initialThreadId && !initialAgentCode);",
  "  const [mobileInbox,setMobileInbox]=useState(!initialThreadId && !initialAgentCode);\n  const [governanceRoom,setGovernanceRoom]=useState<GovernanceRoom|null>(null);"
);

replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  "      setAgentName(d.thread?.primary_agent_name??'المحافظ');\n      setMobileInbox(false);",
  "      setAgentName(d.thread?.primary_agent_name??'المحافظ');\n      setGovernanceRoom(governanceRooms.find(room=>room.title===(d.thread?.title??''))??null);\n      setMobileInbox(false);"
);

replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  "    setNewThreadAgentCode(agent.agent_code);\n    setError('');",
  "    setNewThreadAgentCode(agent.agent_code);\n    setGovernanceRoom(null);\n    setError('');"
);

replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  "  async function ensureThread(){",
  String.raw`  function openGovernanceRoom(room:GovernanceRoom){
    const coordinator=agents.find(agent=>agent.agent_code===room.coordinatorCode)??agents.find(agent=>agent.agent_code==='GOVERNOR')??null;
    setThreadId(null);
    setMessages([]);
    setThreadTitle(room.title);
    setAgentName(coordinator?.display_name??'أمين السر');
    setNewThreadAgentCode(coordinator?.agent_code??'GOVERNOR');
    setGovernanceRoom(room);
    setError('');
    setMobileInbox(false);
    window.setTimeout(()=>{
      if(inputRef.current){
        inputRef.current.value=room.prompt;
        inputRef.current.focus();
      }
    },0);
  }

  async function ensureThread(){`
);

replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  "      body:JSON.stringify({agentCode:newThreadAgentCode,title:'المحادثة الرئيسية'})",
  "      body:JSON.stringify({agentCode:newThreadAgentCode,title:governanceRoom?.title??'المحادثة الرئيسية'})"
);

replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  "    setNewThreadAgentCode('GOVERNOR');\n    setError('');",
  "    setNewThreadAgentCode('GOVERNOR');\n    setGovernanceRoom(null);\n    setError('');"
);

replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  String.raw`      <section className="mobile-inbox-section">
        <header><strong>المجالس والمجموعات</strong><span>2</span></header>
        <div className="mobile-contact-list">
          <a className="mobile-contact-row" href="/meetings"><span className="mobile-contact-avatar governance"><Icon name="meetings" size={20}/></span><span className="mobile-contact-copy"><b>مجلس نماء واللجان</b><small>الاجتماعات، اللجان، المحاضر والمتابعة</small></span><Icon name="chevron" size={17}/></a>
          <a className="mobile-contact-row" href="/central-bank"><span className="mobile-contact-avatar governance"><Icon name="banks" size={20}/></span><span className="mobile-contact-copy"><b>مجلس نماء المركزي</b><small>الاستقرار والتنسيق بين البنوك</small></span><Icon name="chevron" size={17}/></a>
        </div>
      </section>`,
  String.raw`      <section className="mobile-inbox-section governance-room-directory">
        <header><strong>المجالس والمجموعات</strong><span>{governanceRooms.length}</span></header>
        <div className="mobile-contact-list">
          {governanceRooms.map(room=><button type="button" className="mobile-contact-row governance-room-row" key={room.key} onClick={()=>openGovernanceRoom(room)}>
            <span className="mobile-contact-avatar governance"><Icon name={room.icon} size={20}/></span>
            <span className="mobile-contact-copy"><b>{room.title}</b><small>{room.subtitle}</small></span>
            <Icon name="chat" size={17}/>
          </button>)}
        </div>
        <p className="governance-directory-note"><Icon name="verify" size={13}/> هذه غرف تهيئة حوكمية؛ لا تعني وجود اجتماع أو تصويت منشأ قبل تسجيله فعليًا.</p>
      </section>`
);

replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  String.raw`      <div className="messages" aria-live="polite" aria-busy={loading}>`,
  String.raw`      {governanceRoom&&<section className="governance-chat-context" aria-label="سياق غرفة الحوكمة">
        <div className="governance-chat-context-head">
          <span className="governance-chat-context-icon"><Icon name={governanceRoom.icon} size={18}/></span>
          <div><strong>{governanceRoom.title}</strong><small>أمين السر منسق الغرفة • {agents.length} دورًا خوارزميًا متاحًا للنظر حسب الاختصاص</small></div>
          <span className="governance-room-state">تهيئة</span>
        </div>
        <div className="governance-room-tools" aria-label="أدوات الغرفة">
          <button type="button" onClick={()=>useQuickPrompt('أضف بندًا إلى جدول أعمال '+governanceRoom.title)}><Icon name="files" size={14}/> الأجندة</button>
          <button type="button" onClick={()=>useQuickPrompt('اعرض حالة محضر '+governanceRoom.title)}><Icon name="minutes" size={14}/> المحضر</button>
          <button type="button" onClick={()=>useQuickPrompt('اعرض القرارات والمهام والمتابعة في '+governanceRoom.title)}><Icon name="decisions" size={14}/> القرارات والمهام</button>
        </div>
        <p><Icon name="verify" size={13}/> التصويت لا يساوي الاعتماد، والاعتماد لا يساوي التنفيذ الخارجي أو إثباته.</p>
      </section>}

      <div className="messages" aria-live="polite" aria-busy={loading}>`
);

replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  "        {!loading && messages.length===0 && <>",
  String.raw`        {!loading && messages.length===0 && governanceRoom && <>
          <div className="msg agent welcome-message governance-welcome">
            <div>
              <b>{governanceRoom.title}</b>
              <p>الغرفة جاهزة لاستقبال الموضوع وتحديد المشاركين وجدول الأعمال. لا يوجد اجتماع فعلي أو تصويت مسجل حتى ترسل طلبك وتُنشأ البيانات من المصدر الحقيقي.</p>
            </div>
          </div>
          <div className="governance-lifecycle" aria-label="دورة الاجتماع">
            {['جدول الأعمال','المداولة','التصويت','الاعتماد','المحضر','المتابعة'].map((stage,index)=><span key={stage}><em>{index+1}</em>{stage}</span>)}
          </div>
        </>}

        {!loading && messages.length===0 && !governanceRoom && <>`
);

const globalsPath=`${root}/src/app/globals.css`;
const css=fs.readFileSync(globalsPath,'utf8');
const marker='/* Namaa mobile governance group rooms contract */';
if(css.includes(marker)) throw new Error('Governance group rooms contract unexpectedly already exists');
fs.appendFileSync(globalsPath,String.raw`

/* Namaa mobile governance group rooms contract */
.governance-chat-context{display:none}
@media(max-width:767px){
  .governance-room-directory{padding-bottom:4px}
  .governance-room-row{cursor:pointer}
  .governance-directory-note{margin:8px 4px 0;display:flex;gap:5px;align-items:flex-start;color:var(--namaa-muted);font-size:9px;line-height:1.5}
  .governance-directory-note .namaa-icon{flex:0 0 auto;margin-top:1px;color:var(--namaa-green-700)}
  .governance-chat-context{display:grid;gap:9px;padding:10px 12px;border-bottom:1px solid var(--namaa-border);background:var(--namaa-surface-2)}
  .governance-chat-context-head{display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:8px;align-items:center}
  .governance-chat-context-icon{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;border:1px solid var(--namaa-border);background:var(--namaa-surface);color:var(--namaa-green-900)}
  .governance-chat-context-head>div{min-width:0;display:grid;gap:2px}.governance-chat-context-head strong{font-size:12px;color:var(--namaa-text-strong)}.governance-chat-context-head small{font-size:9px;line-height:1.35;color:var(--namaa-muted)}
  .governance-room-state{font-size:9px;font-weight:900;border:1px solid var(--namaa-border);border-radius:999px;padding:3px 7px;color:var(--namaa-green-900);background:var(--namaa-surface)}
  .governance-room-tools{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.governance-room-tools button{min-width:0;min-height:36px;border:1px solid var(--namaa-border);border-radius:10px;background:var(--namaa-surface);color:var(--namaa-text);font:inherit;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:4px;padding:5px 6px}
  .governance-chat-context>p{margin:0;display:flex;align-items:flex-start;gap:5px;font-size:9px;line-height:1.45;color:var(--namaa-muted)}.governance-chat-context>p .namaa-icon{flex:0 0 auto;margin-top:1px;color:var(--namaa-green-700)}
  .governance-welcome{margin-top:2px}.governance-lifecycle{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:8px 0 4px}.governance-lifecycle span{min-width:0;border:1px solid var(--namaa-border);border-radius:10px;background:var(--namaa-surface-2);padding:6px;display:flex;align-items:center;gap:5px;font-size:9px;color:var(--namaa-text)}.governance-lifecycle em{width:19px;height:19px;flex:0 0 19px;border-radius:50%;display:grid;place-items:center;background:var(--namaa-green-700);color:white;font-style:normal;font-weight:900;font-size:8px}
}
@media(max-width:360px){
  .governance-room-tools{grid-template-columns:1fr 1fr}.governance-room-tools button:last-child{grid-column:1/-1}.governance-lifecycle{grid-template-columns:1fr 1fr}
}
`);

console.log('Applied Namaa mobile governance group rooms and in-room workflow context.');
