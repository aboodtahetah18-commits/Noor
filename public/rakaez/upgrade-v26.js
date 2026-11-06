/* Rakaez V26 — semantic icon identities for navigation.
   A single symbol represents one meaning; repeated occurrences of the same action keep its symbol. */
(function(){
'use strict';
if(typeof icons==='undefined'||typeof N==='undefined')return;
const navIcons={
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 receipt:'<path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
 building:'<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 3"/>',
 clipboard:'<rect x="5" y="5" width="14" height="17" rx="2"/><path d="M9 3h6l1 4H8l1-4ZM9 12h6M9 16h6"/>',
 document:'<path d="M6 3h9l5 5v13H6zM15 3v5h5M9 12h8M9 16h7"/>'
};
for(const [key,value] of Object.entries(navIcons))icons[key]=value;
const navMeanings={
 hilal:'moon',malaa:'shield',assets:'trend',goals:'target',
 debts:'fund',fees:'receipt',reserves:'bank',position:'pie',
 interbank:'transfer',insights:'home',ledger:'reconcile',
 transactions:'wallet',funding:'payment',import:'upload',
 reports:'chart',settings:'settings',cycles:'calendar',
 externalBanks:'building',spending:'analysis',
 'spending-followups':'clipboard',scheduled:'clock',
 receivables:'income',documents:'document'
};
for(const item of N){
 const meaning=navMeanings[item[0]];
 if(meaning&&Object.prototype.hasOwnProperty.call(icons,meaning))item[2]=meaning;
}
if(typeof drawNav==='function')drawNav();
if(typeof rakaezDecorateButtons==='function')rakaezDecorateButtons(document);
})();


/* Rakaez v27 — governed compact financial surfaces, Arabic labels and coherent mobile dialogs.
   Presentation only; original banking/accounting posting rules stay unchanged. */
