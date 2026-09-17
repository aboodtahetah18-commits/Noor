import fs from 'node:fs';

const root='apps/namaa-final-ui';
const pagePath=`${root}/src/app/page.tsx`;
const workspacePath=`${root}/src/components/ConversationWorkspace.tsx`;
const cssPath=`${root}/src/app/globals.css`;
for(const file of [pagePath,workspacePath,cssPath]) if(!fs.existsSync(file)) throw new Error(`Missing governance-group target: ${file}`);

function replaceRequired(source,from,to,label){
  if(!source.includes(from)) throw new Error(`Expected governance-group target not found: ${label}`);
  return source.replace(from,to);
}

let page=fs.readFileSync(pagePath,'utf8');
page=replaceRequired(
  page,
  '  searchParams?:Promise<{agent?:string}>;',
  '  searchParams?:Promise<{agent?:string;group?:string}>;',
  'page search params',
);
page=replaceRequired(
  page,
  "  const initialAgentCode=typeof params.agent==='string'?params.agent:null;",
  "  const initialAgentCode=typeof params.agent==='string'?params.agent:null;\n  const initialGovernanceGroup=typeof params.group==='string'?params.group:null;",
  'initial governance group',
);
page=replaceRequired(
  page,
  '      initialAgentCode={initialAgentCode}',
  '      initialAgentCode={initialAgentCode}\n      initialGovernanceGroup={initialGovernanceGroup}',
  'group prop binding',
);
fs.writeFileSync(pagePath,page);

let source=fs.readFileSync(workspacePath,'utf8');
const groupBlock=`type GovernanceGroup={\n  id:string;\n  title:string;\n  subtitle:string;\n  kind:'council'|'standing'|'temporary'|'emergency';\n  coordinatorCode:string;\n};\n\nconst governanceGroups:GovernanceGroup[]=[\n  {id:'council',title:'مجلس نماء الأعلى',subtitle:'غرفة حوكمة دائمة للموضوعات العابرة للبنوك والمستشارين',kind:'council',coordinatorCode:'SECRETARY'},\n  {id:'standing',title:'اللجان الدائمة',subtitle:'غرفة تنظيمية للجان المستمرة ذات النطاق المسجل',kind:'standing',coordinatorCode:'SECRETARY'},\n  {id:'temporary',title:'اللجان المؤقتة',subtitle:'غرفة تنظيمية للموضوعات المحددة دون إنشاء لجنة فعلية تلقائيًا',kind:'temporary',coordinatorCode:'SECRETARY'},\n  {id:'emergency',title:'لجنة الطوارئ',subtitle:'غرفة تنسيق جماعي للحالات الاستثنائية والمتابعة الموثقة',kind:'emergency',coordinatorCode:'SECRETARY'},\n];\n\nfunction governanceGroupById(id:string|null|undefined){\n  return governanceGroups.find(group=>group.id===id)??null;\n}\nfunction governanceGroupByTitle(title:string|null|undefined){\n  return governanceGroups.find(group=>group.title===title)??null;\n}\n\n`;
source=replaceRequired(source,'type Message={',groupBlock+'type Message={','governance group types');

source=replaceRequired(
  source,
  '  agents,\n  initialThreadId,',
  '  agents,\n  initialGovernanceGroup,\n  initialThreadId,',
  'workspace prop destructure',
);
source=replaceRequired(
  source,
  '  agents:Agent[];\n  initialThreadId?:string|null;',
  '  agents:Agent[];\n  initialGovernanceGroup?:string|null;\n  initialThreadId?:string|null;',
  'workspace prop type',
);
source=replaceRequired(
  source,
  "  const [mobileInbox,setMobileInbox]=useState(!initialThreadId && !initialAgentCode);",
  "  const [mobileInbox,setMobileInbox]=useState(!initialThreadId && !initialAgentCode);\n  const [governanceGroupId,setGovernanceGroupId]=useState<string|null>(governanceGroupById(initialGovernanceGroup)?.id??null);",
  'governance group state',
);
source=replaceRequired(
  source,
  '  const roomMeta=useMemo(()=>roomMetaForAgent(activeAgent,agentName),[activeAgent,agentName]);',
  "  const roomMeta=useMemo(()=>roomMetaForAgent(activeAgent,agentName),[activeAgent,agentName]);\n  const governanceGroupMeta=useMemo(()=>governanceGroupById(governanceGroupId),[governanceGroupId]);\n  const effectiveRoomMeta=governanceGroupMeta?{kind:'committee',label:'غرفة حوكمة جماعية',subtitle:governanceGroupMeta.subtitle}:roomMeta;",
  'effective group room meta',
);

