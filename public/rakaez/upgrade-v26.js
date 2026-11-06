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
   '<div class="v27-metrics">'+metric('أصل التمويل',money(f.principal),'blue')+metric('التكلفة التقديرية',money(cost),'gold')+
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
  metric('الربح البسيط التقديري',money(cost),'teal')+metric('إجمالي السداد المخطط',money(principal+cost),'navy')+'</div>'+
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



/* Rakaez v28 — compact journal cards with an expandable accounting breakdown.
   Changes presentation only; reversal still uses the existing guarded handler. */
(function(){
'use strict';
if(typeof ledgerView!=='function'||typeof db==='undefined'||typeof money!=='function')return;
const previousLedgerView=ledgerView;
const textSafe=value=>esc(String(value===null||value===undefined?'':value));
const accounts={
 hilal:'نقد الهلال',malaa:'نقد ملاءة',assets:'نقد الأصول',
 salary:'إيراد الراتب',expense:'مصروفات التشغيل',outside:'الرصيد الافتتاحي'
};
const reverseIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-2"/></svg>';
const value=(label,n,kind)=>'<div class="v28-ledger-value v28-'+kind+'"><span>'+label+'</span><strong>'+money(n)+'</strong></div>';
const accountLines=entry=>(entry.lines||[]).map(line=>{
 const debit=Number(line.debit||0),credit=Number(line.credit||0);
 const detail=(debit>0?'<span class="v28-amount-debit">مدين '+money(debit)+'</span>':'')+
  (credit>0?'<span class="v28-amount-credit">دائن '+money(credit)+'</span>':'');
 return '<div class="v28-account-line"><strong>'+textSafe(accounts[line.account]||'حساب مالي آخر')+'</strong>'+
  '<div class="v28-account-amounts">'+(detail||'<span>دون مبلغ</span>')+'</div></div>';
}).join('');
const journalCard=entry=>{
 const lines=entry.lines||[];
 const debit=lines.reduce((sum,line)=>sum+Number(line.debit||0),0);
 const credit=lines.reduce((sum,line)=>sum+Number(line.credit||0),0);
 const balanced=debit===credit&&debit>0;
 const isReversal=Boolean(entry.reversalOf);
 const wasReversed=(db.ledgerEntries||[]).some(other=>other.reversalOf===entry.id);
 const locked=isReversal||wasReversed;
 const state=balanced?'متوازن':'غير متوازن';
 const opposite=locked?'<span class="v28-reversed-tag">'+(isReversal?'قيد عكسي':'تم عكس القيد')+'</span>':
  '<button type="button" class="v28-reverse-action" data-v25-reverse="'+textSafe(entry.id)+'" aria-label="عكس القيد '+textSafe(entry.description||'المالي')+'">'+reverseIcon+'<span>عكس القيد</span></button>';
 return '<article class="v28-ledger-card '+(balanced?'v28-balanced-card':'v28-unbalanced-card')+'">'+
  '<header class="v28-ledger-header"><div class="v28-ledger-ident"><strong>'+textSafe(entry.description||'قيد مالي')+'</strong>'+
  '<time datetime="'+textSafe(entry.date||'')+'">'+textSafe(entry.date||'تاريخ غير محدد')+'</time></div>'+
  '<span class="v28-ledger-badge '+(balanced?'v28-state-good':'v28-state-warn')+'">'+state+'</span></header>'+
  '<div class="v28-ledger-values">'+value('مدين',debit,'debit')+value('دائن',credit,'credit')+'</div>'+
  '<div class="v28-ledger-footer">'+opposite+'</div>'+
  '<details class="v28-ledger-breakdown"><summary>تفاصيل الحسابات <span>('+lines.length+')</span></summary>'+
  '<div class="v28-ledger-account-list">'+(accountLines(entry)||'<p>لا توجد حسابات مرتبطة.</p>')+'</div></details></article>';
};
ledgerView=function(){
 const original=previousLedgerView.apply(this,arguments);
 const container=document.createElement('div');
 container.innerHTML=original;
 const page=container.querySelector('.v25-page');
 const list=page?.querySelector('.v25-list');
 if(!page||!list)return original;
 const rows=(db.ledgerEntries||[]).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
 page.classList.add('v28-ledger-page');
 list.classList.add('v28-ledger-grid');
 list.innerHTML=rows.length?rows.map(journalCard).join(''):
  '<div class="v25-empty">لا توجد قيود يومية. يمكنك إضافة حركة مالية أو إثبات رصيد افتتاحي.</div>';
 return page.outerHTML;
};
})();