(function(){
'use strict';
if(typeof db==='undefined'||typeof render!=='function'||typeof money!=='function')return;
const safe=v=>esc(String(v==null?'':v));
const iconPaths={
 document:'<path d="M6 3h9l5 5v13H6zM15 3v5h5M9 12h8M9 16h7"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 close:'<path d="M6 6l12 12M18 6 6 18"/>',
 edit:'<path d="M12 20h9M15 5l4 4M4 20l1-5L16 4a2 2 0 0 1 3 3L8 18l-4 2Z"/>',
 collect:'<path d="M4 7h16v12H4zM4 10h16M8 15h5"/>',
 pause:'<path d="M6 4v16M18 4v16"/><path d="M9 12a6 6 0 0 1 6-6"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18"/>',
 bank:'<path d="m3 9 9-6 9 6M3 9h18M5 9v10m5-10v10m4-10v10m5-10v10M3 21h18"/>'
};
const symbol=name=>'<svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+(iconPaths[name]||iconPaths.document)+'</svg>';
const labelCenter=id=>id?bankName(id):'غير محدد';
const percent=n=>new Intl.NumberFormat('ar-SA-u-nu-latn',{maximumFractionDigits:2}).format(Number(n)||0)+'%';
const metric=(label,value,tone)=>'<div class="v27-metric '+(tone?'v27-'+tone:'')+'"><span>'+safe(label)+'</span><strong>'+value+'</strong></div>';
const pageHead=(title,action,label,iconName)=>'<header class="v27-pagehead"><h2>'+safe(title)+'</h2><button type="button" class="v27-main-action" data-v27-action="'+action+'">'+symbol(iconName)+'<span>'+safe(label)+'</span></button></header>';
const note=text=>'<p class="v27-note">'+safe(text)+'</p>';
const noRecords=text=>'<p class="v27-empty">'+safe(text)+'</p>';

interbankView=function(){
 const items=(db.interbankPlans||[]).map(f=>{
  const cost=Math.round(Number(f.principal||0)*Number(f.rate||0)*Number(f.months||0)/1200);
  return '<article class="v27-card v27-interbank-card">'+
   '<div class="v27-card-head"><strong>طلب تمويل بين المراكز</strong><span class="v27-state v27-state-study">للدراسة فقط</span></div>'+
   '<div class="v27-centers"><div><small>الجهة المقرضة</small><b>'+safe(labelCenter(f.from))+'</b></div><span class="v27-route-arrow" aria-hidden="true">←</span><div><small>الجهة المستفيدة</small><b>'+safe(labelCenter(f.to))+'</b></div></div>'+
   '<div class="v27-metrics">'+metric('أصل التمويل',money(f.principal),'blue')+metric('التكلفة التقديرية',money(cost),'red')+
   metric('المعدل السنوي',percent(f.rate),'navy')+metric('المدة',safe(f.months)+' شهر','navy')+'</div>'+
   '</article>';
 }).join('');
 return '<section class="v27-screen" aria-label="طلبات التمويل بين المراكز">'+
  pageHead('طلبات التمويل بين المراكز','new-interbank','طلب جديد','document')+
  '<div class="v27-cardgrid">'+(items||noRecords('لا توجد طلبات تمويل بين المراكز.'))+'</div>'+
  note('طلبات تخطيطية بين المراكز المالية. لا تُنفّذ تحويلات ولا تتغير الأرصدة عند إنشاء الطلب.')+
  '</section>';
};
fundings=function(){
 const items=(db.fundings||[]).map(f=>{
  const category=db.categories.find(c=>c.id===f.category);
  const principal=Number(f.principal||0),paid=Number(f.paid||0),cost=Math.round(principal*Number(f.rate||0)*Number(f.months||0)/1200);
  const route=f.sourceCenter||f.targetCenter?
   '<div class="v27-centers"><div><small>المركز الممول</small><b>'+safe(labelCenter(f.sourceCenter))+'</b></div><span class="v27-route-arrow" aria-hidden="true">←</span><div><small>المركز المستفيد</small><b>'+safe(labelCenter(f.targetCenter))+'</b></div></div>':'';
  return '<article class="v27-card v27-funding-card"><div class="v27-card-head"><strong>'+safe(category?.name||'تمويل داخلي')+'</strong><span class="v27-state v27-state-internal">تمويل داخلي</span></div>'+route+
  '<div class="v27-metrics">'+metric('أصل التمويل',money(principal),'blue')+metric('المتبقي من الأصل',money(Math.max(0,principal-paid)),'gold')+
  metric('المعدل السنوي',percent(f.rate),'navy')+metric('المدة',safe(f.months)+' شهر','navy')+
  metric('الربح البسيط التقديري',money(cost),'red')+metric('إجمالي السداد المخطط',money(principal+cost),'navy')+'</div>'+
  '<div class="v27-card-footer"><button type="button" class="v27-subaction" data-v27-action="repay" data-v27-id="'+safe(f.id)+'">'+symbol('collect')+'<span>تسجيل سداد من الأصل</span></button></div></article>';
 }).join('');
 return '<section class="v27-screen" aria-label="عقود التمويل الداخلي">'+
  pageHead('عقود التمويل الداخلي','new-funding','إضافة عقد','plus')+
  '<div class="v27-cardgrid">'+(items||noRecords('لا توجد عقود تمويل داخلي مسجلة.'))+'</div>'+
  note('المركز الممول والمستفيد قابلان للتحديد لكل عقد جديد. العقود التخطيطية لا تضيف نقداً تلقائياً ولا تنفذ حركة مصرفية.')+
  '</section>';
};
const priorOpenModal=openModal;
openModal=function(type,id){
 const result=priorOpenModal.apply(this,arguments);
 if(type!=='funding')return result;
 const grid=document.querySelector('#modalRoot .modalbody .formgrid');
 if(!grid||grid.querySelector('#v27SourceCenter'))return result;
 const options=[['','اختر المركز'],['hilal','بنك الهلال'],['malaa','بنك ملاءة'],['assets','بنك الأصول']]
  .map(a=>'<option value="'+a[0]+'">'+a[1]+'</option>').join('');
 const container=document.createElement('div');
 container.className='v27-funding-centers';
 container.innerHTML='<div class="field"><label for="v27SourceCenter">المركز الممول</label><select id="v27SourceCenter" required>'+options+'</select></div>'+
 '<div class="field"><label for="v27TargetCenter">المركز المستفيد</label><select id="v27TargetCenter" required>'+options+'</select></div>';
 grid.prepend(container);
 const h=document.querySelector('#modalRoot .modalhead h2');
 if(h)h.textContent='إضافة عقد تمويل داخلي';
 return result;
};
const priorSubmitModal=submitModal;
submitModal=function(type,id){
 if(type!=='funding')return priorSubmitModal.apply(this,arguments);
 const from=document.getElementById('v27SourceCenter')?.value||'';
 const to=document.getElementById('v27TargetCenter')?.value||'';
 if(!from||!to){if(typeof toast==='function')toast('حدد المركز الممول والمركز المستفيد');return}
 const priorIds=new Set((db.fundings||[]).map(f=>f.id));
 const result=priorSubmitModal.apply(this,arguments);
 const added=(db.fundings||[]).find(f=>!priorIds.has(f.id));
 if(added){added.sourceCenter=from;added.targetCenter=to;save();render()}
 return result;
};

const scheduleKinds={allocation:'تخصيص مالي',transfer:'تحويل مالي',savings:'ادخار',saving:'ادخار',payment:'سداد',expense:'مصروف',income:'دخل',deposit:'إيداع',withdrawal:'سحب',investment:'استثمار',other:'عملية أخرى'};
const periods={daily:'يومي',weekly:'أسبوعي',monthly:'شهري',quarterly:'ربع سنوي',semiannual:'نصف سنوي',annual:'سنوي',yearly:'سنوي',once:'مرة واحدة',one_time:'مرة واحدة'};
const localKind=v=>scheduleKinds[v]||safe(v||'غير محدد');
const localPeriod=v=>periods[v]||safe(v||'غير محدد');
const priorRecordView=rkRecordView;
rkRecordView=function(type,id){
 if(type!=='receivable'&&type!=='scheduled')return priorRecordView.apply(this,arguments);
 rkEnsure();
 const records=type==='receivable'?db.receivables:db.scheduledOps;
 const item=(records||[]).find(x=>x.id===id);
 if(!item)return;
 let content='',footer='',state='';
 if(type==='receivable'){
  const collected=Number(rkReceivableCollected(id)||0),principal=Number(item.principal||0);
  const remaining=Math.max(0,principal-collected);
  const overdue=remaining>0&&item.due&&String(item.due)<new Date().toISOString().slice(0,10);
  state=remaining===0?'محصّل بالكامل':overdue?'متأخر عن الاستحقاق':'قيد التحصيل';
  content='<div class="v27-modal-metrics">'+metric('أصل المستحق',money(principal),'blue')+
   metric('المحصّل',money(collected),'teal')+metric('المتبقي',money(remaining),overdue?'red':'gold')+'</div>'+
   '<div class="v27-facts"><div><span>الجهة</span><strong>'+safe(item.party||'غير محددة')+'</strong></div>'+
   '<div><span>تاريخ الاستحقاق</span><strong>'+safe(item.due||'غير محدد')+'</strong></div></div>';
  footer='<button class="v27-subaction" data-v27-action="collect" data-v27-id="'+safe(id)+'">'+symbol('collect')+'<span>تسجيل تحصيل</span></button>'+
  '<button class="v27-main-action" data-v27-action="edit-receivable" data-v27-id="'+safe(id)+'">'+symbol('edit')+'<span>تعديل</span></button>';
 }else{
  state=item.status==='paused'?'موقوفة مؤقتاً':'مجدولة';
  content='<div class="v27-modal-metrics v27-modal-metrics-two">'+metric('المبلغ التقديري',money(rkScheduledEstimated(item)),'blue')+
  metric('حالة العملية',safe(state),item.status==='paused'?'gold':'teal')+'</div>'+
  '<div class="v27-facts"><div><span>نوع العملية</span><strong>'+localKind(item.kind)+'</strong></div>'+
  '<div><span>الدورية</span><strong>'+localPeriod(item.period)+'</strong></div>'+
  '<div><span>أول استحقاق</span><strong>'+safe(item.start||'غير محدد')+'</strong></div></div>';
  footer='<button class="v27-subaction" data-v27-action="toggle-scheduled" data-v27-id="'+safe(id)+'">'+symbol('pause')+'<span>'+(item.status==='paused'?'استئناف العملية':'إيقاف مؤقت')+'</span></button>'+
  '<button class="v27-main-action" data-v27-action="edit-scheduled" data-v27-id="'+safe(id)+'">'+symbol('edit')+'<span>تعديل</span></button>';
 }
 document.getElementById('modalRoot').innerHTML='<div class="modalbg v27-overlay" data-v27-overlay>'+
  '<section class="v27-dialog" role="dialog" aria-modal="true" aria-label="تفاصيل '+safe(item.name)+'">'+
  '<header class="v27-dialog-head"><button type="button" class="v27-close" data-v27-action="close" aria-label="إغلاق">'+symbol('close')+'</button>'+
  '<div class="v27-dialog-heading"><h2>'+safe(item.name)+'</h2><span>'+safe(state)+'</span></div></header>'+
  '<div class="v27-dialog-body">'+content+'</div><footer class="v27-dialog-footer">'+footer+'</footer></section></div>';
};

function chooseSalaryMonth(){
 const d=new Date(),day=Number(db.cycleDay||25);
 const first=new Date(d.getFullYear(),d.getMonth()+(d.getDate()>day?1:0),1);
 const period=first.getFullYear()+'-'+String(first.getMonth()+1).padStart(2,'0');
 document.getElementById('modalRoot').innerHTML='<div class="modalbg v27-overlay" data-v27-overlay>'+
  '<section class="v27-dialog v27-month-dialog" role="dialog" aria-modal="true" aria-labelledby="v27MonthTitle">'+
  '<header class="v27-dialog-head"><button class="v27-close" type="button" data-v27-action="close" aria-label="إغلاق">'+symbol('close')+'</button>'+
  '<div class="v27-dialog-heading"><h2 id="v27MonthTitle">إنشاء دورة راتب</h2><span>اختر الشهر الذي ستُعد له الدورة</span></div></header>'+
  '<div class="v27-dialog-body"><label class="v27-month-label" for="v27CycleMonth">شهر الدورة</label>'+
  '<input id="v27CycleMonth" type="month" required value="'+period+'">'+
  '<p class="v27-note">سوف تراجع تفاصيل الدورة قبل اعتمادها. لا تجري أي تحويلات بنكية تلقائياً.</p></div>'+
  '<footer class="v27-dialog-footer"><button type="button" class="v27-subaction" data-v27-action="close">إلغاء</button>'+
  '<button type="button" class="v27-main-action" data-v27-action="confirm-cycle">'+symbol('calendar')+'<span>فتح الدورة</span></button></footer></section></div>';
}
function openSalaryCycle(){
 const month=document.getElementById('v27CycleMonth');
 if(!month||!month.value||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month.value)){month?.reportValidity();return}
 const value=month.value;
 closeModal();
 const trigger=document.createElement('button');
 trigger.hidden=true;trigger.dataset.v19Open=value;
 document.body.appendChild(trigger);trigger.click();trigger.remove();
}
function afterRender(){
 const view=document.getElementById('view');
 if(!view)return;
 if(page==='cycles'){
  const heading=view.querySelector('.v25-cycle-actions,.v19-section-title');
  if(heading&&!heading.querySelector('h2')&&heading.querySelector('[data-v19-action="new-cycle"]')){
   const title=document.createElement('h2');title.textContent='دورات الراتب';heading.prepend(title);
  }
 }
 translateVisible(view);
}
const translations={allocation:'تخصيص مالي',monthly:'شهري',weekly:'أسبوعي',daily:'يومي',
 quarterly:'ربع سنوي',semiannual:'نصف سنوي',annual:'سنوي',yearly:'سنوي',
 planned:'مجدولة',paused:'موقوفة مؤقتاً',income:'دخل',expense:'مصروف',
 transfer:'تحويل',deposit:'إيداع',withdrawal:'سحب',payment:'سداد',
 receipt:'إيصال',contract:'عقد',investment:'استثمار',other:'أخرى',
 active:'نشطة',completed:'مكتملة',once:'مرة واحدة'};
function translateVisible(root){
 if(!root||!document.createTreeWalker)return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 let node;while((node=walker.nextNode())){
  const parent=node.parentElement;
  if(!parent||parent.closest('script,style'))continue;
  const raw=node.nodeValue||'',key=raw.trim();
  if(Object.prototype.hasOwnProperty.call(translations,key)){
   node.nodeValue=raw.replace(key,translations[key]);
  }
 }
}
const priorRender=render;
render=function(){
 const result=priorRender.apply(this,arguments);
 afterRender();
 return result;
};
document.addEventListener('click',event=>{
 const cycle=event.target.closest('[data-v19-action="new-cycle"]');
 if(cycle){
  event.preventDefault();event.stopImmediatePropagation();chooseSalaryMonth();return;
 }
 const control=event.target.closest('[data-v27-action]');
 if(!control)return;
 event.preventDefault();
 const action=control.dataset.v27Action,id=control.dataset.v27Id||'';
 if(action==='new-interbank')return interbankForm();
 if(action==='new-funding')return openModal('funding');
 if(action==='repay')return openModal('repay',id);
 if(action==='edit-receivable')return rkOpen('receivable',id);
 if(action==='edit-scheduled')return rkOpen('scheduled',id);
 if(action==='collect')return rkOpen('collection',id);
 if(action==='toggle-scheduled'){rkToggleSchedule(id);return rkRecordView('scheduled',id)}
 if(action==='close')return closeModal();
 if(action==='confirm-cycle')return openSalaryCycle();
},true);
document.addEventListener('click',event=>{
 if(event.target.matches('[data-v27-overlay]'))closeModal();
});
const modalRoot=document.getElementById('modalRoot');
if(modalRoot){
 const observer=new MutationObserver(()=>translateVisible(modalRoot));
 observer.observe(modalRoot,{childList:true,subtree:true});
}
render();
})();



