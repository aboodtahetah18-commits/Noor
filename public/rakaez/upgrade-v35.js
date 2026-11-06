/* Rakaez v35 — adopted bank-identity language and centered finance-request rows.
   Custom bank pictograms (not claimed official logos), only existing brand colors.
   READ-ONLY presentation, search and filtering.  All financial mutations remain with existing form handlers. */
(function(){
'use strict';
if(typeof db==='undefined'||typeof render!=='function'||typeof interbankView!=='function'||typeof money!=='function')return;

const escapeText=value=>esc(String(value===undefined||value===null?'':value));
const numeric=value=>Number.isFinite(Number(value))?Number(value):0;
const bankNames={malaa:'بنك ملاءة',hilal:'بنك الهلال',assets:'بنك الأصول'};
const bankLabels={malaa:'ملاءة',hilal:'الهلال',assets:'الأصول'};
const bankVisuals={
 hilal:'<path class="rk35-hilal-crescent" d="M22 6.8a11 11 0 1 0 3.6 19.4A12.2 12.2 0 0 1 22 6.8Z"/><path class="rk35-gold-fill" d="m27 3.5 1.3 3.8 3.8 1.3-3.8 1.3-1.3 3.8-1.3-3.8-3.8-1.3 3.8-1.3Z"/><circle class="rk35-gold-fill" cx="20.3" cy="3.5" r="1.4"/>',
 malaa:'<path class="rk35-leaf" d="M16 22C6 19 6 12 8 6c8 1 11 7 8 16ZM17 22c-2-10 2-15 10-17 2 8-1 14-10 17ZM16 23c-7-7-11-5-13-2 4 5 8 6 13 2Z"/><path class="rk35-gold-stroke" d="M7 26c7-2 14-2 22 0M16.5 23v-7"/>',
 assets:'<path class="rk35-assets-top" d="M3 10 16 3l13 7-13 7Z"/><path class="rk35-assets-mid" d="m3 15 13 7 13-7"/><path class="rk35-assets-base" d="m3 21 13 7 13-7"/>'
};
function bankMark(bank){
 if(!Object.prototype.hasOwnProperty.call(bankVisuals,bank))return '';
 return '<span class="rk35-bankmark rk35-bankmark-'+bank+'" aria-hidden="true">'+
  '<svg viewBox="0 0 32 32" width="27" height="27" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+
  bankVisuals[bank]+'</svg></span>';
}
function bankNameLabel(id){
 return bankNames[id]||'بنك غير محدد';
}
function requestedStatus(item){
 const status=String(item.status||'').toLowerCase();
 if(['approved','accepted','معتمد'].includes(status))return {name:'معتمد',kind:'approved'};
 if(['rejected','مرفوض'].includes(status))return {name:'مرفوض',kind:'rejected'};
 return {name:'للدراسة فقط',kind:'study'};
}
const filterState={search:'',bank:'all',status:'all'};
const requestIcon='<svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v15H6zM15 2v5h5M9 12h8M9 16h7"/></svg>';
const arrow='<svg viewBox="0 0 28 28" width="27" height="27" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 14H5m7-7-7 7 7 7"/></svg>';
const plus='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 4v16M4 12h16"/></svg>';
const reference=item=>{
 const id=String(item.id||'').replace(/[^a-zA-Z0-9-]/g,'');
 return id?'المرجع: '+escapeText(id.length>12?id.slice(0,8):id):'';
};
const dateValue=item=>{
 const stored=String(item.createdAt||item.date||'');
 const parsed=/^\d{4}-\d\d-\d\d/.exec(stored);
 return parsed?'التاريخ: '+escapeText(parsed[0]):'';
};
const field=(label,value,tone)=>'<div class="rk35-stat rk35-stat-'+tone+'"><dt>'+label+'</dt><dd>'+value+'</dd></div>';
const bankEndpoint=(id,role)=>'<div class="rk35-route-end"><span class="rk35-route-role">'+role+'</span>'+
 '<span class="rk35-route-bank">'+bankMark(id)+'<strong>'+escapeText(bankNameLabel(id))+'</strong></span></div>';
function requestCard(record){
 const status=requestedStatus(record);
 const principal=Math.max(0,numeric(record.principal));
 const rate=numeric(record.rate);
 const duration=Math.max(0,numeric(record.months));
 const cost=Math.round(principal*rate*duration/1200);
 const meta=[reference(record),dateValue(record)].filter(Boolean).join('　 |　 ');
 return '<article class="rk35-request rk35-request-'+status.kind+'">'+
  '<header class="rk35-request-head">'+
   '<div class="rk35-request-ident">'+
    '<span class="rk35-document" aria-hidden="true">'+requestIcon+'</span>'+
    '<span class="rk35-request-intro"><strong>طلب تمويل بين البنوك</strong>'+(meta?'<small>'+meta+'</small>':'')+'</span></div>'+
   '<span class="rk35-status rk35-status-'+status.kind+'">'+escapeText(status.name)+'</span></header>'+
  '<div class="rk35-bank-route" aria-label="البنك المقرض والبنك المستفيد">'+
   bankEndpoint(record.from,'الجهة المقرضة')+'<span class="rk35-route-arrow">'+arrow+'</span>'+
   bankEndpoint(record.to,'الجهة المستفيدة')+'</div>'+
  '<dl class="rk35-stats">'+
   field('أصل التمويل',money(principal),'principal')+
   field('التكلفة التقديرية',money(cost),'cost')+
   field('المعدل السنوي',escapeText(rate.toLocaleString('ar-SA-u-nu-latn',{maximumFractionDigits:2})+'%'),'rate')+
   field('المدة',escapeText(duration.toLocaleString('ar-SA-u-nu-latn')+' شهر'),'term')+
  '</dl>'+
  (record.notes?'<p class="rk35-request-note"><span>سبب الطلب</span> '+escapeText(record.notes)+'</p>':'')+
  '</article>';
}
function matchesFilters(record){
 const q=filterState.search.trim().toLocaleLowerCase('ar');
 const content=[record.id,record.notes,bankNames[record.from],bankNames[record.to],record.principal].filter(x=>x!=null).join(' ').toLocaleLowerCase('ar');
 return (!q||content.includes(q))&&
   (filterState.bank==='all'||record.from===filterState.bank||record.to===filterState.bank)&&
   (filterState.status==='all'||requestedStatus(record).kind===filterState.status);
}
function options(){
 const actual=new Set((db.interbankPlans||[]).map(x=>requestedStatus(x).kind));
 const statuses=[['all','جميع الحالات'],['study','للدراسة فقط'],['approved','معتمد'],['rejected','مرفوض']].filter(([key])=>key==='all'||actual.has(key));
 const bankOptions=[['all','جميع البنوك'],...Object.entries(bankNames)];
 return {statuses,bankOptions};
}
function select(name,label,items,value){
 return '<label class="rk35-select"><span class="rk35-sr-only">'+label+'</span><select id="'+name+'" aria-label="'+label+'">'+
  items.map(([id,text])=>'<option value="'+escapeText(id)+'"'+(id===value?' selected':'')+'>'+escapeText(text)+'</option>').join('')+
  '</select></label>';
}
function visibleList(){
 const rows=(db.interbankPlans||[]).filter(matchesFilters);
 return '<div class="rk35-records">'+(rows.length?rows.map(requestCard).join(''):
  '<p class="rk35-empty">لا توجد طلبات تطابق البحث والتصفية.</p>')+'</div>';
}
function updateList(){
 const list=document.getElementById('rk35RequestList');
 if(!list)return;
 list.innerHTML=visibleList();
 const counter=document.getElementById('rk35RequestCount');
 if(counter){
  const n=(db.interbankPlans||[]).filter(matchesFilters).length;
  counter.textContent='عدد الطلبات المعروضة: '+n.toLocaleString('ar-SA-u-nu-latn');
 }
}
interbankView=function(){
 const opts=options();
 return '<section class="rk35-financing" aria-label="طلبات التمويل بين البنوك">'+
  '<header class="rk35-pagehead"><div><h2>طلبات التمويل بين البنوك</h2>'+
   '<p>إدارة طلبات التمويل بين بنوك المنصة</p></div>'+
   '<button type="button" class="rk35-create" data-rk35-new>'+plus+'<span>طلب جديد</span></button></header>'+
  '<div class="rk35-tools" role="search">'+
   '<label class="rk35-search"><span class="rk35-sr-only">البحث في الطلبات</span>'+
   '<input type="search" id="rk35Search" value="'+escapeText(filterState.search)+'" placeholder="ابحث في الطلبات..." autocomplete="off"/>'+
   '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg></label>'+
   select('rk35BankFilter','تصفية حسب البنك',opts.bankOptions,filterState.bank)+
   select('rk35StatusFilter','تصفية حسب الحالة',opts.statuses,filterState.status)+
   '<button type="button" class="rk35-reset" data-rk35-reset aria-label="مسح البحث والتصفية" title="مسح البحث والتصفية">'+
   '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M3 5h18l-7 8v6l-4 2v-8Z"/></svg></button>'+
  '</div>'+
  '<p class="rk35-list-count" id="rk35RequestCount" aria-live="polite"></p>'+
  '<div id="rk35RequestList">'+visibleList()+'</div>'+
  '<p class="rk35-disclaimer">هذه طلبات تخطيطية بين البنوك المسجلة داخل المنصة، ولا تنفذ تحويلات مصرفية أو تغيّر الأرصدة تلقائيًا.</p>'+
 '</section>';
};
function addMarksToBankHeadings(){
 const root=document.getElementById('view');if(!root)return;
 if(!['funding','position','reserves'].includes(page))return;
 const headings=root.querySelectorAll('.v27-centers b,.rk34-bank-card .rk34-cardidentity h3,.rk34-reserve-card .rk34-cardidentity h3');
 for(const el of headings){
  if(el.dataset.rk35Marked)return;
  const bank=Object.keys(bankNames).find(key=>el.textContent.trim()===bankNames[key]||el.textContent.trim()===bankLabels[key]);
  if(!bank)continue;
  el.dataset.rk35Marked='true';
  el.classList.add('rk35-label-with-mark');
  el.insertAdjacentHTML('afterbegin',bankMark(bank));
 }
}
const oldRender=render;
render=function(){
 const result=oldRender.apply(this,arguments);
 if(page==='interbank')updateList();
 addMarksToBankHeadings();
 return result;
};
document.addEventListener('click',event=>{
 if(event.target.closest('[data-rk35-new]')){
  event.preventDefault();
  interbankForm();
  return;
 }
 if(event.target.closest('[data-rk35-reset]')){
  event.preventDefault();
  filterState.search='';filterState.bank='all';filterState.status='all';
  const search=document.getElementById('rk35Search');
  const bank=document.getElementById('rk35BankFilter');
  const status=document.getElementById('rk35StatusFilter');
  if(search)search.value='';
  if(bank)bank.value='all';
  if(status)status.value='all';
  updateList();
 }
});
document.addEventListener('input',event=>{
 if(event.target.id==='rk35Search'){
  filterState.search=event.target.value;
  updateList();
 }
});
document.addEventListener('change',event=>{
 if(event.target.id==='rk35BankFilter'){
  filterState.bank=event.target.value;
  updateList();
 }else if(event.target.id==='rk35StatusFilter'){
  filterState.status=event.target.value;
  updateList();
 }
});
render();
})();