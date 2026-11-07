/* Rakaez v41 — operational debt installment payments, respectful debt detail,
   real back navigation via v40, investment terminology, compact financing filters.
   Uses approved palette only; never silently posts bank cash or ledger entries. */
(function(){
'use strict';
if(typeof db==='undefined'||typeof render!=='function'||typeof detailV3!=='function'||typeof money!=='function')return;

const safe=v=>esc(String(v===undefined||v===null?'':v));
const amount=v=>Math.max(0,Number(v)||0);
const cash=v=>money(Math.round(Number(v)||0));
const arrowRight='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m13 6 6 6-6 6M19 12H5"/></svg>';
const filterIcon='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h18l-7 8v7l-4 2v-9L3 4Z"/></svg>';
let isPaymentSaving=false;
let filtersExpanded=false;

function debtById(id){return (db.debts||[]).find(d=>String(d.id)===String(id));}
function debtRemainder(d){return Math.max(0,Math.round(amount(d.principal)-amount(d.paid)));}
function paymentHistory(id){
 return (Array.isArray(db.debtPaymentEvents)?db.debtPaymentEvents:[])
 .filter(p=>String(p.debtId)===String(id))
 .slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
}
function fact(label,value,color){
 return '<div class="rk41-debt-fact"><dt>'+safe(label)+'</dt><dd class="rk41-number rk41-'+color+'">'+value+'</dd></div>';
}
function modalFrame(body,label){
 const node=document.getElementById('modalRoot');
 if(!node)return;
 node.innerHTML='<div class="modalbg rk41-debt-overlay" data-rk41-overlay>'+
  '<section class="modal rk41-debt-dialog" role="dialog" aria-modal="true" aria-label="'+safe(label)+'">'+
  body+'</section></div>';
}
function topBar(title){
 return '<header class="rk41-debt-head">'+
  '<button type="button" class="rk41-go-back" data-rk41-close aria-label="رجوع إلى الالتزامات">'+arrowRight+'<span>رجوع</span></button>'+
  '<h2>'+safe(title)+'</h2></header>';
}
const nativeDetail=detailV3;
detailV3=function(type,id){
 if(type!=='debts')return nativeDetail.apply(this,arguments);
 const d=debtById(id);if(!d)return;
 const principal=amount(d.principal),paid=amount(d.paid),remaining=debtRemainder(d);
 const paidPct=principal>0?Math.min(100,Math.max(0,paid/principal*100)):0;
 const history=paymentHistory(id);
 const rows=history.length?
  '<section class="rk41-pay-history"><h3>الدفعات المسجلة</h3>'+
  history.slice(0,5).map(p=>'<div class="rk41-history-line"><time>'+safe(p.date||'غير محدد')+'</time><strong class="rk41-teal">'+cash(p.amount)+'</strong></div>').join('')+
  '</section>':'';
 const body=topBar(d.name||'تفاصيل الالتزام')+
  '<div class="rk41-debt-body">'+
   '<div class="rk41-balance"><span>المتبقي من أصل الالتزام</span><strong class="rk41-number '+(remaining>0?'rk41-red':'rk41-teal')+'">'+cash(remaining)+'</strong></div>'+
   '<dl class="rk41-debt-facts">'+
    fact('أصل الالتزام',cash(principal),'navy')+
    fact('المبلغ المسدد',cash(paid),'teal')+
    fact('القسط الشهري',cash(d.installment),'red')+
    fact('المعدل السنوي',safe(d.rate||0)+'%','navy')+
    fact('الاستحقاق القادم',safe(d.date||'غير محدد'),'navy')+
   '</dl>'+
   '<div class="rk41-progress-caption"><span>نسبة السداد</span><b class="rk41-teal">'+paidPct.toFixed(1)+'%</b></div>'+
   '<div class="rk41-progress" role="progressbar" aria-label="نسبة سداد الالتزام" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+paidPct.toFixed(1)+'"><span style="width:'+paidPct.toFixed(1)+'%"></span></div>'+
   (d.notes?'<p class="rk41-debt-note">'+safe(d.notes)+'</p>':'')+
   rows+
   '<p class="rk41-finance-caveat">تسجيل السداد هنا يحدّث الالتزام فقط؛ لا يخصم المبلغ تلقائيًا من الحساب المصرفي أو دفتر الأستاذ.</p>'+
   '</div>'+
   '<footer class="rk41-debt-footer">'+
   (remaining>0?'<button type="button" class="rk41-payment-primary" data-rk41-open-payment="'+safe(id)+'">تسجيل سداد قسط</button>':'')+
   '<button type="button" class="rk41-secondary" data-rk41-edit-debt="'+safe(id)+'">تعديل الالتزام</button>'+
   '<button type="button" class="rk41-danger-action" data-rk41-delete-debt="'+safe(id)+'">حذف</button>'+
   '</footer>';
 modalFrame(body,'تفاصيل الالتزام '+safe(d.name));
};
function openDebtPayment(id){
 const d=debtById(id);if(!d)return;
 const remaining=debtRemainder(d);
 if(!remaining){alert('الالتزام مسدد بالكامل، ولا يمكن تسجيل دفعة إضافية.');return;}
 const suggested=Math.min(remaining,amount(d.installment)||remaining);
 const date=(typeof today!=='undefined'&&typeof iso==='function')?iso(today):new Date().toISOString().slice(0,10);
 const body=topBar('تسجيل سداد قسط')+
 '<form class="rk41-payment-form" data-rk41-payment-form data-rk41-debt-id="'+safe(id)+'">'+
 '<p class="rk41-payment-for">'+safe(d.name)+'</p>'+
 '<div class="rk41-payment-remaining"><span>المتبقي قبل السداد</span><strong class="rk41-red">'+cash(remaining)+'</strong></div>'+
 '<label><span>مبلغ السداد (ريال)</span><input type="number" required min="0.01" step="0.01" name="paymentAmount" value="'+(suggested/100).toFixed(2)+'" inputmode="decimal"/></label>'+
 '<label><span>تاريخ السداد</span><input type="date" required name="paymentDate" value="'+safe(date)+'"/></label>'+
 '<label><span>مرجع أو ملاحظة (اختياري)</span><input type="text" name="paymentNote" maxlength="180" placeholder="مثال: مرجع إيصال السداد"/></label>'+
 '<p class="rk41-finance-caveat">بعد الحفظ سيضاف السداد إلى سجل دفعات الالتزام ويُحدّث المتبقي. سجل المصروف المصرفي منفصل لمنع ازدواج القيد.</p>'+
 '<footer class="rk41-debt-footer"><button class="rk41-payment-primary" type="submit">اعتماد تسجيل السداد</button>'+
 '<button class="rk41-secondary" type="button" data-rk41-payment-cancel="'+safe(id)+'">إلغاء</button></footer></form>';
 modalFrame(body,'تسجيل سداد قسط '+safe(d.name));
 const input=document.querySelector('#modalRoot input[name="paymentAmount"]');
 if(input)input.focus();
}
function commitPayment(form){
 if(isPaymentSaving)return;
 const id=form.dataset.rk41DebtId;
 const d=debtById(id);if(!d){alert('لم يعد الالتزام موجودًا.');return;}
 const input=form.elements.namedItem('paymentAmount');
 const date=form.elements.namedItem('paymentDate')?.value||'';
 const note=String(form.elements.namedItem('paymentNote')?.value||'').trim().slice(0,180);
 const riyals=Number(input?.value);
 const cents=Math.round(riyals*100);
 const outstanding=debtRemainder(d);
 if(!Number.isFinite(riyals)||!Number.isSafeInteger(cents)||cents<=0){
  alert('أدخل مبلغ سداد صحيحًا أكبر من صفر.');return;
 }
 if(cents>outstanding){
  alert('مبلغ السداد يتجاوز المتبقي من أصل الالتزام.');return;
 }
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(new Date(date+'T00:00:00').getTime())){
  alert('اختر تاريخ سداد صحيحًا.');return;
 }
 isPaymentSaving=true;
 const btn=form.querySelector('[type="submit"]');
 if(btn)btn.disabled=true;
 const oldPaid=Number(d.paid)||0;
 const previousEvents=Array.isArray(db.debtPaymentEvents)?db.debtPaymentEvents.slice():null;
 const previousAudit=Array.isArray(db.audit)?db.audit.slice():null;
 const payment={id:rid(),debtId:id,amount:cents,date,note,recordedAt:new Date().toISOString()};
 try{
  if(!Array.isArray(db.debtPaymentEvents))db.debtPaymentEvents=[];
  db.debtPaymentEvents.push(payment);
  d.paid=oldPaid+cents;
  audit('تسجيل سداد قسط',String(d.name||'التزام')+' · '+date+' · '+money(cents));
  save();
  render();
  detailV3('debts',id);
  if(typeof toast==='function')toast('تم تسجيل سداد القسط وتحديث المتبقي');
 }catch(error){
  d.paid=oldPaid;
  if(previousEvents===null)delete db.debtPaymentEvents;
  else db.debtPaymentEvents=previousEvents;
  if(previousAudit!==null)db.audit=previousAudit;
  alert('تعذر حفظ السداد؛ لم يتم اعتماد العملية. تحقق من مساحة التخزين وأعد المحاولة.');
 }finally{
  isPaymentSaving=false;
  if(btn&&btn.isConnected)btn.disabled=false;
 }
}

// Merge financing search, bank, and status controls under one compact filter button.
function adjustFinancingControls(){
 const pageRoot=document.querySelector('#view .rk35-financing');
 if(!pageRoot||pageRoot.querySelector('[data-rk41-filters-button]'))return;
 const head=pageRoot.querySelector('.rk35-pagehead'),create=head?.querySelector('.rk35-create');
 const tools=pageRoot.querySelector('.rk35-tools');
 if(!head||!create||!tools)return;
 const row=document.createElement('div');
 row.className='rk41-financing-actions';
 const button=document.createElement('button');
 button.type='button';
 button.className='rk41-filter-toggle';
 button.dataset.rk41FiltersButton='true';
 button.setAttribute('aria-controls','rk41FinancingFilters');
 button.setAttribute('aria-expanded',String(filtersExpanded));
 button.innerHTML=filterIcon+'<span>تصفية</span>';
 row.appendChild(button);
 create.parentNode.insertBefore(row,create);
 row.appendChild(create);
 const panel=document.createElement('section');
 panel.id='rk41FinancingFilters';
 panel.className='rk41-filter-panel';
 panel.setAttribute('aria-label','خيارات البحث والتصفية');
 panel.hidden=!filtersExpanded;
 head.insertAdjacentElement('afterend',panel);
 panel.appendChild(tools);
 updateFilterIndicator();
}
function updateFilterIndicator(){
 const button=document.querySelector('#view [data-rk41-filters-button]');
 if(!button)return;
 const search=String(document.getElementById('rk35Search')?.value||'').trim();
 const bank=document.getElementById('rk35BankFilter')?.value||'all';
 const status=document.getElementById('rk35StatusFilter')?.value||'all';
 const active=Boolean(search||bank!=='all'||status!=='all');
 button.classList.toggle('rk41-filter-active',active);
 button.setAttribute('aria-label',active?'تصفية الطلبات — توجد مرشحات مفعلة':'تصفية الطلبات');
}
function adjustResearch(){
 const entry=Array.isArray(N)?N.find(n=>n[0]==='research'):null;
 if(entry)entry[1]='دراسة الأسهم والشركات';
 if(typeof page==='undefined'||page!=='research')return;
 const title=document.getElementById('pageTitle');
 if(title)title.textContent='دراسة الأسهم والشركات';
 const heading=document.querySelector('#view .v31-title h2');
 if(heading)heading.textContent='الأسهم والشركات قيد الدراسة';
 const section=document.querySelector('#view .v31-study');
 if(section&&!section.querySelector('.rk41-investment-hint')){
  const hint=document.createElement('p');
  hint.className='rk41-investment-hint';
  hint.innerHTML='لدراسة الأسهم والشركات قبل الاستثمار. <button type="button" data-rk41-to-assets>المحافظ والصناديق الاستثمارية في بنك الأصول</button>';
  section.querySelector('.v31-title')?.insertAdjacentElement('afterend',hint);
 }
 const navLabel=document.querySelector('#nav [data-rk33-page="research"] .rakaez-nav-name');
 if(navLabel)navLabel.textContent='دراسة الأسهم والشركات';
}
function addDebtPaymentActions(){
 if(typeof page==='undefined'||page!=='debts')return;
 document.querySelectorAll('#view .rk34-debt-card').forEach(card=>{
  const footer=card.querySelector('.rk34-cardfoot');
  const detail=footer?.querySelector('button[data-rk34-id]');
  if(!footer||!detail||footer.querySelector('[data-rk41-open-payment]'))return;
  const id=detail.dataset.rk34Id;
  const d=debtById(id);
  if(!d||debtRemainder(d)<=0)return;
  const pay=document.createElement('button');
  pay.type='button';
  pay.className='rk41-debt-inline-pay';
  pay.dataset.rk41OpenPayment=id;
  pay.textContent='تسجيل سداد';
  footer.insertBefore(pay,detail);
 });
}
const oldRender=render;
render=function(){
 const result=oldRender.apply(this,arguments);
 adjustResearch();
 adjustFinancingControls();
 addDebtPaymentActions();
 return result;
};

document.addEventListener('click',event=>{
 const close=event.target.closest('[data-rk41-close]');
 if(close){
  event.preventDefault();event.stopImmediatePropagation();
  closeModal();return;
 }
 if(event.target.matches('[data-rk41-overlay]')){closeModal();return;}
 const paymentOpen=event.target.closest('[data-rk41-open-payment]');
 if(paymentOpen){
  event.preventDefault();event.stopImmediatePropagation();
  openDebtPayment(paymentOpen.dataset.rk41OpenPayment);return;
 }
 const paymentCancel=event.target.closest('[data-rk41-payment-cancel]');
 if(paymentCancel){
  event.preventDefault();event.stopImmediatePropagation();
  detailV3('debts',paymentCancel.dataset.rk41PaymentCancel);return;
 }
 const edit=event.target.closest('[data-rk41-edit-debt]');
 if(edit){
  event.preventDefault();event.stopImmediatePropagation();
  formV3('debts',edit.dataset.rk41EditDebt);return;
 }
 const remove=event.target.closest('[data-rk41-delete-debt]');
 if(remove){
  event.preventDefault();event.stopImmediatePropagation();
  deleteV3('debts',remove.dataset.rk41DeleteDebt);return;
 }
 const toggle=event.target.closest('[data-rk41-filters-button]');
 if(toggle){
  event.preventDefault();event.stopImmediatePropagation();
  filtersExpanded=!filtersExpanded;
  const panel=document.getElementById('rk41FinancingFilters');
  if(panel)panel.hidden=!filtersExpanded;
  toggle.setAttribute('aria-expanded',String(filtersExpanded));
  if(filtersExpanded)document.getElementById('rk35Search')?.focus();
  return;
 }
 const toAssets=event.target.closest('[data-rk41-to-assets]');
 if(toAssets){event.preventDefault();navigate('assets');return;}
 if(filtersExpanded&&!event.target.closest('#rk41FinancingFilters,.rk41-filter-toggle')){
  filtersExpanded=false;
  const panel=document.getElementById('rk41FinancingFilters');
  if(panel)panel.hidden=true;
  const toggle=document.querySelector('[data-rk41-filters-button]');
  if(toggle)toggle.setAttribute('aria-expanded','false');
 }
},true);
document.addEventListener('submit',event=>{
 const form=event.target.closest('[data-rk41-payment-form]');
 if(!form)return;
 event.preventDefault();
 event.stopImmediatePropagation();
 commitPayment(form);
},true);
document.addEventListener('input',event=>{
 if(['rk35Search'].includes(event.target.id))updateFilterIndicator();
},true);
document.addEventListener('change',event=>{
 if(['rk35BankFilter','rk35StatusFilter'].includes(event.target.id))updateFilterIndicator();
},true);
document.addEventListener('keydown',event=>{
 if(event.key!=='Escape'||!filtersExpanded)return;
 const panel=document.getElementById('rk41FinancingFilters');
 if(!panel)return;
 filtersExpanded=false;
 panel.hidden=true;
 const button=document.querySelector('[data-rk41-filters-button]');
 if(button){button.setAttribute('aria-expanded','false');button.focus();}
},true);

adjustResearch();
adjustFinancingControls();
addDebtPaymentActions();
})();