/* Rakaez v29 — full, always-visible double-entry journal in genuine ledger order.
   Every account and posting stays visible. Accounting/reversal functions are unchanged. */
(function(){
'use strict';
if(typeof ledgerView!=='function'||typeof db==='undefined'||typeof money!=='function')return;
const originalLedgerView=ledgerView;
const escapeText=v=>esc(String(v===undefined||v===null?'':v));
const accountNames={
 hilal:'نقد الهلال',malaa:'نقد ملاءة',assets:'نقد الأصول',
 salary:'إيراد الراتب',expense:'مصروفات التشغيل',
 outside:'الرصيد الافتتاحي'
};
const reverseGlyph='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 14-5-5 5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-2"/></svg>';
const monetary=n=>money(Number(n)||0);
const amountCell=(n,type)=>Number(n)>0?
 '<strong class="v29-amount v29-amount-'+type+'">'+monetary(n)+'</strong>':
 '<span class="v29-empty-amount" aria-label="لا يوجد">—</span>';
function postingLine(line){
 return '<div class="v29-ledger-row" role="row">'+
  '<div class="v29-account-name" role="cell">'+escapeText(accountNames[line.account]||'حساب آخر')+'</div>'+
  '<div class="v29-ledger-cell v29-debit-cell" role="cell">'+amountCell(line.debit,'debit')+'</div>'+
  '<div class="v29-ledger-cell v29-credit-cell" role="cell">'+amountCell(line.credit,'credit')+'</div></div>';
}
function journalCard(entry){
 const lines=Array.isArray(entry.lines)?entry.lines:[];
 const debit=lines.reduce((sum,line)=>sum+(Number(line.debit)||0),0);
 const credit=lines.reduce((sum,line)=>sum+(Number(line.credit)||0),0);
 const isBalanced=debit===credit&&debit>0;
 const isReversal=Boolean(entry.reversalOf);
 const wasReversed=(db.ledgerEntries||[]).some(other=>other.reversalOf===entry.id);
 const isLocked=isReversal||wasReversed;
 const status=isBalanced?'متوازن':'غير متوازن';
 const action=isLocked?
  '<span class="v29-already-reversed">'+(isReversal?'قيد عكسي':'تم عكس القيد')+'</span>':
  '<button type="button" class="v29-reverse" data-v25-reverse="'+escapeText(entry.id)+'" aria-label="عكس القيد: '+escapeText(entry.description||'قيد مالي')+'">'+reverseGlyph+'<span>عكس القيد</span></button>';
 return '<article class="v29-journal-card '+(isBalanced?'v29-journal-balanced':'v29-journal-unbalanced')+'">'+
  '<header class="v29-journal-head"><div class="v29-journal-identity">'+
  '<strong>'+escapeText(entry.description||'قيد مالي')+'</strong>'+
  '<time datetime="'+escapeText(entry.date||'')+'">'+escapeText(entry.date||'التاريخ غير محدد')+'</time></div>'+
  '<span class="v29-journal-status '+(isBalanced?'v29-status-balanced':'v29-status-unbalanced')+'">'+status+'</span></header>'+
  '<div class="v29-journal-table" role="table" aria-label="تفاصيل القيد المحاسبي">'+
  '<div class="v29-ledger-row v29-ledger-columns" role="row">'+
   '<div role="columnheader">الحساب</div>'+
   '<div role="columnheader" class="v29-debit-label">مدين</div>'+
   '<div role="columnheader" class="v29-credit-label">دائن</div></div>'+
   (lines.map(postingLine).join('')||'<div class="v29-no-postings">لا توجد حسابات مرتبطة بالقيد.</div>')+
  '<div class="v29-ledger-row v29-ledger-totals" role="row">'+
   '<div role="cell">الإجمالي</div>'+
   '<div class="v29-ledger-cell v29-debit-cell" role="cell">'+amountCell(debit,'debit')+'</div>'+
   '<div class="v29-ledger-cell v29-credit-cell" role="cell">'+amountCell(credit,'credit')+'</div></div></div>'+
  '<footer class="v29-journal-footer">'+
  '<span class="v29-journal-caption">'+(isBalanced?'القيد متوازن ومثبت في دفتر الأستاذ':'تنبيه: لا يتساوى إجمالي المدين والدائن')+'</span>'+
  action+'</footer></article>';
}
ledgerView=function(){
 const original=originalLedgerView.apply(this,arguments);
 const root=document.createElement('div');
 root.innerHTML=original;
 const page=root.querySelector('.v25-page');
 const listing=page?.querySelector('.v25-list');
 if(!page||!listing)return original;
 const entries=(db.ledgerEntries||[]).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
 page.classList.add('v29-ledger-page');
 listing.classList.add('v29-journal-grid');
 listing.innerHTML=entries.length?
  entries.map(journalCard).join(''):
  '<div class="v25-empty">لا توجد قيود يومية. يمكنك إضافة حركة مالية أو إثبات رصيد افتتاحي.</div>';
 return page.outerHTML;
};
})();