source=replaceRequired(
  source,
  "      setThreadTitle(d.thread?.title??'محادثة نماء');\n      setAgentName(d.thread?.primary_agent_name??'المحافظ');",
  "      setThreadTitle(d.thread?.title??'محادثة نماء');\n      setAgentName(d.thread?.primary_agent_name??'المحافظ');\n      setGovernanceGroupId(governanceGroupByTitle(d.thread?.title)?.id??null);",
  'load governance group from persisted title',
);
source=replaceRequired(
  source,
  "    setError('');\n    window.setTimeout(()=>inputRef.current?.focus(),0);\n  }\n\n  async function ensureThread(){",
  "    setError('');\n    setGovernanceGroupId(null);\n    window.setTimeout(()=>inputRef.current?.focus(),0);\n  }\n\n  async function ensureThread(){",
  'new conversation governance reset',
);
source=replaceRequired(
  source,
  "  function openAgent(agent:Agent){\n    setThreadId(null);",
  "  function openAgent(agent:Agent){\n    setGovernanceGroupId(null);\n    setThreadId(null);",
  'agent governance reset',
);
source=replaceRequired(
  source,
  "      body:JSON.stringify({agentCode:newThreadAgentCode,title:'المحادثة الرئيسية'})",
  "      body:JSON.stringify({agentCode:newThreadAgentCode,title:governanceGroupMeta?.title??'المحادثة الرئيسية'})",
  'persist governance room title',
);
source=replaceRequired(
  source,
  "    const body=String(data.get('body')??'').trim();\n    if(!body) return;",
  "    const rawBody=String(data.get('body')??'').trim();\n    if(!rawBody) return;\n    const body=governanceGroupMeta?`${governanceGroupMeta.title} — ${rawBody}`:rawBody;",
  'governance message context',
);

const oldGroups=`      <section className="mobile-inbox-section">\n        <header><strong>المجالس والمجموعات</strong><span>2</span></header>\n        <div className="mobile-contact-list">\n          <a className="mobile-contact-row" href="/meetings"><span className="mobile-contact-avatar governance"><Icon name="meetings" size={20}/></span><span className="mobile-contact-copy"><b>مجلس نماء واللجان</b><small>الاجتماعات، اللجان، المحاضر والمتابعة</small></span><Icon name="chevron" size={17}/></a>\n          <a className="mobile-contact-row" href="/central-bank"><span className="mobile-contact-avatar governance"><Icon name="banks" size={20}/></span><span className="mobile-contact-copy"><b>مجلس نماء المركزي</b><small>الاستقرار والتنسيق بين البنوك</small></span><Icon name="chevron" size={17}/></a>\n        </div>\n      </section>`;
const newGroups=`      <section className="mobile-inbox-section mobile-governance-groups">\n        <header><strong>المجالس والمجموعات</strong><span>{governanceGroups.length}</span></header>\n        <div className="mobile-contact-list">\n          {governanceGroups.map(group=><a className="mobile-contact-row governance-group-row" href={\`/?agent=\${group.coordinatorCode}&group=\${group.id}\`} key={group.id}>\n            <span className={\`mobile-contact-avatar governance governance-\${group.kind}\`}><Icon name={group.kind==='emergency'?'alerts':'meetings'} size={20}/></span>\n            <span className="mobile-contact-copy"><b>{group.title}</b><small><em>غرفة حوكمة</em>{group.subtitle}</small></span>\n            <Icon name="chat" size={17}/>\n          </a>)}\n        </div>\n        <a className="mobile-governance-index" href="/meetings"><Icon name="minutes" size={16}/><span>عرض إدارة الاجتماعات والحوكمة</span></a>\n      </section>`;
source=replaceRequired(source,oldGroups,newGroups,'mobile governance groups list');

