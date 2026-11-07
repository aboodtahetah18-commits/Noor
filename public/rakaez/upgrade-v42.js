/* ركائز 42 — مصدر مالي موحّد، بطاقات بنوك هادئة، شرح عند الطلب.
   واجهات قراءة فقط؛ لا تغيير في المعاملات أو دفاتر الحسابات. */
(function(){
 'use strict';
 if(typeof render!=='function'||typeof db==='undefined'||typeof positionView!=='function'||typeof money!=='function')return;
 const number=x=>Number.isFinite(Number(x))?Number(x):0;
 const safe=x=>typeof esc==='function'?esc(String(x??'')):String(x??'');
 const fmt=x=>money(Math.round(number(x)));
 const stat=(label,value,tone='navy')=>
  '<div class="rk42-stat"><dt>'+safe(label)+'</dt><dd class="rk42-amount rk42-'+tone+'">'+value+'</dd></div>';
 const infoSymbol='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 10.5v5m0-8.2h.01"/></svg>';
 const chevron='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg>';
 function tooltip(title,content){
  return '<details class="rk42-info"><summary aria-label="شرح '+safe(title)+'" title="شرح '+safe(title)+'">'+infoSymbol+'</summary><div class="rk42-info-body">'+safe(content)+'</div></details>';
 }
 function activePeriod(){
  const getter=typeof window!=='undefined'?window.RakaezHilalSelectedPeriod:null;
  const p=typeof getter==='function'?getter():typeof month!=='undefined'?month:'';
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(p)?p:new Date().toISOString().slice(0,7);
 }
 function bankIcon(id){
  const icon=document.querySelector('#nav [data-rk33-page="'+id+'"] .rk35-bankmark');
  if(icon)return icon.outerHTML;
  const bankSvg={hilal:'moon',malaa:'shield',assets:'trend'};
  return typeof ico==='function'?'<span class="rk42-bank-fallback" aria-hidden="true">'+ico(bankSvg[id])+'</span>':'';
 }
 function serviceButton(id,title){
  return '<button type="button" data-rk42-to="'+safe(id)+'">'+safe(title)+'</button>';
 }
 function card(id,name,description,mainLabel,mainValue,mainTone,state,figures,foot,more,explanation){
  return '<article class="rk42-bank-card rk42-bank-'+id+'" aria-label="'+safe(name)+'">'+
   '<header class="rk42-bank-head"><div class="rk42-bank-title">'+bankIcon(id)+
   '<div><h3>'+safe(name)+'</h3><span>'+safe(description)+'</span></div></div>'+
   '<button type="button" class="rk42-open-bank" data-rk42-to="'+id+'">فتح البنك</button></header>'+
   '<div class="rk42-bank-main"><span>'+safe(mainLabel)+'</span>'+
   '<strong class="rk42-amount rk42-'+mainTone+'">'+mainValue+'</strong>'+
   (state?'<small>'+safe(state)+'</small>':'')+'</div>'+
   '<dl class="rk42-bank-figures">'+figures.join('')+'</dl>'+
   (foot?'<div class="rk42-bank-foot"><span>'+safe(foot[0])+'</span><strong class="rk42-'+safe(foot[2]||'navy')+'">'+foot[1]+'</strong></div>':'')+
   '<footer class="rk42-bank-actions"><details class="rk42-services"><summary>الخدمات المرتبطة '+chevron+'</summary>'+
   '<div class="rk42-service-links">'+more.map(([route,title])=>serviceButton(route,title)).join('')+'</div></details>'+
   tooltip('بيانات '+name,explanation)+'</footer></article>';
 }
 function newBankDetails(){
  const p=activePeriod();
  const core=typeof window!=='undefined'?window.RakaezHilalCore:null;
  let monthData=null;
  try{if(core&&typeof core.monthly==='function')monthData=core.monthly(db,p);}catch(err){monthData=null;}
  const posted=Boolean(monthData?.posted);
  const expenses=monthData?.expenses??0;
  const assigned=monthData?.allocation??0;
  const free=monthData?.free??0;
  const pending=monthData?.holds??0;
  const salaryPlan=Math.round(number(db.salary)*number(db.ratios?.hilal)/100);
  const liveReserve=window.RakaezAdaptiveCore?.assess?.(db,p);
  const banks=liveReserve?{
   hilal:liveReserve.banks.hilal.target,
   malaa:liveReserve.banks.malaa.target,
   assets:liveReserve.banks.assets.target
  }:db.reserves||{};
  const allSavings=Array.isArray(db.savings)?db.savings:[];
  const instant=number(allSavings.find(s=>s.id==='instant')?.balance);
  const sums=typeof v4Numbers==='function'?v4Numbers():{};
  const savings=number(sums.saving);
  const holdings=Array.isArray(db.holdings)?db.holdings:[];
  const unpriced=holdings.filter(h=>{
   try{return typeof rkHoldingHasPrice==='function'?!rkHoldingHasPrice(h):h.price==null&&h.marketValue==null;}
   catch(e){return true;}
  }).length;
  const pendingWithdrawals=(Array.isArray(db.withdrawals)?db.withdrawals:[]).filter(w=>
   !['paid','completed','executed','fulfilled','مكتمل','منفذ'].includes(String(w.status||'').toLowerCase())).length;
  const savedMarket=number(sums.investments);
  const hMain=!monthData?'البيانات غير متاحة':
    posted?fmt(free):free>0?fmt(free):'بانتظار التثبيت';
  const hColor=posted?free<0?'red':'teal':free>0?'gold':'navy';
  const hStatus=!monthData?'تعذر قراءة سجل الشهر':
    posted?'مخصص مثبت للشهر '+p:free>0?'رصيد مرحّل دون مخصص جديد':'مخصص الشهر غير مثبت';
  const hilal=card('hilal','بنك الهلال','التشغيل','المتبقي القابل للتخصيص',hMain,hColor,hStatus,[
   stat('الحصة المخططة',fmt(salaryPlan),'blue'),
   stat('المخصص المثبت',!monthData?'غير متاح':posted?fmt(assigned):'لم يُثبّت',posted?'teal':'navy'),
   stat('مصروفات الشهر',fmt(expenses),'red')
  ],['الاحتياطي المتغير',fmt(banks.hilal),'navy'],[
   ['transactions','المعاملات'],['cycles','دورة الراتب'],['funding','التمويل الداخلي'],['fees','الرسوم الدورية']
  ],'تظهر الحصة المخططة من نسبة الراتب، أما المخصص المثبت فيُقرأ حصريًا من سجل شهر '+p+'. المصروفات تؤخذ من معاملات الشهر، والحجوزات المعلقة '+fmt(pending)+'. المخصص ليس رصيدًا بنكيًا.');
  const malaa=card('malaa','بنك ملاءة','الادخار','رصيد الادخار المسجل',fmt(savings),'teal','وفق أرصدة الادخار المدخلة',[
   stat('الرصيد الفوري',fmt(instant),'blue'),
   stat('الاحتياطي المتغير',fmt(banks.malaa),'navy'),
   stat('طلبات سحب معلقة',String(pendingWithdrawals),'gold')
  ],null,[
   ['goals','الأهداف المالية'],['scheduled','العمليات المجدولة'],['receivables','المستحقات'],['reserves','الحماية والاستثمار']
  ],'رصيد الادخار والرصيد الفوري من السجلات المحلية، وليس من اتصال مصرفي حي. يتم احتساب هدف الحماية تلقائيًا من المصروفات والالتزامات، ولا يضاف إلى الرصيد.');
  const assets=card('assets','بنك الأصول','الاستثمار','القيمة السوقية المدخلة',fmt(savedMarket),'blue','حسب تقييمات الأصول المسجلة',[
   stat('الأصول المسجلة',String(holdings.length),'navy'),
   stat('بلا تقييم مكتمل',String(unpriced),unpriced?'gold':'teal'),
   stat('فائض متاح لدراسة الاستثمار',fmt(banks.assets),banks.assets>0?'teal':'navy')
  ],null,[
   ['research','دراسة الأسهم والشركات'],['documents','المستندات'],['reports','التقارير'],['reserves','الحماية والاستثمار']
  ],'القيمة السوقية تعتمد على آخر بيانات أدخلتها. الفائض الاستثماري المحسوب لا يُعتمد حتى استكمال حماية السيولة، ولا يُعد مبلغًا مستثمرًا فعلًا، والأصول غير المقيّمة ليست صفرًا بالضرورة.');
  return '<section class="rk42-banks" aria-label="البنوك بالتفصيل">'+
   '<header class="rk42-pagehead"><h2>البنوك بالتفصيل</h2>'+
   tooltip('طريقة قراءة الأرقام','القيم الأساسية تختلف بين البنوك: مخصصات تشغيل، ادخار، واستثمارات. لا تُجمع في رصيد نقدي واحد، وتُعرض التفاصيل المحاسبية داخل البنك المعني.')+
   '</header>'+
   '<div class="rk42-bank-list">'+hilal+malaa+assets+'</div></section>';
 }
 positionView=newBankDetails;

 const originalResearchDetail=typeof researchDetail==='function'?researchDetail:null;
 const maybe=v=>v===null||v===undefined||String(v).trim()===''?'—':safe(v);
 const quantity=(v,suffix='',digits=1)=>{
  if(v===null||v===undefined||String(v).trim()==='')return '—';
  const n=Number(v);
  return Number.isFinite(n)?n.toLocaleString('ar-SA-u-nu-latn',{maximumFractionDigits:digits})+suffix:maybe(v);
 };
 function detailResearch(id){
  const record=(db.watchlist||[]).find(x=>String(x.id)===String(id));
  if(!record)return originalResearchDetail?.(id);
  const completeness=typeof researchScores==='function'?researchScores(record).complete:0;
  const dir=record.market==='SA'?'ريال':record.market==='US'?'دولار':'';
  const price=quantity(record.price,dir?' '+dir:'',2);
  const growth=number(record.growth),fcf=number(record.fcf),debt=number(record.debt);
  const entries=[
   ['مكرر الربحية',quantity(record.pe,'',2),'navy'],
   ['عائد التوزيعات',quantity(record.dividend,'%',2),'teal'],
   ['نمو الأرباح',quantity(record.growth,'%',2),growth<0?'red':'teal'],
   ['العائد على حقوق الملكية',quantity(record.roe,'%',2),number(record.roe)<0?'red':'teal'],
   ['نسبة الديون',quantity(record.debt,'%',2),debt>0?'red':'teal'],
   ['التدفق النقدي الحر',quantity(record.fcf,'',2),fcf<0?'red':'teal']
  ];
  const source=[record.source?'المصدر: '+record.source:'',
   record.notes?'ملاحظات: '+record.notes:'',
   'هذه بيانات دراسة مدخلة يدويًا وليست أسعارًا سوقية مباشرة.'].filter(Boolean).join(' — ');
  document.getElementById('modalRoot').innerHTML=
   '<div class="modalbg rk42-research-overlay" data-rk42-modal-overlay>'+
   '<section class="modal rk42-research-dialog" role="dialog" aria-modal="true" aria-label="تفاصيل '+safe(record.name)+'">'+
   '<header class="modalhead rk42-research-head"><button type="button" onclick="closeModal()" data-rk42-close class="rk42-research-close" aria-label="إغلاق التفاصيل">×</button>'+
   '<div><h2>'+safe(record.name)+'</h2><span>'+maybe(record.symbol)+' · '+maybe(record.sector)+'</span></div>'+
   tooltip('مصدر بيانات الدراسة',source)+'</header>'+
   '<div class="rk42-research-content"><div class="rk42-research-price"><span>السعر المدخل</span>'+
   '<strong class="rk42-blue">'+price+'</strong>'+
   '<small>تاريخ السعر: '+maybe(record.date)+'</small></div>'+
   '<div class="rk42-research-section"><div class="rk42-research-section-title"><h3>المؤشرات المالية</h3>'+
   '<span>اكتمال البيانات: '+quantity(completeness,'%')+'</span></div>'+
   '<dl class="rk42-research-figures">'+entries.map(([label,v,tone])=>stat(label,v,tone)).join('')+'</dl></div></div>'+
   '<footer class="rk42-research-actions"><button type="button" class="rk42-edit" data-rk42-edit="'+safe(record.id)+'">تعديل البيانات</button>'+
   '<button type="button" data-rk42-close class="rk42-cancel">إغلاق</button></footer>'+
   '</section></div>';
 }
 if(originalResearchDetail)researchDetail=detailResearch;

 function wrapNode(node,title){
  if(!node||node.closest('.rk42-info')||node.dataset.rk42Moved)return;
  const details=document.createElement('details');
  details.className='rk42-info rk42-info-dynamic';
  const summary=document.createElement('summary');
  summary.setAttribute('aria-label','شرح '+title);summary.setAttribute('title','شرح '+title);
  summary.innerHTML=infoSymbol;
  const content=document.createElement('div');content.className='rk42-info-body';
  node.dataset.rk42Moved='true';
  node.replaceWith(details);
  content.appendChild(node);
  details.append(summary,content);
 }
 function compactNotes(){
  const view=document.getElementById('view');if(!view)return;
  if(page==='hilal'){
   const explain=[
    ['.rk39-bank-identity p','حساب المخصصات'],
    ['.rk39-feature p','المتبقي القابل للتخصيص'],
    ['.rk39-reserve .rk39-disclaimer','الاحتياطي المستهدف'],
    ['.rk39-operations header p','عمليات المخصصات'],
    ['.rk39-operation-info','شرح العمليات'],
    ['.rk39-notes','ملاحظات محاسبية']
   ];
   for(const [selector,title] of explain)wrapNode(view.querySelector(selector),title);
   const warning=view.querySelector('.rk39-warning');
   if(warning&&!warning.dataset.rk42Shortened){
    warning.dataset.rk42Shortened='true';
    const full=warning.textContent.trim();
    const brief=full.includes('لم يُثبّت')||full.includes('لم يتم تثبيت')?'مخصص الشهر بحاجة إلى تثبيت.':
     full.includes('لم يُسجل راتب')?'لا يوجد راتب مسجل لهذا الشهر.':
     'تنبيه: يوجد تجاوز في مخصص الشهر.';
    warning.textContent=brief;
    warning.insertAdjacentHTML('beforeend',tooltip('تفاصيل التنبيه',full));
   }
  }
  if(page==='statistics'){
   for(const [sel,title] of [
    ['.rk38-page-title p','عن الإحصائيات'],
    ['.rk38-summary .rk38-fineprint','صافي الوضع المالي'],
    ['.rk38-statistics .rk38-planning .rk38-fineprint','الأرقام التخطيطية']
   ])wrapNode(view.querySelector(sel),title);
  }
  if(page==='research')wrapNode(view.querySelector('.v30-note'),'بيانات الدراسة');
 }
 const previousRender=render;
 render=function(){
  const result=previousRender.apply(this,arguments);
  compactNotes();
  return result;
 };
 document.addEventListener('click',event=>{
  const route=event.target.closest('[data-rk42-to]');
  if(route){
   event.preventDefault();event.stopImmediatePropagation();
   navigate(route.dataset.rk42To);
   return;
  }
  const close=event.target.closest('[data-rk42-close]');
  if(close){
   event.preventDefault();event.stopImmediatePropagation();
   closeModal();return;
  }
  if(event.target.matches('[data-rk42-modal-overlay]')){
   closeModal();return;
  }
  const edit=event.target.closest('[data-rk42-edit]');
  if(edit){
   event.preventDefault();event.stopImmediatePropagation();
   researchForm(edit.dataset.rk42Edit);
  }
 },true);
 render();
})();