import fs from 'node:fs';

const root='apps/namaa-final-ui';
function replaceOnce(path, from, to){
  const full=`${root}/${path}`;
  const before=fs.readFileSync(full,'utf8');
  if(!before.includes(from)) throw new Error(`Expected chat-first target not found: ${path}`);
  fs.writeFileSync(full,before.replace(from,to),'utf8');
}

// Login copy: keep the CTA literal and brand-owned.
replaceOnce(
  'src/components/LoginForm.tsx',
  "{pending?'جاري الدخول...':'دخول إلى مستقبلي'}",
  "{pending?'جاري الدخول...':'دخول إلى نماء'}",
);

// Home page: provide the real active Namaa agents to the mobile inbox.
replaceOnce(
  'src/app/page.tsx',
  "import { listThreads } from '@/lib/conversations/repository';",
  "import { listAgents, listThreads } from '@/lib/conversations/repository';",
);
replaceOnce(
  'src/app/page.tsx',
  '  const threads=await listThreads(user.id);',
  '  const threads=await listThreads(user.id);\n  const agents=await listAgents();',
);
replaceOnce(
  'src/app/page.tsx',
  '      initialThreads={threads as any[]}',
  '      initialThreads={threads as any[]}\n      agents={agents as any[]}',
);

// ConversationWorkspace: mobile opens as an inbox/contact directory, not as a compressed desktop chat.
replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  "type Message={",
  "type Agent={\n  id:string;\n  agent_code:string;\n  display_name:string;\n  agent_type:string;\n  mandate:string|null;\n};\n\ntype Message={",
);
replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  '  initialThreads,\n  initialThreadId,',
  '  initialThreads,\n  agents,\n  initialThreadId,',
);
replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  '  initialThreads:Thread[];\n  initialThreadId?:string|null;',
  '  initialThreads:Thread[];\n  agents:Agent[];\n  initialThreadId?:string|null;',
);
replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  "  const [query,setQuery]=useState('');",
  "  const [query,setQuery]=useState('');\n  const [mobileInbox,setMobileInbox]=useState(!initialThreadId && !initialAgentCode);",
);
replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  '  },[threads,query]);',
  "  },[threads,query]);\n\n  const filteredAgents=useMemo(()=>{\n    const q=query.trim();\n    if(!q) return agents;\n    return agents.filter(agent=>[agent.display_name,agent.agent_type,agent.mandate].filter(Boolean).some(value=>String(value).includes(q)));\n  },[agents,query]);",
);
replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  "      setAgentName(d.thread?.primary_agent_name??'المحافظ');",
  "      setAgentName(d.thread?.primary_agent_name??'المحافظ');\n      setMobileInbox(false);",
);
replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  "  async function ensureThread(){",
  "  function openAgent(agent:Agent){\n    setThreadId(null);\n    setMessages([]);\n    setThreadTitle('محادثة جديدة');\n    setAgentName(agent.display_name);\n    setNewThreadAgentCode(agent.agent_code);\n    setError('');\n    setMobileInbox(false);\n    window.setTimeout(()=>inputRef.current?.focus(),0);\n  }\n\n  async function ensureThread(){",
);
replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  '    <section className="chat-main" aria-label="المحادثة الحالية">',
  `    <section className={\`mobile-chat-inbox mobile-native-only \${mobileInbox?'is-open':'is-hidden'}\`} aria-label="محادثات وجهات نماء">\n      <header className="mobile-inbox-head">\n        <div><small>نماء</small><h1>المحادثات</h1><p>تواصل مع البنك أو المستشار أو جهة الحوكمة مباشرة.</p></div>\n        <button type="button" aria-label="محادثة جديدة" onClick={newConversation}><Icon name="chat" size={20}/></button>\n      </header>\n\n      <label className="mobile-inbox-search">\n        <Icon name="search" size={18}/>\n        <input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="ابحث في المحادثات والجهات" aria-label="ابحث في المحادثات والجهات"/>\n      </label>\n\n      {filteredThreads.length>0 && <section className="mobile-inbox-section">\n        <header><strong>آخر المحادثات</strong><span>{filteredThreads.length}</span></header>\n        <div className="mobile-contact-list">\n          {filteredThreads.map(thread=><button type="button" className="mobile-contact-row" key={thread.id} onClick={()=>void load(thread.id)}>\n            <span className="mobile-contact-avatar">{(thread.primary_agent_name??'ن').slice(0,1)}</span>\n            <span className="mobile-contact-copy"><b>{thread.title??thread.primary_agent_name??'محادثة'}</b><small>{thread.last_message??'لا توجد رسائل بعد'}</small></span>\n            <Icon name="chevron" size={17}/>\n          </button>)}\n        </div>\n      </section>}\n\n      <section className="mobile-inbox-section">\n        <header><strong>جهات نماء</strong><span>{filteredAgents.length}</span></header>\n        <div className="mobile-contact-list">\n          {filteredAgents.map(agent=><button type="button" className="mobile-contact-row" key={agent.id} onClick={()=>openAgent(agent)}>\n            <span className="mobile-contact-avatar agent">{agent.display_name.slice(0,1)}</span>\n            <span className="mobile-contact-copy"><b>{agent.display_name}</b><small>{agent.mandate??agent.agent_type}</small></span>\n            <Icon name="chat" size={17}/>\n          </button>)}\n        </div>\n      </section>\n\n      <section className="mobile-inbox-section">\n        <header><strong>المجالس والمجموعات</strong><span>2</span></header>\n        <div className="mobile-contact-list">\n          <a className="mobile-contact-row" href="/meetings"><span className="mobile-contact-avatar governance"><Icon name="meetings" size={20}/></span><span className="mobile-contact-copy"><b>مجلس نماء واللجان</b><small>الاجتماعات، اللجان، المحاضر والمتابعة</small></span><Icon name="chevron" size={17}/></a>\n          <a className="mobile-contact-row" href="/central-bank"><span className="mobile-contact-avatar governance"><Icon name="banks" size={20}/></span><span className="mobile-contact-copy"><b>مجلس نماء المركزي</b><small>الاستقرار والتنسيق بين البنوك</small></span><Icon name="chevron" size={17}/></a>\n        </div>\n      </section>\n    </section>\n\n    <section className={\`chat-main \${mobileInbox?'mobile-chat-hidden':''}\`} aria-label="المحادثة الحالية">`,
);
replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  '      <header className="chat-header refined-chat-header">\n        <div className="chat-agent">',
  '      <header className="chat-header refined-chat-header">\n        <button type="button" className="mobile-chat-back mobile-native-only" onClick={()=>setMobileInbox(true)} aria-label="العودة إلى المحادثات"><Icon name="chevron" size={19}/></button>\n        <div className="chat-agent">',
);

