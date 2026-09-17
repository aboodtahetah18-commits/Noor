import fs from 'node:fs';

const root='apps/namaa-final-ui';
function replaceOnce(path, from, to){
  const full=`${root}/${path}`;
  const before=fs.readFileSync(full,'utf8');
  if(!before.includes(from)) throw new Error(`Expected operational-group target not found: ${path}`);
  fs.writeFileSync(full,before.replace(from,to),'utf8');
}

replaceOnce(
  'src/lib/conversations/repository.ts',
  '        t.status,\n        t.updated_at,',
  '        t.status,\n        t.context,\n        t.updated_at,',
);

replaceOnce(
  'src/app/api/conversations/[threadId]/messages/route.ts',
  '    const targetAgent=await getAgentByCode(routing.agentCode);\n    const sql=getSql();\n\n    if(targetAgent && String(thread.agent_code??\'\')!==routing.agentCode){',
  `    const targetAgent=await getAgentByCode(routing.agentCode);\n    const sql=getSql();\n    const threadContext=(thread.context??{}) as Record<string,unknown>;\n    const isOperationalGroup=String(thread.thread_kind??'').startsWith('GROUP_') || threadContext['conversation_mode']==='GROUP';\n\n    if(targetAgent && !isOperationalGroup && String(thread.agent_code??'')!==routing.agentCode){`,
);
replaceOnce(
  'src/app/api/conversations/[threadId]/messages/route.ts',
  '        analytical_response_pending:true\n      }',
  '        analytical_response_pending:true,\n        operational_group:isOperationalGroup\n      }',
);

replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  `type Thread={\n  id:string;\n  title:string|null;\n  primary_agent_name:string|null;\n  agent_code:string|null;\n  last_message:string|null;\n};`,
  `type Thread={\n  id:string;\n  title:string|null;\n  primary_agent_name:string|null;\n  agent_code:string|null;\n  last_message:string|null;\n  thread_kind:string|null;\n  context:any;\n};`,
);
replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  `type Agent={\n  id:string;\n  agent_code:string;\n  display_name:string;\n  agent_type:string;\n  mandate:string|null;\n};`,
  `type Agent={\n  id:string;\n  agent_code:string;\n  display_name:string;\n  agent_type:string;\n  mandate:string|null;\n};\n\ntype OperationalGroup={\n  key:string;\n  title:string;\n  subtitle:string;\n  threadKind:'GROUP_GOVERNANCE'|'GROUP_BANK';\n  primaryAgentCode:string;\n  memberAgentCodes:string[];\n  icon:'meetings'|'banks'|'alerts'|'investment';\n};`,
);
replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  `const quickPrompts=[\n  'راجع ميزانيتي',\n  'اعرض حساباتي',\n  'راجع الالتزامات',\n  'افتح هدفًا ماليًا',\n];`,
  `const quickPrompts=[\n  'راجع ميزانيتي',\n  'اعرض حساباتي',\n  'راجع الالتزامات',\n  'افتح هدفًا ماليًا',\n];\n\nconst groupQuickPrompts=[\n  'جهز جدول أعمال لهذا الموضوع',\n  'من الأعضاء المناسبون للمشاركة؟',\n  'لخص الموضوع قبل المداولة',\n  'جهز مسودة محضر للمتابعة',\n];\n\nconst operationalGroups:OperationalGroup[]=[\n  {key:'central-council',title:'مجلس نماء المركزي',subtitle:'الاستقرار والتنسيق بين البنوك ومتابعة القرارات المشتركة',threadKind:'GROUP_GOVERNANCE',primaryAgentCode:'CENTRAL_BANK_MANAGER',memberAgentCodes:['GOVERNOR','CENTRAL_BANK_MANAGER','HILAL_BANK_MANAGER','MALAA_BANK_MANAGER','ASSETS_BANK_MANAGER','SECRETARY'],icon:'meetings'},\n  {key:'supreme-council',title:'مجلس نماء الأعلى',subtitle:'الموضوعات التي تتجاوز نطاق بنك أو مستشار منفرد',threadKind:'GROUP_GOVERNANCE',primaryAgentCode:'GOVERNOR',memberAgentCodes:['GOVERNOR','CENTRAL_BANK_MANAGER','HILAL_BANK_MANAGER','MALAA_BANK_MANAGER','ASSETS_BANK_MANAGER','ECONOMIC_ADVISOR','SECRETARY'],icon:'meetings'},\n  {key:'emergency-committee',title:'لجنة الطوارئ',subtitle:'مسار جماعي للحالات الاستثنائية مع محضر ومتابعة موثقة',threadKind:'GROUP_GOVERNANCE',primaryAgentCode:'CENTRAL_BANK_MANAGER',memberAgentCodes:['GOVERNOR','CENTRAL_BANK_MANAGER','BUDGET_SPENDING_ADVISOR','OBLIGATIONS_ADVISOR','INVESTMENT_LIQUIDITY_ADVISOR','SECRETARY'],icon:'alerts'},\n  {key:'investment-liquidity-committee',title:'لجنة الاستثمار والسيولة',subtitle:'مناقشة الفرص والسيولة والاحتياطي قبل أي توصية محكومة',threadKind:'GROUP_GOVERNANCE',primaryAgentCode:'INVESTMENT_LIQUIDITY_ADVISOR',memberAgentCodes:['GOVERNOR','CENTRAL_BANK_MANAGER','INVESTMENT_LIQUIDITY_ADVISOR','ECONOMIC_ADVISOR','ASSETS_BANK_MANAGER','SECRETARY'],icon:'investment'},\n  {key:'central-bank-room',title:'بنك نماء المركزي',subtitle:'غرفة التنسيق مع مدير البنك المركزي',threadKind:'GROUP_BANK',primaryAgentCode:'CENTRAL_BANK_MANAGER',memberAgentCodes:['CENTRAL_BANK_MANAGER','GOVERNOR','SECRETARY'],icon:'banks'},\n  {key:'hilal-bank-room',title:'بنك الهلال',subtitle:'غرفة تشغيل البنك ومديره ضمن نطاقه',threadKind:'GROUP_BANK',primaryAgentCode:'HILAL_BANK_MANAGER',memberAgentCodes:['HILAL_BANK_MANAGER','GOVERNOR','SECRETARY'],icon:'banks'},\n  {key:'malaa-bank-room',title:'بنك ملاءة',subtitle:'غرفة تشغيل الملاءة والحماية والاحتياطي',threadKind:'GROUP_BANK',primaryAgentCode:'MALAA_BANK_MANAGER',memberAgentCodes:['MALAA_BANK_MANAGER','GOVERNOR','SECRETARY'],icon:'banks'},\n  {key:'assets-bank-room',title:'بنك الأصول الاستثمارية',subtitle:'غرفة تشغيل الأصول والأهداف والفرص الاستثمارية',threadKind:'GROUP_BANK',primaryAgentCode:'ASSETS_BANK_MANAGER',memberAgentCodes:['ASSETS_BANK_MANAGER','INVESTMENT_LIQUIDITY_ADVISOR','GOVERNOR','SECRETARY'],icon:'banks'},\n];`,
);

replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  `  const [mobileInbox,setMobileInbox]=useState(!initialThreadId && !initialAgentCode);`,
  `  const [mobileInbox,setMobileInbox]=useState(!initialThreadId && !initialAgentCode);\n  const [selectedGroup,setSelectedGroup]=useState<OperationalGroup|null>(null);`,
);
replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  `  const filteredAgents=useMemo(()=>{\n    const q=query.trim();\n    if(!q) return agents;\n    return agents.filter(agent=>[agent.display_name,agent.agent_type,agent.mandate].filter(Boolean).some(value=>String(value).includes(q)));\n  },[agents,query]);`,
  `  const filteredAgents=useMemo(()=>{\n    const q=query.trim();\n    if(!q) return agents;\n    return agents.filter(agent=>[agent.display_name,agent.agent_type,agent.mandate].filter(Boolean).some(value=>String(value).includes(q)));\n  },[agents,query]);\n\n  const filteredGroups=useMemo(()=>{\n    const q=query.trim();\n    if(!q) return operationalGroups;\n    return operationalGroups.filter(group=>[group.title,group.subtitle].some(value=>value.includes(q)));\n  },[query]);\n\n  const selectedGroupMembers=useMemo(()=>{\n    if(!selectedGroup) return [];\n    return selectedGroup.memberAgentCodes\n      .map(code=>agents.find(agent=>agent.agent_code===code))\n      .filter((agent):agent is Agent=>Boolean(agent));\n  },[selectedGroup,agents]);`,
);

replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  `      setThreadTitle(d.thread?.title??'محادثة نماء');\n      setAgentName(d.thread?.primary_agent_name??'المحافظ');\n      setMobileInbox(false);`,
  `      setThreadTitle(d.thread?.title??'محادثة نماء');\n      const groupKey=String(d.thread?.context?.group_key??'');\n      const existingGroup=operationalGroups.find(group=>group.key===groupKey)??null;\n      setSelectedGroup(existingGroup);\n      setAgentName(existingGroup?.title??d.thread?.primary_agent_name??'المحافظ');\n      setMobileInbox(false);`,
);
replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  `  function openAgent(agent:Agent){\n    setThreadId(null);`,
  `  function openAgent(agent:Agent){\n    setSelectedGroup(null);\n    setThreadId(null);`,
);
replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  `  async function ensureThread(){`,
  `  function openGroup(group:OperationalGroup){\n    setSelectedGroup(group);\n    setThreadId(null);\n    setMessages([]);\n    setThreadTitle(group.title);\n    setAgentName(group.title);\n    setNewThreadAgentCode(group.primaryAgentCode);\n    setError('');\n    setMobileInbox(false);\n    window.setTimeout(()=>inputRef.current?.focus(),0);\n  }\n\n  async function ensureThread(){`,
);
replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  `      body:JSON.stringify({agentCode:newThreadAgentCode,title:'المحادثة الرئيسية'})`,
  `      body:JSON.stringify(selectedGroup\n        ? {agentCode:selectedGroup.primaryAgentCode,title:selectedGroup.title,threadKind:selectedGroup.threadKind,context:{conversation_mode:'GROUP',group_key:selectedGroup.key,group_label:selectedGroup.title,member_agent_codes:selectedGroup.memberAgentCodes,structural_room:true}}\n        : {agentCode:newThreadAgentCode,title:'المحادثة الرئيسية'})`,
);
replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  `    setThreadTitle('محادثة جديدة');\n    setAgentName('المحافظ');`,
  `    setThreadTitle('محادثة جديدة');\n    setSelectedGroup(null);\n    setAgentName('المحافظ');`,
);

replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  `      <section className="mobile-inbox-section">\n        <header><strong>المجالس والمجموعات</strong><span>2</span></header>\n        <div className="mobile-contact-list">\n          <a className="mobile-contact-row" href="/meetings"><span className="mobile-contact-avatar governance"><Icon name="meetings" size={20}/></span><span className="mobile-contact-copy"><b>مجلس نماء واللجان</b><small>الاجتماعات، اللجان، المحاضر والمتابعة</small></span><Icon name="chevron" size={17}/></a>\n          <a className="mobile-contact-row" href="/central-bank"><span className="mobile-contact-avatar governance"><Icon name="banks" size={20}/></span><span className="mobile-contact-copy"><b>مجلس نماء المركزي</b><small>الاستقرار والتنسيق بين البنوك</small></span><Icon name="chevron" size={17}/></a>\n        </div>\n      </section>`,
  `      <section className="mobile-inbox-section">\n        <header><strong>المجالس واللجان والبنوك</strong><span>{filteredGroups.length}</span></header>\n        <div className="mobile-contact-list">\n          {filteredGroups.map(group=><button type="button" className="mobile-contact-row mobile-group-row" key={group.key} onClick={()=>openGroup(group)}>\n            <span className="mobile-contact-avatar governance"><Icon name={group.icon} size={20}/></span>\n            <span className="mobile-contact-copy"><b>{group.title}</b><small>{group.subtitle}</small></span>\n            <span className="mobile-group-badge">مجموعة</span>\n          </button>)}\n        </div>\n      </section>`,
);

replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  `<small>{threadTitle||'محادثة جديدة'} • خوارزمية مالية</small>`,
  `<small>{selectedGroup?(selectedGroupMembers.length+' أعضاء • مجموعة تشغيلية'):((threadTitle||'محادثة جديدة')+' • خوارزمية مالية')}</small>`,
);
replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  `        <span className="secure-context">\n          <Icon name="verify" size={16}/>\n          سياق مالي آمن\n        </span>\n      </header>`,
  `        <span className="secure-context">\n          <Icon name="verify" size={16}/>\n          {selectedGroup?'سياق جماعي محكوم':'سياق مالي آمن'}\n        </span>\n      </header>\n\n      {selectedGroup && <div className="mobile-group-members mobile-native-only" aria-label="أعضاء المجموعة">\n        <div className="mobile-group-avatar-stack">\n          {selectedGroupMembers.slice(0,5).map(member=><span className="mobile-group-member-avatar" key={member.id} title={member.display_name}>{member.display_name.slice(0,1)}</span>)}\n        </div>\n        <div><strong>{selectedGroup.title}</strong><small>{selectedGroup.subtitle}</small></div>\n      </div>`,
);
replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  `              <b>حياك الله {userName}</b>\n              <p>ابدأ بطلبك مباشرة. سأوجهه للمسار المختص، وأي ملف ترفعه سيبقى مسودة حتى تؤكده بنفسك.</p>`,
  `              <b>{selectedGroup?('حياك الله في '+selectedGroup.title):('حياك الله '+userName)}</b>\n              <p>{selectedGroup?'اكتب موضوعك داخل المجموعة. يظل النقاش منفصلًا عن التصويت والاعتماد والتنفيذ الخارجي، وأي مسار لاحق يبقى محكومًا بقواعده.':'ابدأ بطلبك مباشرة. سأوجهه للمسار المختص، وأي ملف ترفعه سيبقى مسودة حتى تؤكده بنفسك.'}</p>`,
);
replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  `{quickPrompts.map(prompt=>`,
  `{(selectedGroup?groupQuickPrompts:quickPrompts).map(prompt=>`,
);

const globalsPath=`${root}/src/app/globals.css`;
const css=fs.readFileSync(globalsPath,'utf8');
const marker='/* Namaa mobile operational groups contract */';
if(css.includes(marker)) throw new Error('Operational groups contract unexpectedly already exists');
fs.appendFileSync(globalsPath,`\n\n${marker}\n
@media(max-width:767px){
  .mobile-group-row{grid-template-columns:48px minmax(0,1fr) auto!important}
  .mobile-group-badge{font-size:9px;font-weight:900;color:var(--namaa-green-900);background:color-mix(in srgb,var(--namaa-green-700) 9%,var(--namaa-surface));border:1px solid color-mix(in srgb,var(--namaa-green-700) 20%,var(--namaa-border));border-radius:999px;padding:4px 7px;white-space:nowrap}
  .mobile-group-members{align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid var(--namaa-border);background:var(--namaa-surface-2);min-width:0}
  .mobile-group-members>div:last-child{min-width:0;display:grid;gap:2px}.mobile-group-members strong{font-size:11px;color:var(--namaa-text-strong)}.mobile-group-members small{font-size:9px;color:var(--namaa-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mobile-group-avatar-stack{display:flex;direction:ltr;flex:0 0 auto;padding-inline-start:4px}.mobile-group-member-avatar{width:25px;height:25px;border-radius:50%;display:grid;place-items:center;margin-inline-start:-5px;background:var(--namaa-surface);border:2px solid var(--namaa-surface-2);color:var(--namaa-green-900);font-size:9px;font-weight:900}
  .mobile-group-member-avatar:first-child{margin-inline-start:0}
}
`,'utf8');

console.log('Applied real operational group rooms for Namaa mobile chat.');