source=replaceRequired(
  source,
  'aria-label="المحادثة الحالية" data-room-kind={roomMeta.kind}>',
  'aria-label="المحادثة الحالية" data-room-kind={effectiveRoomMeta.kind}>',
  'effective room kind',
);
source=replaceRequired(
  source,
  '<div className={`mobile-room-meta mobile-native-only room-${roomMeta.kind}`}><span>{roomMeta.label}</span><small>{roomMeta.subtitle}</small></div>',
  '<div className={`mobile-room-meta mobile-native-only room-${effectiveRoomMeta.kind}`}><span>{effectiveRoomMeta.label}</span><small>{effectiveRoomMeta.subtitle}</small></div>',
  'effective mobile room metadata',
);
source=replaceRequired(
  source,
  '      <div className="messages" aria-live="polite" aria-busy={loading}>',
  `      <div className="messages" aria-live="polite" aria-busy={loading}>\n        {governanceGroupMeta&&<section className="governance-chat-context mobile-native-only" aria-label="سياق غرفة الحوكمة">\n          <header><span><Icon name={governanceGroupMeta.kind==='emergency'?'alerts':'meetings'} size={18}/></span><div><strong>{governanceGroupMeta.title}</strong><small>{governanceGroupMeta.subtitle}</small></div></header>\n          <div className="governance-chat-lifecycle"><span>جدول أعمال</span><i>←</i><span>مداولة</span><i>←</i><span>تصويت</span><i>←</i><span>اعتماد</span><i>←</i><span>محضر</span><i>←</i><span>متابعة</span></div>\n          <div className="governance-chat-truth"><Icon name="verify" size={14}/><p>هذه غرفة تنظيمية وليست اجتماعًا فعليًا بحد ذاتها. لا يُنشأ تصويت أو قرار أو محضر إلا من بيانات حقيقية، ولا يعني أي اعتماد تنفيذًا ماليًا خارجيًا.</p></div>\n          <div className="governance-chat-coordinator"><span className="avatar">{(agents.find(agent=>agent.agent_code==='SECRETARY')?.display_name??'أ').slice(0,1)}</span><div><strong>{agents.find(agent=>agent.agent_code==='SECRETARY')?.display_name??'أمين السر'}</strong><small>منسق الغرفة • يوجّه الموضوع إلى الأعضاء المسجلين حسب الاختصاص</small></div></div>\n        </section>}`,
  'group context panel',
);
fs.writeFileSync(workspacePath,source);

let css=fs.readFileSync(cssPath,'utf8');
const marker='/* Namaa mobile governance group rooms contract */';
if(css.includes(marker)) throw new Error('Governance group rooms contract unexpectedly already exists');
css+=`\n\n${marker}\n@media(max-width:767px){\n  .mobile-governance-groups{padding-top:2px}\n  .governance-group-row{position:relative}\n  .mobile-contact-avatar.governance-council,.mobile-contact-avatar.governance-standing{background:color-mix(in srgb,var(--namaa-green-700) 8%,var(--namaa-surface))}\n  .mobile-contact-avatar.governance-temporary{background:var(--namaa-surface-2)}\n  .mobile-contact-avatar.governance-emergency{background:color-mix(in srgb,var(--namaa-gold-500) 11%,var(--namaa-surface));border-color:color-mix(in srgb,var(--namaa-gold-500) 28%,var(--namaa-border))}\n  .mobile-governance-index{margin-top:8px;min-height:40px;border:1px solid var(--namaa-border);border-radius:12px;background:var(--namaa-surface-2);color:var(--namaa-green-900);text-decoration:none;display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;font-weight:800}\n  .governance-chat-context{margin:2px 0 12px;padding:11px;border:1px solid var(--namaa-border);border-radius:16px;background:var(--namaa-surface-2);display:grid!important;gap:10px}\n  .governance-chat-context>header{display:flex;align-items:flex-start;gap:8px}.governance-chat-context>header>span{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:color-mix(in srgb,var(--namaa-green-700) 10%,var(--namaa-surface));color:var(--namaa-green-900)}\n  .governance-chat-context>header>div{min-width:0;display:grid;gap:2px}.governance-chat-context>header strong{font-size:13px;color:var(--namaa-text-strong)}.governance-chat-context>header small{font-size:10px;line-height:1.45;color:var(--namaa-muted)}\n  .governance-chat-lifecycle{display:flex;gap:4px;align-items:center;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}.governance-chat-lifecycle::-webkit-scrollbar{display:none}.governance-chat-lifecycle span{flex:0 0 auto;border:1px solid var(--namaa-border);background:var(--namaa-surface);border-radius:999px;padding:4px 7px;font-size:9px;font-weight:800;color:var(--namaa-text)}.governance-chat-lifecycle i{font-style:normal;color:var(--namaa-muted);font-size:10px}\n  .governance-chat-truth{display:flex;gap:6px;align-items:flex-start;padding:8px;border-radius:11px;background:var(--namaa-surface);border:1px solid var(--namaa-border)}.governance-chat-truth .namaa-icon{flex:0 0 auto;margin-top:1px;color:var(--namaa-green-700)}.governance-chat-truth p{margin:0!important;font-size:9px!important;line-height:1.55!important;color:var(--namaa-muted)!important}\n  .governance-chat-coordinator{display:flex;gap:8px;align-items:center}.governance-chat-coordinator .avatar{width:34px;height:34px;flex:0 0 34px}.governance-chat-coordinator>div{min-width:0;display:grid;gap:1px}.governance-chat-coordinator strong{font-size:11px}.governance-chat-coordinator small{font-size:9px;line-height:1.4;color:var(--namaa-muted)}\n}\n`;
fs.writeFileSync(cssPath,css);

console.log('Applied governed mobile group rooms without synthetic meetings or decisions.');
