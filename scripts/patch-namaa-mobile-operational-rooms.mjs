import fs from 'node:fs';

const root='apps/namaa-final-ui';
function replaceOnce(path, from, to){
  const full=`${root}/${path}`;
  const before=fs.readFileSync(full,'utf8');
  if(!before.includes(from)) throw new Error(`Expected operational-room target not found: ${path}`);
  fs.writeFileSync(full,before.replace(from,to),'utf8');
}

// Add a deterministic room taxonomy over real Namaa agents only.
replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  'type Message={',
  `function roomMetaForAgent(agent:Agent|null,name=''){
  const raw=[agent?.agent_type,agent?.agent_code,agent?.display_name,name].filter(Boolean).join(' ').toLowerCase();
  if(raw.includes('advisor')||raw.includes('مستشار')) return {kind:'advisor',label:'غرفة مستشار',subtitle:'تحليل وتوصيات ومتابعة'};
  if(raw.includes('bank')||raw.includes('بنك')||raw.includes('manager')||raw.includes('مدير')) return {kind:'bank',label:'غرفة بنك',subtitle:'خدمة ومتابعة وقرارات البنك'};
  if(raw.includes('governor')||raw.includes('محافظ')) return {kind:'governor',label:'غرفة المحافظ',subtitle:'تنسيق ومراجعة على مستوى المنظومة'};
  if(raw.includes('secretary')||raw.includes('أمين')) return {kind:'secretariat',label:'غرفة الأمانة',subtitle:'محاضر وتنظيم ومتابعة القرارات'};
  if(raw.includes('committee')||raw.includes('لجنة')) return {kind:'committee',label:'غرفة لجنة',subtitle:'مناقشة وقرارات ومتابعة'};
  return {kind:'namaa',label:'غرفة نماء',subtitle:'تواصل تشغيلي مباشر'};
}

type Message={`,
);

replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  `  const filteredAgents=useMemo(()=>{
    const q=query.trim();
    if(!q) return agents;
    return agents.filter(agent=>[agent.display_name,agent.agent_type,agent.mandate].filter(Boolean).some(value=>String(value).includes(q)));
  },[agents,query]);`,
  `  const filteredAgents=useMemo(()=>{
    const q=query.trim();
    if(!q) return agents;
    return agents.filter(agent=>[agent.display_name,agent.agent_type,agent.mandate].filter(Boolean).some(value=>String(value).includes(q)));
  },[agents,query]);

  const activeAgent=useMemo(()=>agents.find(agent=>agent.agent_code===newThreadAgentCode||agent.display_name===agentName)??null,[agents,newThreadAgentCode,agentName]);
  const roomMeta=useMemo(()=>roomMetaForAgent(activeAgent,agentName),[activeAgent,agentName]);`,
);

replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  `<section className={\`chat-main \${mobileInbox?'mobile-chat-hidden':''}\`} aria-label="المحادثة الحالية">`,
  `<section className={\`chat-main \${mobileInbox?'mobile-chat-hidden':''}\`} aria-label="المحادثة الحالية" data-room-kind={roomMeta.kind}>`,
);

replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  `<button type="button" className="mobile-chat-back mobile-native-only" onClick={()=>setMobileInbox(true)} aria-label="العودة إلى المحادثات"><Icon name="chevron" size={19}/></button>\n        <div className="chat-agent">`,
  `<button type="button" className="mobile-chat-back mobile-native-only" onClick={()=>setMobileInbox(true)} aria-label="العودة إلى المحادثات"><Icon name="chevron" size={19}/></button>\n        <div className={\`mobile-room-meta mobile-native-only room-\${roomMeta.kind}\`}><span>{roomMeta.label}</span><small>{roomMeta.subtitle}</small></div>\n        <div className="chat-agent">`,
);

replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  `<span className="mobile-contact-copy"><b>{agent.display_name}</b><small>{agent.mandate??agent.agent_type}</small></span>`,
  `<span className="mobile-contact-copy"><b>{agent.display_name}</b><small><em>{roomMetaForAgent(agent).label}</em>{agent.mandate??agent.agent_type}</small></span>`,
);

const globalsPath=`${root}/src/app/globals.css`;
const css=fs.readFileSync(globalsPath,'utf8');
const marker='/* Namaa mobile operational rooms contract */';
if(css.includes(marker)) throw new Error('Operational-room contract unexpectedly already exists');
fs.appendFileSync(globalsPath,`\n\n${marker}\n
@media(max-width:767px){
  .mobile-room-meta{margin-inline-start:2px;min-width:0;display:grid!important;gap:1px;padding:5px 8px;border:1px solid var(--namaa-border);border-radius:12px;background:var(--namaa-surface-2)}
  .mobile-room-meta span{font-size:10px;font-weight:900;line-height:1.15;color:var(--namaa-green-900);white-space:nowrap}
  .mobile-room-meta small{max-width:126px;font-size:9px;line-height:1.25;color:var(--namaa-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mobile-room-meta.room-advisor{border-color:color-mix(in srgb,var(--namaa-gold-500) 34%,var(--namaa-border))}
  .mobile-room-meta.room-bank{border-color:color-mix(in srgb,var(--namaa-green-700) 32%,var(--namaa-border))}
  .mobile-room-meta.room-governor,.mobile-room-meta.room-secretariat,.mobile-room-meta.room-committee{background:color-mix(in srgb,var(--namaa-green-700) 5%,var(--namaa-surface-2))}
  .mobile-contact-copy small{display:flex;align-items:center;gap:5px;min-width:0}
  .mobile-contact-copy small em{flex:0 0 auto;font-style:normal;font-size:9px;font-weight:800;color:var(--namaa-green-900);background:var(--namaa-surface-2);border:1px solid var(--namaa-border);border-radius:999px;padding:1px 5px}
  .mobile-contact-copy small{overflow:hidden}.mobile-contact-copy small:not(em){text-overflow:ellipsis}
  .chat-main[data-room-kind='advisor'] .chat-composer{border-top-color:color-mix(in srgb,var(--namaa-gold-500) 26%,var(--namaa-border))}
  .chat-main[data-room-kind='bank'] .chat-composer,.chat-main[data-room-kind='governor'] .chat-composer{border-top-color:color-mix(in srgb,var(--namaa-green-700) 24%,var(--namaa-border))}
}
`,'utf8');

console.log('Applied Namaa mobile operational room taxonomy and context.');