/* Rakaez v30 — unified financial page composition.
   Reuses existing database data, approved colour tokens and original mutation handlers. */
(function(){
'use strict';
if(typeof db==='undefined'||typeof render!=='function'||typeof money!=='function')return;
const safe=v=>esc(String(v==null?'':v));
const amount=n=>money(Number(n)||0);
const field=(label,value,tone='navy')=>'<div class="v30-field v30-tone-'+tone+'"><span>'+safe(label)+'</span><strong>'+value+'</strong></div>';
const section=(title,action,label)=>'<header class="v30-section-heading"><h2>'+safe(title)+'</h2>'+
 (action?'<button type="button" class="v30-add" data-v30-action="'+action+'"><span aria-hidden="true">＋</span> '+safe(label||'إضافة')+'</button>':'')+'</header>';
const empty=label=>'<p class="v30-empty">'+safe(label)+'</p>';
const intro=label=>'<p class="v30-subtext">'+safe(label)+'</p>';
const cardAction=(action,id,description,content,className='')=>'<button type="button" class="v30-record '+className+'" data-v30-action="'+action+'" data-v30-id="'+safe(id)+'" aria-label="تفاصيل '+safe(description)+'">'+content+'</button>';
const cardFooter=(label,action='عرض التفاصيل')=>'<footer class="v30-record-footer"><span>'+safe(label)+'</span><b>'+safe(action)+'</b></footer>';
const pill=(label,tone)=>'<span class="v30-pill v30-pill-'+tone+'">'+safe(label)+'</span>';

debtsView=function(){
 const records=(db.debts||[]).slice().sort((a,b)=>String(a.due||a.date||'9999').localeCompare(String(b.due||b.date||'9999')));
 return '<section class="v30-financial-page">'+section('الالتزامات المسجلة','add-debt','إضافة التزام')+
 intro('الأصل المسجل والمسدّد والمتبقي والأقساط، دون خلطها بأرصدة البنوك.')+
 '<div class="v30-record-grid">'+(records.map(d=>{
  const principal=Number(d.principal||0),paid=Number(d.paid||0),left=Math.max(0,principal-paid);
  const when=d.due||d.date||'غير محدد',cleared=left===0;
  const head='<header class="v30-record-head"><strong>'+safe(d.name||'التزام مالي')+'</strong>'+pill(cleared?'مسدد':'قيد السداد',cleared?'success':'pending')+'</header>';
  const content=head+'<div class="v30-fields">'+field('أصل الالتزام',amount(principal),'navy')+
   field('المسدّد',amount(paid),'teal')+
   field('المتبقي',amount(left),left>0?'red':'teal')+
   field('القسط المسجل',amount(d.installment),'red')+'</div>'+
   cardFooter('الاستحقاق: '+when);
  return cardAction('view-debt',d.id,d.name,content,'v30-debt');
 }).join('')||empty('لا توجد التزامات مسجلة.'))+'</div></section>';
};

feesView=function(){
 const records=(db.fees||[]).slice();
 return '<section class="v30-financial-page">'+section('الرسوم والاشتراكات المسجلة','add-fee','إضافة رسم')+
 intro('كل رسم مع قيمته ودوريته والجهة المرتبطة به، دون احتساب دفع فعلي تلقائياً.')+
 '<div class="v30-record-grid">'+(records.map(f=>{
  const periods=typeof countPeriods==='function'?countPeriods(f):1;
  const frequency=typeof periodLabel==='function'?periodLabel(f.period):String(f.period||'غير محددة');
  const bank=f.bank&&typeof bankName==='function'?bankName(f.bank):'جهة غير محددة';
  const total=Math.round(Number(f.amount||0)*Number(periods||0));
  const content='<header class="v30-record-head"><strong>'+safe(f.name||'رسم مالي')+'</strong>'+pill(frequency,'neutral')+'</header>'+
   '<p class="v30-record-note">'+safe(bank)+'</p>'+
   '<div class="v30-fields">'+field('قيمة الرسم',amount(f.amount),'red')+
   field('التكلفة السنوية التقديرية',amount(total),'red')+'</div>'+
   cardFooter('الاستحقاق: '+(f.due||'غير محدد'));
  return cardAction('view-fee',f.id,f.name,content,'v30-fee');
 }).join('')||empty('لا توجد رسوم أو اشتراكات مسجلة.'))+'</div></section>';
};

reservesView=function(){
 const banks=[['hilal','بنك الهلال','احتياطي التشغيل'],['malaa','بنك ملاءة','احتياطي الادخار'],['assets','بنك الأصول','احتياطي الاستثمار']];
 return '<section class="v30-financial-page">'+section('الاحتياطيات المستهدفة')+
 intro('هذه أهداف مالية للتخطيط، وليست مبالغ نقدية متاحة أو محوّلة.')+
 '<div class="v30-record-grid">'+banks.map(([id,name,description])=>{
  const content='<header class="v30-record-head"><strong>'+safe(name)+'</strong>'+pill('مستهدف','neutral')+'</header>'+
   '<p class="v30-record-note">'+safe(description)+'</p>'+
   '<div class="v30-fields v30-fields-single">'+field('المبلغ المستهدف',amount(db.reserves[id]),'blue')+'</div>'+
   cardFooter('لم يُسجّل كرصيد نقدي','تعديل المستهدف');
  return cardAction('edit-reserve',id,name,content,'v30-reserve');
 }).join('')+'</div></section>';
};

rkDocumentsView=function(){
 rkEnsure();
 const labels={receipt:'فاتورة أو إيصال',contract:'عقد',bank:'كشف حساب',investment:'مستند استثماري',other:'مستند آخر'};
 const documents=db.docs||[];
 return '<section class="v30-financial-page">'+section('المستندات المحفوظة','add-document','إضافة مستند')+
 intro('المرفقات والتصنيفات المرتبطة بسجلاتك المالية.')+
 '<div class="v30-record-grid">'+(documents.map(d=>{
  const kind=labels[d.kind]||'مستند';
  const content='<header class="v30-record-head"><strong>'+safe(d.name||'مستند محفوظ')+'</strong>'+pill(kind,'neutral')+'</header>'+
  '<div class="v30-fields v30-fields-single">'+field('الملف المرفق',safe(d.fileName||'دون ملف'),'navy')+'</div>'+
  cardFooter('التاريخ: '+(d.date||'غير محدد'));
  return cardAction('view-document',d.id,d.name,content,'v30-document');
 }).join('')||empty('لا توجد مستندات محفوظة.'))+'</div></section>';
};

positionView=function(){
 const b=v4Numbers();
 const banks=[
  {id:'hilal',name:'بنك الهلال',items:[['مخصص تشغيل الشهر',b.operatingBudget,'blue'],['مصروفات الشهر',b.spending,'red'],['الفرق بين المخصص والمصروف',b.operatingHeadroom,b.operatingHeadroom>=0?'teal':'red']]},
  {id:'malaa',name:'بنك ملاءة',items:[['رصيد الادخار المسجل',b.saving,'teal'],['الاحتياطي المستهدف',db.reserves.malaa||0,'blue'],['الفرق عن المستهدف',b.saving-(db.reserves.malaa||0),b.saving-(db.reserves.malaa||0)>=0?'teal':'red']]},
  {id:'assets',name:'بنك الأصول',items:[['القيمة السوقية المسجلة',b.investments,'blue'],['الاحتياطي المستهدف',db.reserves.assets||0,'navy'],['الفرق عن المستهدف',b.investments-(db.reserves.assets||0),b.investments-(db.reserves.assets||0)>=0?'teal':'red']]}
 ];
 const bankCards=banks.map(bank=>'<article class="v30-record v30-bank-record">'+
  '<header class="v30-record-head"><strong>'+safe(bank.name)+'</strong>'+pill('مركز مالي','neutral')+'</header>'+
  '<div class="v30-fields">'+bank.items.map(([label,num,tone])=>field(label,amount(num),tone)).join('')+'</div>'+
  '<button type="button" class="v30-link-action" data-v30-action="open-bank" data-v30-id="'+bank.id+'">عرض تفاصيل البنك</button></article>').join('');
 const obligations=[
  ['الديون الخارجية المتبقية',b.debt,'red'],
  ['أصل التمويل الداخلي التخطيطي',b.internal,'navy'],
  ['الرسوم السنوية المتوقعة',b.annualFees,'red'],
  ['الأهداف المالية المستقبلية',(db.goals||[]).reduce((n,g)=>n+Number(g.target||0),0),'blue']
 ];
 return '<section class="v30-financial-page">'+section('المراكز المالية بالتفصيل')+
 intro('المبالغ المعروضة مختلفة الطبيعة ولا تُجمع في رصيد نقدي واحد.')+
 '<div class="v30-record-grid">'+bankCards+'</div>'+
 section('التزامات ومبالغ تخطيطية')+'<div class="v30-position-obligations">'+
 obligations.map(([label,num,tone])=>field(label,amount(num),tone)).join('')+'</div>'+
 '<p class="v30-caution">هذه قراءة جزئية للبيانات المدخلة، وليست ميزانية عمومية مكتملة. المخصصات الشهرية ليست نقداً مؤكداً ولا تُجمع الاستثمارات مرتين.</p>'+
 '</section>';
};

reports=function(){
 const categories=(db.categories||[]).filter(c=>!c.archived);
 const records=categories.map(c=>{
  const target=Math.round(Number(c.limit||0)*100),used=spent(c.id),left=target-used;
  const percentage=target>0?Math.round(100*used/target):used>0?100:0;
  const fill=Math.min(100,Math.max(0,percentage));
  const status=left<0?'تجاوز الميزانية':percentage>=80?'قرب الحد':'ضمن الميزانية';
  return '<article class="v30-record v30-report-item">'+
   '<header class="v30-record-head"><strong>'+safe(c.name)+'</strong>'+pill(status,left<0?'danger':percentage>=80?'pending':'success')+'</header>'+
   '<div class="v30-fields">'+field('الميزانية',amount(target),'blue')+field('المصروف الفعلي',amount(used),'red')+
   field('المتبقي',amount(left),left>=0?'teal':'red')+'</div>'+
   '<div class="v30-report-progress" role="progressbar" aria-label="استهلاك ميزانية '+safe(c.name)+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+fill+'"><span class="'+(left<0?'v30-progress-danger':percentage>=80?'v30-progress-warn':'')+'" style="width:'+fill+'%"></span></div>'+
  '</article>';
 }).join('');
 return '<section class="v30-financial-page">'+section('انحرافات الميزانية')+
 intro('مقارنة مخصصات البنود بالمصروفات الفعلية خلال الشهر المحدد. لم تُخصم أي مبالغ إضافية.')+
 '<div class="v30-record-grid">'+(records||empty('لا توجد بنود للمراجعة.'))+'</div>'+
 section('التصدير والمشاركة')+
 '<div class="v30-export-actions">'+
 '<button type="button" data-v30-action="export-transactions">تصدير سجل المعاملات</button>'+
 '<button type="button" data-v30-action="print-report">طباعة التقرير أو حفظه</button>'+
 '<button type="button" data-v30-action="backup">إنشاء نسخة احتياطية</button></div>'+
 intro('التقرير مبني على السجلات المحلية ويحتاج إلى المطابقة مع كشوف الحساب عند الاعتماد المالي.')+
 '</section>';
};

importView=function(){
 return '<section class="v30-financial-page">'+section('استيراد ومراجعة المعاملات')+
 intro('لا يُضاف أي قيد قبل معاينته واعتماده. تتم القراءة محلياً على جهازك.')+
 '<div class="v30-import-grid"><section class="v30-record v30-import-card">'+
 '<h3>استيراد كشف معاملات</h3><p>اختر ملف بيانات مفصولاً بفواصل يحتوي على التاريخ والوصف والمبلغ ونوع الحركة والتصنيف.</p>'+
 '<label for="csvFile">ملف كشف المعاملات</label>'+
 '<input type="file" accept=".csv,text/csv" id="csvFile" onchange="readCsv(this)">'+
 '<small>راجع اتجاه كل حركة مالية قبل اعتمادها.</small></section>'+
 '<section class="v30-record v30-import-card">'+
 '<h3>تحليل رسالة مصرفية</h3>'+
 '<p>يمكنك لصق نص رسالة مالية بعد إزالة البيانات الشخصية الحساسة.</p>'+
 '<label for="sms">نص الرسالة</label>'+
 '<textarea id="sms" rows="4" placeholder="الصق نص الرسالة هنا"></textarea>'+
 '<button type="button" class="v30-add" data-v30-action="analyze-message">تحليل الرسالة</button>'+
 '<small>لا تُقرأ رسائل الهاتف تلقائياً.</small></section></div>'+
 section('مراجعة قبل الاعتماد')+
 '<section class="v30-import-preview" id="importPreview">'+(importRows.length?previewRows():empty('اختر ملف كشف أو الصق رسالة لمراجعة الحركات.'))+'</section></section>';
};

const wrappedRender=render;
render=function(){
 const value=wrappedRender.apply(this,arguments);
 const view=document.getElementById('view');
 if(view){
  view.classList.add('v30-ready');
  const pages=['settings','goals','assets','hilal','malaa','externalBanks','transactions','spending','spending-followups','cycles','funding','ledger','interbank','receivables','scheduled','documents','import','reports','reserves','position','debts','fees'];
  pages.forEach(name=>view.classList.toggle('v30-page-'+name,page===name));
 }
 return value;
};
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-v30-action]');
 if(!button)return;
 event.preventDefault();
 const action=button.dataset.v30Action,id=button.dataset.v30Id||'';
 if(action==='add-debt')return formV3('debts');
 if(action==='add-fee')return formV3('fees');
 if(action==='add-document')return rkOpen('document');
 if(action==='view-debt')return detailV3('debts',id);
 if(action==='view-fee')return detailV3('fees',id);
 if(action==='edit-reserve')return formV3('reserves',id);
 if(action==='view-document')return rkRecordView('document',id);
 if(action==='open-bank')return navigate(id);
 if(action==='export-transactions')return exportCsv();
 if(action==='print-report')return window.print();
 if(action==='backup')return exportJson();
 if(action==='analyze-message')return readSMS();
});
render();
})();