const globalsPath=`${root}/src/app/globals.css`;
const css=fs.readFileSync(globalsPath,'utf8');
const marker='/* Namaa mobile chat-first distribution contract */';
if(css.includes(marker)) throw new Error('Chat-first distribution contract unexpectedly already exists');
fs.appendFileSync(globalsPath,`\n\n${marker}\n
@media(max-width:767px){
  /* Login distribution: fill the whole viewport without adding content. */
  .auth-page-v2 .auth-panel{
    display:grid!important;
    grid-template-rows:auto auto minmax(0,1fr) auto!important;
    align-content:stretch!important;
    justify-content:stretch!important;
    padding:max(18px,env(safe-area-inset-top)) 20px max(18px,env(safe-area-inset-bottom))!important;
  }
  .auth-page-v2 .auth-theme{
    top:max(16px,env(safe-area-inset-top))!important;
    left:18px!important;
    right:auto!important;
    inset-inline-start:auto!important;
    inset-inline-end:auto!important;
  }
  .auth-page-v2 .auth-mobile-brand{
    width:100%!important;
    margin:clamp(34px,6.5vh,70px) 0 0!important;
    justify-content:center!important;
    align-items:center!important;
  }
  .auth-page-v2 .auth-mobile-logo,.auth-page-v2 .auth-mobile-logo .brand-logo{
    width:clamp(158px,44vw,188px)!important;
    max-width:188px!important;
  }
  .auth-page-v2 .auth-heading{
    align-self:end!important;
    margin:clamp(24px,4.8vh,52px) 0 12px!important;
    padding:0!important;
  }
  .auth-page-v2 .auth-form{
    align-self:center!important;
    width:100%!important;
    max-width:100%!important;
    transform:translateY(clamp(6px,1.4vh,16px));
  }
  .auth-page-v2 .auth-footnote{
    align-self:end!important;
    margin-top:0!important;
    padding-top:10px!important;
  }

  /* Mobile home is an inbox/contact surface first, Telegram-style. */
  .mobile-chat-inbox{display:none!important}
  .mobile-chat-inbox.is-open{display:block!important;min-height:calc(100dvh - 58px - 76px);padding:14px 14px 22px;overflow-y:auto;background:var(--namaa-bg)}
  .mobile-chat-inbox.is-hidden{display:none!important}
  .chat-main.mobile-chat-hidden{display:none!important}
  .mobile-inbox-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px}
  .mobile-inbox-head>div{min-width:0}.mobile-inbox-head small{display:block;color:var(--namaa-green-700);font-weight:800;font-size:11px}.mobile-inbox-head h1{margin:2px 0 3px;font-size:24px;color:var(--namaa-text-strong)}.mobile-inbox-head p{margin:0;color:var(--namaa-muted);font-size:12px;line-height:1.55}
  .mobile-inbox-head>button{width:42px;height:42px;border-radius:14px;border:1px solid var(--namaa-border);background:var(--namaa-surface);color:var(--namaa-green-900);display:grid;place-items:center;flex:0 0 auto}
  .mobile-inbox-search{height:44px;border:1px solid var(--namaa-border);border-radius:14px;background:var(--namaa-surface);display:flex;align-items:center;gap:8px;padding:0 12px;margin-bottom:16px;color:var(--namaa-muted)}
  .mobile-inbox-search input{border:0!important;box-shadow:none!important;background:transparent!important;min-height:0!important;height:auto!important;padding:0!important;font:inherit;width:100%;color:var(--namaa-text)}
  .mobile-inbox-section{margin-bottom:18px}.mobile-inbox-section>header{display:flex;align-items:center;justify-content:space-between;margin:0 4px 8px}.mobile-inbox-section>header strong{font-size:13px;color:var(--namaa-text-strong)}.mobile-inbox-section>header span{font-size:10px;color:var(--namaa-muted);background:var(--namaa-surface-2);border:1px solid var(--namaa-border);border-radius:999px;padding:2px 7px}
  .mobile-contact-list{display:grid;gap:7px}.mobile-contact-row{width:100%;min-width:0;min-height:66px;border:1px solid var(--namaa-border);border-radius:16px;background:var(--namaa-surface);color:var(--namaa-text);text-decoration:none;padding:9px 10px;display:grid;grid-template-columns:48px minmax(0,1fr) 22px;align-items:center;gap:10px;text-align:right;font:inherit}
  .mobile-contact-row:active{transform:scale(.995)}.mobile-contact-avatar{width:48px;height:48px;border-radius:15px;background:color-mix(in srgb,var(--namaa-green-700) 10%,var(--namaa-surface));border:1px solid color-mix(in srgb,var(--namaa-green-700) 22%,var(--namaa-border));color:var(--namaa-green-900);display:grid;place-items:center;font-weight:900;font-size:18px}.mobile-contact-avatar.agent{background:color-mix(in srgb,var(--namaa-gold-500) 12%,var(--namaa-surface));border-color:color-mix(in srgb,var(--namaa-gold-500) 30%,var(--namaa-border))}.mobile-contact-avatar.governance{background:var(--namaa-surface-2)}
  .mobile-contact-copy{min-width:0;display:grid;gap:3px}.mobile-contact-copy b{font-size:13px;color:var(--namaa-text-strong);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mobile-contact-copy small{font-size:11px;line-height:1.4;color:var(--namaa-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mobile-contact-row>.namaa-icon{color:var(--namaa-muted)}
  .mobile-chat-back{width:38px;height:38px;border:1px solid var(--namaa-border);border-radius:12px;background:var(--namaa-surface-2);color:var(--namaa-text);align-items:center;justify-content:center;flex:0 0 auto;transform:rotate(180deg)}
  .chat-header.refined-chat-header{gap:8px}
}

@media(max-width:767px) and (max-height:700px){
  .auth-page-v2 .auth-mobile-brand{margin-top:22px!important}.auth-page-v2 .auth-mobile-logo,.auth-page-v2 .auth-mobile-logo .brand-logo{width:132px!important;max-width:132px!important}.auth-page-v2 .auth-heading{margin-top:14px!important}.auth-page-v2 .auth-form{transform:none}.auth-page-v2 .auth-footnote{display:none!important}
}
`,'utf8');

console.log('Applied Namaa mobile chat-first inbox and full-viewport login distribution.');
