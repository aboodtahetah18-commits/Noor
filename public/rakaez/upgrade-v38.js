/* ركائز — مسودة 38: الإحصائيات مستقلة، تفاصيل البنوك، زر الرجوع
   للاستخدام المحلي فقط. لا يغيّر قاعدة البيانات أو قيود المحاسبة أو الرصيد. */
(function(){
'use strict';
if(typeof render!=='function'||typeof navigate!=='function'||typeof db==='undefined'||typeof money!=='function')return;
const bankNames={hilal:'بنك الهلال',malaa:'بنك ملاءة',assets:'بنك الأصول'};
const safe=v=>typeof esc==='function'?esc(String(v??'')):String(v??'');
const numeric=v=>Number.isFinite(Number(v))?Number(v):0;
const monetary=v=>money(Math.round(numeric(v)));
const fmt=v=>numeric(v).toLocaleString('ar-SA-u-nu-latn',{maximumFractionDigits:1});
const iconBank=id=>document.querySelector('#nav [data-rk33-page="'+id+'"] .rk35-bankmark')?.outerHTML||'';
const symbol='<svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
if(Array.isArray(N)){
  if(!N.some(x=>x[0]==='statistics'))N.push(['statistics','الإحصائيات','chart']);
  for(const x of N){if(x[0]==='position')x[1]='البنوك بالتفصيل';if(x[0]==='interbank')x[1]='التمويل بين البنوك';}
}
const exists=id=>Array.isArray(N)&&N.some(x=>x[0]===id);
const go=(id,label,cls='')=>exists(id)?'<button type="button" data-rk37-to="'+safe(id)+'" class="rk38-route '+cls+'">'+safe(label)+'</button>':'';
const item=(label,value,tone='navy',description='')=>'<div class="rk38-value rk38-'+tone+'"><dt>'+safe(label)+'</dt><dd>'+value+'</dd>'+(description?'<small>'+safe(description)+'</small>':'')+'</div>';
const separate=(text)=>'<p class="rk38-fineprint">'+safe(text)+'</p>';
function readFinancials(){
  const a=typeof v4Numbers==='function'?v4Numbers():{saving:0,investments:0,debt:0,internal:0,annualFees:0,operatingBudget:0,spending:0,operatingHeadroom:0,partialNet:0};
  const reserves=db.reserves||{},ratios=db.ratios||{};
  const savings=Array.isArray(db.savings)?db.savings:[];
  const holdings=Array.isArray(db.holdings)?db.holdings:[];
  const withdrawals=Array.isArray(db.withdrawals)?db.withdrawals:[];
  const goalTarget=(db.goals||[]).reduce((sum,x)=>sum+Math.max(0,numeric(x.target)),0);
  const reserveTarget=['hilal','malaa','assets'].reduce((sum,k)=>sum+Math.max(0,numeric(reserves[k])),0);
  const missingPrice=holdings.filter(h=>typeof rkHoldingHasPrice==='function'?!rkHoldingHasPrice(h):h.kind==='محفظة استثمارية'?h.marketValue==null:h.price==null).length;
  const withdrawalPending=withdrawals.filter(w=>!['paid','completed','executed','fulfilled','مكتمل','منفذ'].includes(String(w.status||'').toLowerCase())).length;
  const planned=id=>Math.round(numeric(db.salary)*numeric(ratios[id])/100);
  const monthlyPosted=Array.isArray(db.salaryMonths)&&db.salaryMonths.includes(month);
  return {a,reserves,savings,holdings,withdrawalPending,missingPrice,goalTarget,reserveTarget,planned,monthlyPosted};
}
function statisticsView(){
  const {a,reserveTarget,goalTarget}=readFinancials();
  return '<section class="rk38-page rk38-statistics" aria-label="مجموعة الإحصائيات">'+
    '<header class="rk38-page-title"><h2>الإحصائيات</h2><p>المؤشرات العامة للمنصة، دون خلط المخصصات التخطيطية بالأرصدة الفعلية.</p></header>'+
    '<article class="rk38-summary"><header><h3>الملخص المالي المسجل</h3><span>بيانات محلية</span></header><dl class="rk38-values">'+
    item('الادخار المسجل',monetary(a.saving),'teal')+item('الاستثمارات المسجلة',monetary(a.investments),'blue')+
    item('الديون الخارجية المتبقية',monetary(a.debt),'red')+item('صافي الوضع المالي الجزئي',monetary(a.partialNet),a.partialNet>=0?'teal':'red')+
    '</dl>'+separate('صافي الوضع المالي الجزئي = الادخار + الاستثمارات المسجلة − الديون الخارجية. لا يشمل الأرصدة النقدية غير المعروفة ولا يمثل ميزانية مكتملة.')+'</article>'+
    '<section class="rk38-summary rk38-planning"><h3>المستهدفات والالتزامات المرجعية</h3><dl class="rk38-values">'+
    item('التمويل الداخلي المتبقي',monetary(a.internal),'navy','للمتابعة الإدارية، لا يخصم مرة ثانية من الصافي')+
    item('الرسوم السنوية المتوقعة',monetary(a.annualFees),'red','تقدير لمصاريف مستقبلية')+
    item('الاحتياطيات المستهدفة',monetary(reserveTarget),'blue','أهداف وليست سيولة جديدة')+
    item('الأهداف المالية المستقبلية',monetary(goalTarget),'navy','لا تخصم من الوضع المالي الحالي')+
    '</dl></section><nav class="rk38-related" aria-label="الانتقال من الإحصائيات">'+
    go('position','تفاصيل البنوك')+go('reports','التقارير')+go('ledger','دفتر الأستاذ')+'</nav></section>';
}
function bankRow(id,name,subtitle,values,description,related){
  return '<article class="rk38-bank" aria-label="'+name+'">'+
    '<header class="rk38-bank-head"><span class="rk38-mark">'+iconBank(id)+'</span><div><h3>'+name+'</h3><p>'+subtitle+'</p></div>'+go(id,'فتح البنك','rk38-open-bank')+'</header>'+
    '<dl class="rk38-values">'+values.map(x=>item(...x)).join('')+'</dl>'+
    separate(description)+'<nav class="rk38-related" aria-label="الخدمات المرتبطة بـ'+name+'">'+related.map(pair=>go(pair[0],pair[1])).join('')+'</nav></article>';
}
function bankDetailsView(){
  const {a,reserves,savings,holdings,withdrawalPending,missingPrice,planned,monthlyPosted}=readFinancials();
  const instant=numeric(savings.find(s=>s.id==='instant')?.balance);
  const valuesH=[
    ['الحصة المخططة من الراتب',monetary(planned('hilal')),'blue'],
    ['مخصص تشغيل الشهر المسجل',monetary(a.operatingBudget),'teal'],
    ['مصروفات الشهر',monetary(a.spending),'red'],
    ['المتبقي من المخصص',monetary(a.operatingHeadroom),a.operatingHeadroom>=0?'teal':'red'],
    ['الاحتياطي المستهدف',monetary(reserves.hilal),'navy']
  ];
  const valuesM=[
    ['رصيد الادخار المسجل',monetary(a.saving),'teal'],
    ['الرصيد الفوري المسجل',monetary(instant),'blue'],
    ['الاحتياطي المستهدف',monetary(reserves.malaa),'navy'],
    ['الفرق عن المستهدف',monetary(a.saving-numeric(reserves.malaa)),a.saving>=numeric(reserves.malaa)?'teal':'red'],
    ['طلبات السحب قيد المتابعة',String(withdrawalPending),'gold']
  ];
  const valuesA=[
    ['القيمة السوقية المدخلة',monetary(a.investments),'blue'],
    ['عدد الأصول المسجلة',String(holdings.length),'navy'],
    ['أصول دون تقييم مكتمل',String(missingPrice),missingPrice>0?'gold':'teal'],
    ['الاحتياطي المستهدف',monetary(reserves.assets),'navy'],
    ['الفرق العددي عن المستهدف',monetary(a.investments-numeric(reserves.assets)),a.investments>=numeric(reserves.assets)?'teal':'red']
  ];
  return '<section class="rk38-page rk38-banks" aria-label="البنوك بالتفصيل">'+
    '<header class="rk38-page-title"><h2>البنوك بالتفصيل</h2><p>بيانات كل بنك مستقلة، والانتقال إلى الخدمات المرتبطة به مباشر.</p></header>'+
    bankRow('hilal','بنك الهلال','التشغيل والمخصصات والمصروفات',valuesH,monthlyPosted?'يعرض مخصص هذا الشهر بعد تسجيل الراتب.':'الحصة المخططة ليست رصيدًا نقديًا؛ لم يُسجل راتب الشهر بعد.',[['transactions','المعاملات المالية'],['funding','التمويل الداخلي'],['fees','الرسوم'],['cycles','دورة الراتب']])+
    bankRow('malaa','بنك ملاءة','الادخار والسيولة وطلبات السحب',valuesM,'أرصدة الادخار مبنية على السجلات المدخلة، وليست كشفًا مباشرًا من البنك.',[['goals','الأهداف'],['scheduled','الجدولة'],['receivables','المستحقات'],['interbank','التمويل بين البنوك']])+
    bankRow('assets','بنك الأصول','المحافظ والتقييمات والاستثمارات',valuesA,'القيمة السوقية قد لا تشمل الأصول التي لم يُسجّل لها تقييم. لا تمثل قيمة قابلة للسحب.',[['research','دراسة الشركات'],['documents','المستندات'],['reports','التقارير'],['interbank','التمويل بين البنوك']])+
    '<footer class="rk38-bank-bottom">'+go('statistics','عرض الإحصائيات والملخص المالي')+'</footer></section>';
}
// No changes to calculation/storage. Page renderers only.
positionView=bankDetailsView;
let historyStack=[];
let handlingPop=false;
const oldDrawNav=drawNav;
function placeStatsNav(){
 const nav=document.getElementById('nav');if(!nav)return;
 const reference=nav.querySelector('#rk33-links-reference');
 if(!reference||reference.querySelector('.rk38-nav-statistics'))return;
 const stats=reference.querySelector('[data-rk33-page="statistics"]');
 if(!stats)return;
 const sub=document.createElement('div');sub.className='rk38-nav-statistics';
 sub.innerHTML='<div class="rk38-nav-subheading">الإحصائيات</div>';
 sub.appendChild(stats);
 const reports=reference.querySelector('[data-rk33-page="reports"]');
 if(reports)sub.appendChild(reports);
 reference.prepend(sub);
}
drawNav=function(){const result=oldDrawNav.apply(this,arguments);placeStatsNav();return result;};
const oldNavigate=navigate;
function validPage(id){return exists(id)&&typeof id==='string';}
function renderBackButton(){
 const view=document.getElementById('view');if(!view)return;
 view.querySelector('.rk38-navigation-back')?.remove();
 if(page==='insights')return;
 const label=historyStack.length?N.find(x=>x[0]===historyStack[historyStack.length-1])?.[1]||'السابق':'الرئيسية';
 const b=document.createElement('button');b.type='button';b.className='rk38-navigation-back';b.dataset.rk38Back='page';
 b.innerHTML=symbol+'<span>رجوع'+(label?' إلى '+safe(label):'')+'</span>';
 b.setAttribute('aria-label','الرجوع إلى '+label);
 view.prepend(b);
}
function goBack(){
 const modal=document.getElementById('modalRoot');
 if(modal?.querySelector('[role="dialog"],.modalbg')){
  if(typeof closeModal==='function')closeModal();else modal.innerHTML='';return;
 }
 if(historyStack.length){
  if(window.history?.state?.rk38 && typeof window.history.back==='function'){
   window.history.back();return;
  }
  const prev=historyStack.pop();
  if(!validPage(prev))return oldNavigate('insights');
  handlingPop=true;try{oldNavigate(prev)}finally{handlingPop=false}
  return;
 }
 if(page!=='insights')oldNavigate('insights');
}
navigate=function(target){
 if(!validPage(target))return;
 const from=page;
 if(target!==from&&!handlingPop){historyStack.push(from);if(historyStack.length>60)historyStack.shift();}
 const result=oldNavigate.apply(this,arguments);
 if(target!==from&&!handlingPop){
  try{window.history?.pushState?.({rk38:true,page:target},'',window.location.href)}catch(e){}
 }
 return result;
};
window.addEventListener('popstate',event=>{
 const target=event.state?.rk38?event.state.page:null;
 if(!validPage(target)||target===page)return;
 if(historyStack.length)historyStack.pop();
 handlingPop=true;
 try{oldNavigate(target)}finally{handlingPop=false}
});
// Native browser 'back' changes the active route. No redirects or network requests.
try{
 if(window.history?.replaceState){window.history.replaceState({rk38:true,page:page},'',window.location.href);}
}catch(e){}
function insertStatisticsGuide(){
 const section=document.querySelector('#view [data-rk33-guide-group="reference"] .rk33-guide-topics');
 if(!section||section.querySelector('[data-rk33-topic="statistics"]'))return;
 section.insertAdjacentHTML('afterbegin','<details class="rk33-guide-topic" data-rk33-topic="statistics" data-rk33-keywords="الإحصائيات الملخص المالي الادخار الاستثمارات الديون الرسوم"><summary><span>الإحصائيات</span><small>ملخص البيانات المالية العامة، منفصل عن تفاصيل كل بنك</small></summary><div class="rk33-guide-details"><ol><li>افتح مجموعة الإحصائيات من القائمة الجانبية.</li><li>راجع الادخار والاستثمارات والديون وصافي الوضع الجزئي.</li><li>انتقل إلى تفاصيل البنوك أو التقارير لمراجعة مصدر البيانات.</li></ol><p class="rk33-guide-tip"><strong>تنبيه:</strong> الأهداف التخطيطية ليست أرصدة نقدية.</p><button type="button" class="rk33-guide-open" data-rk37-to="statistics">فتح الإحصائيات</button></div></details>');
}
const oldRender=render;
render=function(){
 const result=oldRender.apply(this,arguments);
 const view=document.getElementById('view');
 if(page==='statistics'&&view){
   view.innerHTML=statisticsView();
   const t=document.getElementById('pageTitle');if(t)t.textContent='الإحصائيات';
   const s=document.getElementById('pageSub');if(s)s.textContent='المؤشرات العامة والتقديرات المرجعية';
 }
 if(page==='position'){
  const title=document.getElementById('pageTitle');if(title)title.textContent='البنوك بالتفصيل';
  const sub=document.getElementById('pageSub');if(sub)sub.textContent='التفاصيل التشغيلية والاستثمارية والادخارية لكل بنك';
 }
 if(page==='guide')insertStatisticsGuide();
 placeStatsNav();renderBackButton();
 return result;
};
// Existing detail dialogs keep all their actions; only insert a compact back control.
let checkingModal=false;
function decorateDialogs(){
 const root=document.getElementById('modalRoot');if(!root)return;
 const dialog=root.querySelector('[role="dialog"],.rk-record-detail,.modal:not(.modalbg)');
 if(!dialog||dialog.classList.contains('rk43-normalized')||dialog.querySelector('.rk43-modal-header'))return;
 const head=dialog.querySelector('.modalhead,.v27-dialog-head,.rk-budget-detail-dialog .modalhead,.v19-step-intro');
 if(!head||head.querySelector('[data-rk38-back]'))return;
 const back=document.createElement('button');back.type='button';back.className='rk38-modal-back';back.dataset.rk38Back='modal';
 back.setAttribute('aria-label','العودة إلى الصفحة');back.innerHTML=symbol+'<span>رجوع</span>';
 head.prepend(back);
}
const modalNode=document.getElementById('modalRoot');
if(modalNode&&typeof MutationObserver!=='undefined'){
 new MutationObserver(()=>{if(checkingModal)return;checkingModal=true;queueMicrotask(()=>{checkingModal=false;decorateDialogs();});}).observe(modalNode,{subtree:true,childList:true});
}
document.addEventListener('click',e=>{
 const back=e.target.closest('[data-rk38-back]');if(!back)return;
 e.preventDefault();e.stopImmediatePropagation();goBack();
},true);
// Add a statistics route to related page navigation without stat duplication.
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('modalRoot')?.querySelector('[role="dialog"]')){e.preventDefault();goBack();}},true);
render();
})();
