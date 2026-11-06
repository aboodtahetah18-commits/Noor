/* Rakaez V25 preview — one-row controls, no duplicate page headings, functional tools.
   Reuses original financial records and handlers; never auto-deletes or posts entries. */
(function(){
'use strict';
if(typeof db==='undefined'||typeof render!=='function')return;
const current={};
const glyphs={
 plus:'<path d="M12 5v14M5 12h14"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
 filter:'<path d="M3 5h18l-7 8v7l-4-2v-5z"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
 edit:'<path d="M12 20h9M15 5l4 4M4 20l1-5L16 4a2 2 0 0 1 3 3L8 18l-4 2Z"/>',
 wallet:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M3 10h18M6 7V5a2 2 0 0 1 2-2h11"/>',
 file:'<path d="M6 3h9l5 5v13H6zM15 3v6h5M9 13h8M9 17h6"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18"/>',
 ledger:'<path d="M5 3h15v18H5zM9 3v18m3-13h5m-5 4h5m-5 4h5"/>',
 bank:'<path d="m3 9 9-6 9 6M3 9h18M5 9v10m5-10v10m4-10v10m5-10v10M3 21h18"/>',
 reconcile:'<path d="m5 11 4 4L19 5M3 20h18"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M5 21h14"/>',
 list:'<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
 close:'<path d="M6 6l12 12M18 6 6 18"/>'
};
const icon=id=>'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(glyphs[id]||glyphs.list)+'</svg>';
const escV=v=>esc(String(v==null?'':v));
const status={receivables:{term:'',filter:'all',search:false,filters:false},scheduled:{term:'',filter:'all',search:false,filters:false},documents:{term:'',filter:'all',search:false,filters:false},followups:{term:'',filter:'all',search:false,filters:false},spending:{term:'',filter:'all',search:false,filters:false}};
function btn(action,label,iconName,kind=''){
 return '<button type="button" class="v25-control '+kind+'" data-v25-action="'+action+'">'+icon(iconName)+'<span>'+escV(label)+'</span></button>';
}
function tools(kind,openAction='add'){
 return '<div class="v25-toolbar" role="toolbar" aria-label="إجراءات الصفحة">'+
 btn(kind+':'+openAction,'إضافة','plus','primary')+
 btn(kind+':filter','تصفية','filter')+
 btn(kind+':search','بحث','search')+'</div>';
}
function panels(kind,options){
 const s=status[kind];let html='';
 if(s.search)html+='<div class="v25-panel v25-search-panel"><label for="v25-search-'+kind+'">بحث</label><input id="v25-search-'+kind+'" type="search" data-v25-search="'+kind+'" autocomplete="off" value="'+escV(s.term)+'" placeholder="ابحث داخل السجلات"></div>';
 if(s.filters)html+='<div class="v25-panel v25-filter-options" data-rk-v18-filter="1">'+options.map(([key,label])=>'<button type="button" class="v25-choice '+(key===s.filter?'selected':'')+'" data-v25-choice="'+kind+'" data-v25-value="'+escV(key)+'">'+escV(label)+'</button>').join('')+'</div>';
 return html?'<div class="v25-panels">'+html+'</div>':'';
}
function matches(kind,obj,text,statusKey){
 const s=status[kind];
 if(s.filter!=='all'&&s.filter!==statusKey)return false;
 if(!s.term.trim())return true;
 const q=s.term.trim().toLocaleLowerCase('ar');
 return text.toLocaleLowerCase('ar').includes(q);
}
function row(kind,id,heading,detail,extra,iconName){
 return '<button type="button" class="v25-record" data-v25-record="'+kind+'" data-v25-id="'+escV(id)+'">'+
 '<span class="v25-record-icon">'+icon(iconName)+'</span>'+
 '<span class="v25-record-info"><strong>'+escV(heading)+'</strong><small>'+escV(detail)+'</small></span>'+
 '<span class="v25-record-extra">'+escV(extra)+'</span><span class="v25-record-eye">'+icon('eye')+'</span></button>';
}
function pageShell(kind,buttons,content){
 return '<section class="v25-page" aria-label="محتوى الصفحة">'+buttons+panels(kind,({receivables:[['all','الكل'],['due','قيد التحصيل'],['paid','المحصّلة']],scheduled:[['all','الكل'],['planned','المجدولة'],['paused','المتوقفة']],documents:[['all','الكل'],['file','بملف'],['virtual','دون ملف']],followups:[['all','الكل'],['active','النشطة'],['completed','المتحقق منها']],spending:[['all','الكل'],['attention','تحتاج مراجعة'],['normal','دون انحراف']]}[kind]||[['all','الكل']]))+
 '<div class="v25-list" data-v25-list="'+kind+'">'+content+'</div></section>';
}
function receivablesList(){
 const rows=(db.receivables||[]).filter(x=>{
  const left=Math.max(0,Number(x.principal||0)-Number(rkReceivableCollected(x.id)||0));
  const key=left>0?'due':'paid';
  return matches('receivables',x,[x.name,x.party,x.due].join(' '),key);
 });
 return rows.length?rows.map(x=>{
  const left=Math.max(0,Number(x.principal||0)-Number(rkReceivableCollected(x.id)||0));
  return row('receivable',x.id,x.name,x.party||'غير محدد',money(left),'wallet');
 }).join(''):'<div class="v25-empty">لا توجد مستحقات مطابقة.</div>';
}
rkReceivablesView=function(){
 rkEnsure();
 return pageShell('receivables',tools('receivables'),receivablesList());
};
function scheduledList(){
 const rows=(db.scheduledOps||[]).filter(x=>matches('scheduled',x,[x.name,x.start,x.status].join(' '),x.status==='paused'?'paused':'planned'));
 return rows.length?rows.map(x=>row('scheduled',x.id,x.name,(x.status==='paused'?'متوقفة':'مجدولة')+' · '+(x.start||'—'),money(rkScheduledEstimated(x)),'calendar')).join(''):'<div class="v25-empty">لا توجد عمليات مجدولة مطابقة.</div>';
}
rkScheduledView=function(){
 rkEnsure();
 return pageShell('scheduled',tools('scheduled'),scheduledList());
};
function documentsList(){
 const rows=(db.docs||[]).filter(x=>matches('documents',x,[x.name,x.kind,x.fileName].join(' '),x.fileName?'file':'virtual'));
 const kinds={receipt:'فاتورة أو إيصال',contract:'عقد',bank:'كشف حساب',investment:'مستند استثماري',other:'مستند آخر'};
 return rows.length?rows.map(x=>row('document',x.id,x.name,kinds[x.kind]||x.kind||'مستند',x.fileName||'دون ملف','file')).join(''):'<div class="v25-empty">لا توجد مستندات مطابقة.</div>';
}
rkDocumentsView=function(){
 rkEnsure();
 return pageShell('documents',tools('documents'),documentsList());
};
function ledgerButtons(){
 return '<div class="v25-toolbar v25-ledger-tools" role="toolbar" aria-label="إجراءات دفتر الأستاذ">'+
 btn('ledger:entry','حركة مالية','plus','primary')+
 btn('ledger:opening','رصيد','bank')+
 btn('ledger:reconcile','مطابقة','reconcile')+
 btn('ledger:export','تصدير','download')+'</div>';
}
ledgerView=function(){
 const entries=(db.ledgerEntries||[]).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 const cards=entries.map(e=>{
  const debit=(e.lines||[]).reduce((s,l)=>s+Number(l.debit||0),0),
  credit=(e.lines||[]).reduce((s,l)=>s+Number(l.credit||0),0);
  const reversed=Boolean(e.reversalOf||(db.ledgerEntries||[]).some(x=>x.reversalOf===e.id));
  return '<article class="v25-ledger-entry"><div class="v25-ledger-line"><span>التاريخ</span><strong>'+escV(e.date)+'</strong></div>'+
  '<div class="v25-ledger-line"><span>البيان</span><strong>'+escV(e.description||'قيد مالي')+'</strong></div>'+
  '<div class="v25-ledger-pair"><div><small>مدين</small><strong>'+money(debit)+'</strong></div><div><small>دائن</small><strong>'+money(credit)+'</strong></div></div>'+
  '<div class="v25-ledger-bottom"><span class="'+(debit===credit?'v25-balanced':'v25-unbalanced')+'">'+(debit===credit?'متوازن':'غير متوازن')+'</span>'+
  '<button type="button" class="v25-ledger-reverse" data-v25-reverse="'+escV(e.id)+'" '+(reversed?'disabled':'')+'>'+icon('reconcile')+' عكس القيد</button></div></article>';
 }).join('');
 return '<section class="v25-page">'+ledgerButtons()+
 '<div class="v25-list">'+(cards||'<div class="v25-empty">لا توجد قيود يومية. يمكنك إدخال الرصيد الافتتاحي أو حركة مالية من الأزرار أعلاه.</div>')+'</div></section>';
};
function followed(){
 const rows=(db.merchantFollowups||[]).slice().sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
 const names={OPEN:'بانتظار المراجعة',IN_PROGRESS:'قيد التنفيذ',MONITORING:'مراقبة الأثر',BLOCKED:'تحتاج دعمًا',VERIFIED:'تم التحقق'};
 return rows.filter(c=>{
  const key=c.status==='VERIFIED'?'completed':'active';
  return matches('followups',c,[c.merchantName,c.owner,c.nextReview,names[c.status]].join(' '),key)
 }).map(c=>row('followup',c.id,c.merchantName,names[c.status]||'متابعة',c.nextReview||'—','eye')).join('')||'<div class="v25-empty">لا توجد حالات متابعة مطابقة.</div>';
}
function spendRows(){
 rkMerchantSnapshot=rkMerchantMonitored();
 const names={OVER:'تجاوز الميزانية',WATCH:'قرب الحد',RISING:'ارتفاع الإنفاق',NORMAL:'لا انحراف مثبت'};
 return rkMerchantSnapshot.slice(0,40).map((m,index)=>({...m,index})).filter(m=>matches('spending',m,[m.name,m.categoryName,names[m.pressure]].join(' '),m.pressure==='NORMAL'?'normal':'attention'))
 .map(m=>'<button type="button" class="v25-record" data-v25-merchant="'+m.index+'">'+
 '<span class="v25-record-icon">'+icon('wallet')+'</span><span class="v25-record-info"><strong>'+escV(m.name)+'</strong><small>'+escV(names[m.pressure]||'مراجعة')+' · '+escV(m.categoryName)+'</small></span>'+
 '<span class="v25-record-extra">'+money(m.current)+'</span><span class="v25-record-eye">'+icon('eye')+'</span></button>').join('')||
 '<div class="v25-empty">لا توجد بيانات مراقبة مطابقة.</div>';
}
function subNav(selected){
 return '<nav class="v25-sub-nav" aria-label="إدارة المتابعة">'+
 '<button type="button" class="'+(selected==='spending'?'active':'')+'" data-v25-nav="spending">مراقبة الموردين</button>'+
 '<button type="button" class="'+(selected==='followups'?'active':'')+'" data-v25-nav="spending-followups">متابعة الإجراءات</button></nav>';
}
rkSpendingFollowupsView=function(){
 return '<section class="v25-page">'+subNav('followups')+
 '<div class="v25-toolbar v25-toolbar-two">'+btn('followups:filter','تصفية','filter')+btn('followups:search','بحث','search')+'</div>'+
 panels('followups',[['all','الكل'],['active','النشطة'],['completed','المتحقق منها']])+
 '<div class="v25-list" data-v25-list="followups">'+followed()+'</div></section>';
};
rkSpendingView=function(){
 return '<section class="v25-page">'+subNav('spending')+
 '<div class="v25-toolbar v25-toolbar-two">'+btn('spending:filter','تصفية','filter')+btn('spending:search','بحث','search')+'</div>'+
 panels('spending',[['all','الكل'],['attention','تحتاج مراجعة'],['normal','دون انحراف']])+
 '<div class="v25-list" data-v25-list="spending">'+spendRows()+'</div></section>';
};
const lists={receivables:receivablesList,scheduled:scheduledList,documents:documentsList,followups:followed,spending:spendRows};
function updateList(kind){const target=document.querySelector('[data-v25-list="'+kind+'"]');if(target&&lists[kind])target.innerHTML=lists[kind]()}
function action(request){
 if(request==='ledger:entry')return ledgerForm();
 if(request==='ledger:opening')return ledgerOpen();
 if(request==='ledger:reconcile')return ledgerReconcile();
 if(request==='ledger:export')return ledgerCsv();
 const [kind,cmd]=request.split(':');
 if(!status[kind])return;
 if(cmd==='add'){if(kind==='receivables')return rkOpen('receivable');if(kind==='scheduled')return rkOpen('scheduled');if(kind==='documents')return rkOpen('document')}
 if(cmd==='search'){status[kind].search=!status[kind].search;status[kind].filters=false}
 if(cmd==='filter'){status[kind].filters=!status[kind].filters;status[kind].search=false}
 render();
 if(cmd==='search'&&status[kind].search)document.getElementById('v25-search-'+kind)?.focus({preventScroll:true});
}
function cleanRepeatedTitles(){
 const view=document.getElementById('view');
 if(!view)return;
 // Match only the standalone heading at the top of a page, not section-specific headings.
 const current=(document.getElementById('pageTitle')?.textContent||'').trim();
 for(const candidate of [...view.querySelectorAll(':scope > .sectiontitle, :scope > .v19-cycle-page > .v19-section-title, :scope > .v18-sectionhead')]){
  const heading=candidate.querySelector('h1,h2');
  const text=heading?.textContent.trim()||'';
  if(text&&current&&(text===current||text.startsWith(current)||current.startsWith(text)))heading.remove();
  if(!candidate.querySelector('h1,h2,button'))candidate.remove();
 }
 if(page==='cycles'){
  const section=view.querySelector('.v19-cycle-page');
  if(section){
   section.classList.add('v25-cycle-page');
   const title=section.querySelector(':scope > .v19-section-title');
   if(title){title.classList.add('v25-cycle-actions');title.querySelector('h2')?.remove()}
   section.querySelector(':scope > .v19-help')?.remove();
  }
 }
}
function cleanIcons(){
 const view=document.getElementById('view');if(!view)return;
 view.querySelectorAll('.rk-study-tabs button,.v25-sub-nav button,.v25-toolbar button,.v25-record').forEach(btn=>{
  btn.querySelectorAll(':scope > .rakaez-action-icon').forEach(icon=>icon.remove());
  btn.classList.remove('rakaez-action-button');
 });
}
const oldRender=render;
render=function(){
 const result=oldRender.apply(this,arguments);
 cleanRepeatedTitles();cleanIcons();
 return result;
};
document.addEventListener('click',event=>{
 const b=event.target.closest('[data-v25-action],[data-v25-choice],[data-v25-record],[data-v25-reverse],[data-v25-merchant],[data-v25-nav]');
 if(!b)return;
 if(b.hasAttribute('data-v25-action')){event.preventDefault();return action(b.dataset.v25Action)}
 if(b.hasAttribute('data-v25-choice')){
  event.preventDefault();
  const kind=b.dataset.v25Choice;
  if(!status[kind])return;
  status[kind].filter=b.dataset.v25Value;status[kind].filters=false;return render();
 }
 if(b.hasAttribute('data-v25-record')){
  event.preventDefault();
  const kind=b.dataset.v25Record,id=b.dataset.v25Id;
  if(kind==='followup')return rkMerchantCaseDialog(id);
  return rkRecordView(kind,id);
 }
 if(b.hasAttribute('data-v25-reverse')){event.preventDefault();return ledgerReverse(b.dataset.v25Reverse)}
 if(b.hasAttribute('data-v25-merchant')){event.preventDefault();return rkMerchantCreateCase(Number(b.dataset.v25Merchant))}
 if(b.hasAttribute('data-v25-nav')){event.preventDefault();return navigate(b.dataset.v25Nav)}
});
document.addEventListener('input',event=>{
 const kind=event.target.dataset.v25Search;
 if(!kind||!status[kind])return;
 status[kind].term=event.target.value;updateList(kind);
});
render();
})();