/* Rakaez v30 — complete remaining operational surfaces using existing brand tokens.
   All entries are display-only references to current data; accounting rules remain untouched. */
(function(){
'use strict';
if(typeof db==='undefined'||typeof render!=='function')return;
const clean=v=>esc(String(v===undefined||v===null?'':v));
const number=n=>money(Number(n)||0);
const nOrZero=n=>Number.isFinite(Number(n))?Number(n):0;
const headline=(heading,add,label)=>{
 return '<header class="v30-pagehead"><h2>'+clean(heading)+'</h2>'+
 (add?'<button class="btn primary v30-add" type="button" onclick="'+add+'">'+ico('plus')+' <span>'+clean(label||'إضافة')+'</span></button>':'')+'</header>';
};
const entry=(label,value,tone='navy')=>
 '<div class="v30-fact v30-'+tone+'"><span>'+clean(label)+'</span><strong>'+value+'</strong></div>';
const status=(text,tone='muted')=>
 '<span class="v30-status v30-status-'+tone+'">'+clean(text)+'</span>';
const empty=text=>'<div class="v30-empty">'+clean(text)+'</div>';
const wrap=(kind,heading,add,label,children)=>
 '<section class="v30-screen v30-'+kind+'">'+headline(heading,add,label)+
 '<div class="v30-record-grid">'+(children||empty('لا توجد سجلات في هذا القسم.'))+'</div></section>';
const oldDebtsView=debtsView;
debtsView=function(){
 const rows=(db.debts||[]).map(d=>{
  const principal=nOrZero(d.principal),paid=nOrZero(d.paid),remaining=Math.max(0,principal-paid),ratio=principal>0?Math.max(0,Math.min(100,paid/principal*100)):0;
  const date=d.due||d.date||'غير محدد';
  return '<button class="v30-record v30-debt-record" type="button" onclick="detailV3(\'debts\',\''+clean(d.id)+'\')" aria-label="تفاصيل الالتزام '+clean(d.name)+'">'+
   '<header class="v30-record-head"><div><strong>'+clean(d.name)+'</strong><small>الاستحقاق: '+clean(date)+'</small></div>'+status(remaining===0?'مسدد بالكامل':'التزام قائم',remaining===0?'teal':'gold')+'</header>'+
   '<div class="v30-facts">'+entry('المتبقي',number(remaining),remaining===0?'teal':'red')+
   entry('القسط الشهري',number(d.installment),'navy')+
   entry('أصل الالتزام',number(principal),'blue')+
   entry('المسدّد',number(paid),'teal')+'</div>'+
   '<div class="v30-progress" role="progressbar" aria-label="نسبة السداد" aria-valuenow="'+ratio.toFixed(1)+'" aria-valuemin="0" aria-valuemax="100"><span style="width:'+ratio+'%"></span></div>'+
   '<footer class="v30-record-foot"><span>نسبة السداد '+ratio.toFixed(1)+'%</span><span>عرض التفاصيل</span></footer></button>';
 }).join('');
 return wrap('debts','الالتزامات المسجلة',"formV3('debts')",'إضافة التزام',rows);
};
const oldFeesView=feesView;
feesView=function(){
 const rows=(db.fees||[]).map(f=>{
  const frequency=typeof periodLabel==='function'?periodLabel(f.period):'رسوم دورية';
  const bank=typeof bankName==='function'?bankName(f.bank):'بنك غير محدد';
  return '<button type="button" class="v30-record v30-fee-record" onclick="detailV3(\'fees\',\''+clean(f.id)+'\')" aria-label="تفاصيل الرسم '+clean(f.name)+'">'+
  '<header class="v30-record-head"><div><strong>'+clean(f.name)+'</strong><small>'+clean(bank)+'</small></div>'+status('رسم دوري','red')+'</header>'+
  '<div class="v30-facts">'+entry('قيمة الرسم',number(f.amount),'red')+
  entry('الدورية',clean(frequency),'navy')+'</div>'+
  '<footer class="v30-record-foot"><span>'+clean(f.account||f.due||'الرسوم المسجلة')+'</span><span>عرض التفاصيل</span></footer></button>';
 }).join('');
 return wrap('fees','الرسوم والاشتراكات',"formV3('fees')",'إضافة رسم',rows);
};
const oldReservesView=reservesView;
reservesView=function(){
 const locations=[['hilal','بنك الهلال','التشغيل'],['malaa','بنك ملاءة','الادخار'],['assets','بنك الأصول','الاستثمار']];
 const rows=locations.map(([id,name,category])=>
  '<button class="v30-record v30-reserve-record" type="button" onclick="formV3(\'reserves\',\''+id+'\')" aria-label="تعديل احتياطي '+name+'">'+
  '<header class="v30-record-head"><div><strong>'+name+'</strong><small>مخصص '+category+'</small></div>'+status('مستهدف','blue')+'</header>'+
  '<div class="v30-facts v30-single-fact">'+entry('الاحتياطي المستهدف',number(db.reserves?.[id]||0),'blue')+'</div>'+
  '<footer class="v30-record-foot"><span>هدف تخطيطي لا يمثل رصيداً نقدياً</span><span>تعديل المخصص</span></footer></button>').join('');
 return wrap('reserves','الاحتياطيات المستهدفة',null,'',rows);
};
const oldGoalsView=goalsView;
goalsView=function(){
 const html=document.createElement('div');html.innerHTML=oldGoalsView();
 const goals=html.querySelector('.rk-goal-list');
 return '<section class="v30-screen v30-goals">'+headline('الأهداف المالية المسجلة',"formV3('goals')",'إضافة هدف')+
  (goals?goals.outerHTML:empty('لا توجد أهداف مالية مسجلة.'))+'</section>';
};
const oldAssetsView=assets;
assets=function(){
 const root=document.createElement('div');root.innerHTML=oldAssetsView();
 root.querySelector(':scope > .rk-assets-summary')?.remove();
 return '<section class="v30-context-page v30-assets">'+root.innerHTML.replace('محافظي الاستثمارية','المحافظ الاستثمارية')+'</section>';
};
const oldHilalView=hilal;
hilal=function(){
 const root=document.createElement('div');root.innerHTML=oldHilalView();
 root.querySelector(':scope > .grid.stats')?.remove();
 return '<section class="v30-context-page v30-hilal">'+root.innerHTML+'</section>';
};
const oldMalaaView=malaa;
malaa=function(){
 const root=document.createElement('div');root.innerHTML=oldMalaaView();
 root.querySelector(':scope > .rk-malaa-hero')?.remove();
 return '<section class="v30-context-page v30-malaa">'+root.innerHTML+'</section>';
};
const oldPositionView=positionView;
positionView=function(){
 const root=document.createElement('div');root.innerHTML=oldPositionView();
 root.querySelector(':scope > .grid.stats')?.remove();
 return '<section class="v30-context-page v30-position">'+root.innerHTML+'</section>';
};
reports=function(){
 const incomeValue=rkRecordedIncome(),outflow=spent();
 const savings=(db.savings||[]).reduce((t,s)=>t+nOrZero(s.balance),0);
 const investment=(db.holdings||[]).reduce((t,h)=>t+(h.kind==='محفظة استثمارية'?nOrZero(h.marketValue):nOrZero(h.quantity)*nOrZero(h.price)),0);
 const budgetShare=Number(db.salary||0)*Number(db.ratios?.hilal||0)/100;
 const operational=budgetShare-outflow;
 const categories=(db.categories||[]).filter(c=>!c.archived);
 const rows=categories.map(c=>{
  const budget=nOrZero(c.limit)*100,used=spent(c.id),left=budget-used;
  return '<div class="v30-report-line"><strong>'+clean(c.name)+'</strong>'+
   '<div><span>المخصص '+number(budget)+'</span><span class="v30-red">المصروف '+number(used)+'</span></div>'+
   '<b class="'+(left<0?'v30-red':'v30-teal')+'">'+(left<0?'تجاوز ':'متبقّي ')+number(Math.abs(left))+'</b></div>';
 }).join('');
 return '<section class="v30-screen v30-reports">'+
  headline('تقرير الشهر '+clean(month),null,'')+
  '<section class="v30-report-section" aria-label="كشف الحركة المالية"><h3>ملخص الحركة المسجلة</h3>'+
  '<div class="v30-report-line"><strong>الدخل المسجل</strong><b class="v30-teal">'+number(incomeValue)+'</b></div>'+
  '<div class="v30-report-line"><strong>المصروف الفعلي</strong><b class="v30-red">'+number(outflow)+'</b></div>'+
  '<div class="v30-report-line"><strong>المتاح التشغيلي التقديري</strong><b class="'+(operational<0?'v30-red':'v30-teal')+'">'+number(operational)+'</b></div>'+
  '<div class="v30-report-line"><strong>الادخار والاستثمار المسجلان</strong><b>'+number(savings+investment)+'</b></div></section>'+
  '<section class="v30-report-section" aria-label="انحراف الميزانية"><h3>تفاصيل بنود الميزانية</h3>'+
  (rows||empty('لا توجد بنود ميزانية مسجلة.'))+'</section>'+
  '<section class="v30-report-section"><h3>التصدير والطباعة</h3>'+
   '<div class="v30-export-actions"><button class="btn primary" onclick="exportCsv()">تصدير المعاملات</button>'+
   '<button class="btn" onclick="window.print()">طباعة التقرير</button>'+
   '<button class="btn" onclick="exportJson()">نسخة احتياطية</button></div>'+
   '<p class="v30-note">هذه الأرقام مشتقة من السجلات المحلية، ولا تمثل مطابقة كشف حساب مصرفي.</p></section></section>';
};
importView=function(){
 return '<section class="v30-screen v30-import">'+headline('استيراد البيانات المالية',null,'')+
 '<div class="v30-import-grid">'+
 '<section class="v30-report-section"><h3>استيراد كشف المعاملات</h3>'+
 '<label class="v30-input-label" for="csvFile">اختيار ملف معاملات</label>'+
 '<input type="file" id="csvFile" accept=".csv,text/csv" onchange="readCsv(this)" />'+
 '<p class="v30-note">اختر ملفاً نصياً مفصولاً بفواصل. تتم معاينة العمليات قبل اعتمادها ولا يُنشأ اتصال بالبنك.</p></section>'+
 '<section class="v30-report-section"><h3>تحليل رسالة مصرفية</h3>'+
 '<label class="v30-input-label" for="sms">نص الرسالة</label>'+
 '<textarea id="sms" rows="5" placeholder="الصق رسالة مصرفية بعد إزالة البيانات الحساسة"></textarea>'+
 '<button class="btn primary v30-full-action" onclick="readSMS()">تحليل الرسالة ومعاينتها</button>'+
 '<p class="v30-note">تُدخل الرسالة يدوياً ولا تُقرأ من الهاتف تلقائياً.</p></section></div>'+
 '<section class="v30-report-section"><h3>المراجعة قبل الاعتماد</h3>'+
 '<div id="importPreview">'+(importRows.length?previewRows():empty('لم تُحمّل أي معاملات للمراجعة.'))+'</div></section></section>';
};
const oldSettingsView=settings;
settings=function(){
 const root=document.createElement('div');root.innerHTML=oldSettingsView();
 const tabs=root.querySelector('.settings-tabs');
 if(tabs){tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','أقسام الإعدادات');}
 const panel=root.querySelector('.settings-panel');
 if(panel)panel.classList.add('v30-settings-panel');
 const note=settingsTab==='salary'?'توزيع الراتب على المراكز وفق النسب المسجلة. الترحيل لا ينفذ أي تحويل بنكي.':
 settingsTab==='budgets'?'تعديل حدود البنود التشغيلية للشهر.':'إدارة بيانات المنصة المحلية. احفظ نسخة احتياطية قبل إجراء عمليات الحذف.';
 return '<section class="v30-screen v30-settings">'+root.innerHTML+
  '<p class="v30-note v30-settings-notice">'+clean(note)+'</p></section>';
};
const oldRender=render;
render=function(){
 const result=oldRender.apply(this,arguments);
 const view=document.getElementById('view');
 if(view)view.dataset.v30Page=page;
 return result;
};
render();
})();
