import fs from 'node:fs';

const root='apps/namaa-final-ui';
function replaceOnce(path, from, to){
  const full=`${root}/${path}`;
  const before=fs.readFileSync(full,'utf8');
  if(!before.includes(from)) throw new Error(`Expected conversation-ops target not found: ${path}`);
  fs.writeFileSync(full,before.replace(from,to),'utf8');
}

// Promote governance destinations into first-class operational channels in the mobile inbox.
replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  `<section className="mobile-inbox-section">\n        <header><strong>المجالس والمجموعات</strong><span>2</span></header>\n        <div className="mobile-contact-list">\n          <a className="mobile-contact-row" href="/meetings"><span className="mobile-contact-avatar governance"><Icon name="meetings" size={20}/></span><span className="mobile-contact-copy"><b>مجلس نماء واللجان</b><small>الاجتماعات، اللجان، المحاضر والمتابعة</small></span><Icon name="chevron" size={17}/></a>\n          <a className="mobile-contact-row" href="/central-bank"><span className="mobile-contact-avatar governance"><Icon name="banks" size={20}/></span><span className="mobile-contact-copy"><b>مجلس نماء المركزي</b><small>الاستقرار والتنسيق بين البنوك</small></span><Icon name="chevron" size={17}/></a>\n        </div>\n      </section>`,
  `<section className="mobile-inbox-section mobile-channel-section">\n        <header><strong>القنوات التشغيلية</strong><span>5</span></header>\n        <div className="mobile-contact-list">\n          <a className="mobile-contact-row mobile-channel-row" href="/meetings"><span className="mobile-contact-avatar governance"><Icon name="meetings" size={20}/></span><span className="mobile-contact-copy"><b>مجلس نماء واللجان</b><small>الاجتماعات، اللجان، المحاضر والمتابعة</small></span><span className="mobile-channel-tag">مجموعة</span></a>\n          <a className="mobile-contact-row mobile-channel-row" href="/central-bank"><span className="mobile-contact-avatar governance"><Icon name="banks" size={20}/></span><span className="mobile-contact-copy"><b>مجلس نماء المركزي</b><small>الاستقرار والتنسيق بين البنوك</small></span><span className="mobile-channel-tag">مجلس</span></a>\n          <a className="mobile-contact-row mobile-channel-row" href="/decisions"><span className="mobile-contact-avatar governance"><Icon name="decisions" size={20}/></span><span className="mobile-contact-copy"><b>متابعة القرارات</b><small>القرارات المفتوحة، الأدلة، والاعتمادات</small></span><span className="mobile-channel-tag">تشغيل</span></a>\n          <a className="mobile-contact-row mobile-channel-row" href="/budget"><span className="mobile-contact-avatar governance"><Icon name="budget" size={20}/></span><span className="mobile-contact-copy"><b>غرفة الميزانية</b><small>المتابعة والتحليل والطلبات المرتبطة بالميزانية</small></span><span className="mobile-channel-tag">مالي</span></a>\n          <a className="mobile-contact-row mobile-channel-row" href="/alerts"><span className="mobile-contact-avatar governance"><Icon name="alerts" size={20}/></span><span className="mobile-contact-copy"><b>قناة التنبيهات</b><small>التنبيهات التي تحتاج انتباهك أو متابعة</small></span><span className="mobile-channel-tag">تنبيه</span></a>\n        </div>\n      </section>`,
);

// Keep common governed actions inside the conversation context on phone.
replaceOnce(
  'src/components/ConversationWorkspace.tsx',
  '<div className="chat-messages"',
  `<nav className="mobile-chat-actions mobile-native-only" aria-label="إجراءات المحادثة">\n        <a href="/meetings"><Icon name="meetings" size={16}/><span>اجتماع</span></a>\n        <a href="/decisions"><Icon name="decisions" size={16}/><span>قرار</span></a>\n        <a href="/budget"><Icon name="budget" size={16}/><span>الميزانية</span></a>\n        <a href="/alerts"><Icon name="alerts" size={16}/><span>تنبيه</span></a>\n      </nav>\n\n      <div className="chat-messages"`,
);

const globalsPath=`${root}/src/app/globals.css`;
const css=fs.readFileSync(globalsPath,'utf8');
const marker='/* Namaa mobile conversation operations contract */';
if(css.includes(marker)) throw new Error('Conversation operations contract unexpectedly already exists');
fs.appendFileSync(globalsPath,`\n\n${marker}\n
@media(max-width:767px){
  .mobile-channel-section{padding-bottom:6px}
  .mobile-channel-row{grid-template-columns:48px minmax(0,1fr) auto!important}
  .mobile-channel-tag{align-self:center;justify-self:end;font-size:9px;font-weight:800;color:var(--namaa-green-900);background:color-mix(in srgb,var(--namaa-green-700) 8%,var(--namaa-surface));border:1px solid color-mix(in srgb,var(--namaa-green-700) 18%,var(--namaa-border));border-radius:999px;padding:4px 7px;white-space:nowrap}
  .mobile-chat-actions{display:flex!important;gap:7px;padding:9px 12px;border-bottom:1px solid var(--namaa-border);background:var(--namaa-surface);overflow-x:auto;scrollbar-width:none}
  .mobile-chat-actions::-webkit-scrollbar{display:none}
  .mobile-chat-actions>a{flex:0 0 auto;min-height:34px;padding:0 10px;border:1px solid var(--namaa-border);border-radius:999px;background:var(--namaa-surface-2);color:var(--namaa-text);text-decoration:none;display:flex;align-items:center;gap:6px;font-size:11px;font-weight:800;white-space:nowrap}
  .mobile-chat-actions>a .namaa-icon{color:var(--namaa-green-900)}
}
`,'utf8');

console.log('Applied Namaa mobile operational conversation channels and action tray.');
