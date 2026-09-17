import fs from 'node:fs';

const root='apps/namaa-final-ui';
const workspacePath=`${root}/src/components/ConversationWorkspace.tsx`;
const cssPath=`${root}/src/app/globals.css`;
for(const file of [workspacePath,cssPath]) if(!fs.existsSync(file)) throw new Error(`Missing desktop chat target: ${file}`);
function replaceOnce(source,from,to,label){if(!source.includes(from)) throw new Error(`Desktop chat target missing: ${label}`);return source.replace(from,to);}

let source=fs.readFileSync(workspacePath,'utf8');
source=replaceOnce(
  source,
  "  const [mobileInbox,setMobileInbox]=useState(!initialThreadId && !initialAgentCode);",
  "  const [mobileInbox,setMobileInbox]=useState(!initialThreadId && !initialAgentCode);\n  const [desktopThreadsOpen,setDesktopThreadsOpen]=useState(true);\n  const [desktopContextOpen,setDesktopContextOpen]=useState(true);",
  'desktop panel state',
);
source=replaceOnce(
  source,
  '<div className="chat-layout chat-layout-refined">',
  '<div className={`chat-layout chat-layout-refined desktop-chat-adaptive ${desktopThreadsOpen?\'\':\'desktop-threads-closed\'} ${desktopContextOpen?\'\':\'desktop-context-closed\'}`}>',
  'adaptive desktop layout',
);
source=replaceOnce(
  source,
  `      </label>\n\n      {filteredThreads.length===0`,
  `      </label>\n\n      <details className="desktop-chat-directory desktop-only">\n        <summary><Icon name="advisors" size={16}/><span>بدء محادثة مع جهة</span><Icon name="chevron" size={14}/></summary>\n        <div className="desktop-chat-directory-list">\n          {agents.map(agent=><button type="button" key={agent.id} onClick={()=>openAgent(agent)}><span className="avatar">{agent.display_name.slice(0,1)}</span><span><strong>{agent.display_name}</strong><small>{roomMetaForAgent(agent).label}</small></span></button>)}\n          {governanceGroups.map(group=><a key={group.id} href={\`/?agent=\${group.coordinatorCode}&group=\${group.id}\`}><span className="avatar"><Icon name={group.kind==='emergency'?'alerts':'meetings'} size={15}/></span><span><strong>{group.title}</strong><small>غرفة حوكمة</small></span></a>)}\n        </div>\n      </details>\n\n      {filteredThreads.length===0`,
  'desktop destination directory',
);
source=replaceOnce(
  source,
  '      <header className="chat-header refined-chat-header">',
  `      <header className="chat-header refined-chat-header">\n        <div className="desktop-chat-controls desktop-only-flex" aria-label="إدارة مساحة المحادثة">\n          <button type="button" onClick={()=>setDesktopThreadsOpen(value=>!value)} aria-pressed={desktopThreadsOpen} title={desktopThreadsOpen?'إخفاء المحادثات':'إظهار المحادثات'}><Icon name="chat" size={17}/><span>{desktopThreadsOpen?'إخفاء القائمة':'إظهار القائمة'}</span></button>\n          <button type="button" onClick={()=>setDesktopContextOpen(value=>!value)} aria-pressed={desktopContextOpen} title={desktopContextOpen?'إخفاء السياق':'إظهار السياق'}><Icon name="reports" size={17}/><span>{desktopContextOpen?'إخفاء السياق':'إظهار السياق'}</span></button>\n        </div>`,
  'desktop header controls',
);
fs.writeFileSync(workspacePath,source,'utf8');

let css=fs.readFileSync(cssPath,'utf8');
const marker='/* Namaa desktop adaptive chat workspace contract */';
if(css.includes(marker)) throw new Error('Desktop adaptive chat contract unexpectedly already exists');
css+=`\n\n${marker}\n.desktop-only-flex{display:flex}.desktop-chat-adaptive.desktop-threads-closed{grid-template-columns:minmax(0,1fr) 300px}.desktop-chat-adaptive.desktop-context-closed{grid-template-columns:310px minmax(0,1fr)}.desktop-chat-adaptive.desktop-threads-closed.desktop-context-closed{grid-template-columns:minmax(0,1fr)}.desktop-chat-adaptive.desktop-threads-closed>.chat-list,.desktop-chat-adaptive.desktop-context-closed>.context{display:none!important}\n.desktop-chat-controls{position:absolute;inset-inline-end:14px;inset-block-end:-46px;z-index:8;gap:6px}.refined-chat-header{position:relative}.desktop-chat-controls button{height:34px;border:1px solid var(--namaa-border-strong);border-radius:11px;background:var(--namaa-surface);color:var(--namaa-green-900);display:inline-flex;align-items:center;gap:6px;padding:0 9px;font:inherit;font-size:10px;font-weight:800;box-shadow:0 4px 14px rgba(10,60,45,.05)}\n.desktop-chat-directory{margin:0 0 12px;border:1px solid var(--namaa-border);border-radius:13px;background:var(--namaa-surface-2);overflow:hidden}.desktop-chat-directory summary{list-style:none;min-height:42px;cursor:pointer;display:grid;grid-template-columns:20px minmax(0,1fr) 16px;align-items:center;gap:7px;padding:0 10px;color:var(--namaa-green-900);font-size:11px;font-weight:800}.desktop-chat-directory summary::-webkit-details-marker{display:none}.desktop-chat-directory-list{max-height:310px;overflow:auto;padding:6px;border-top:1px solid var(--namaa-border);display:grid;gap:5px}.desktop-chat-directory-list button,.desktop-chat-directory-list a{width:100%;border:1px solid transparent;border-radius:10px;background:transparent;color:var(--namaa-text);text-decoration:none;display:grid;grid-template-columns:34px minmax(0,1fr);align-items:center;gap:8px;padding:7px;text-align:right;font:inherit}.desktop-chat-directory-list button:hover,.desktop-chat-directory-list a:hover{background:var(--namaa-surface);border-color:var(--namaa-border)}.desktop-chat-directory-list .avatar{width:34px;height:34px}.desktop-chat-directory-list strong,.desktop-chat-directory-list small{display:block}.desktop-chat-directory-list strong{font-size:11px;color:var(--namaa-text-strong)}.desktop-chat-directory-list small{font-size:9px;color:var(--namaa-muted);margin-top:2px}\n@media(max-width:1100px){.desktop-chat-controls{display:none!important}.desktop-chat-adaptive.desktop-threads-closed,.desktop-chat-adaptive.desktop-context-closed,.desktop-chat-adaptive.desktop-threads-closed.desktop-context-closed{grid-template-columns:minmax(0,1fr)}.desktop-chat-adaptive.desktop-threads-closed>.chat-list{display:none!important}}\n@media(max-width:767px){.desktop-only-flex,.desktop-chat-directory{display:none!important}.desktop-chat-adaptive,.desktop-chat-adaptive.desktop-threads-closed,.desktop-chat-adaptive.desktop-context-closed,.desktop-chat-adaptive.desktop-threads-closed.desktop-context-closed{display:block}}\n`;
fs.writeFileSync(cssPath,css,'utf8');
console.log('Applied Namaa desktop adaptive chat workspace and destination directory.');
