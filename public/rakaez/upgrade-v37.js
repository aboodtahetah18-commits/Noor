/* ركائز 37 — نظام ربط البنوك والصفحات والوضع المالي الموحد.
 * LOCAL REVIEW ONLY: append after v36; never rewrites postings, balances or storage.
 * Uses the approved bank pictograms, brand tokens, and all existing detail handlers.
 */
(function () {
  'use strict';
  if (typeof render !== 'function' || typeof db === 'undefined' ||
      typeof navigate !== 'function' || typeof money !== 'function') return;

  const bankNames = Object.freeze({hilal:'بنك الهلال', malaa:'بنك ملاءة', assets:'بنك الأصول'});
  const links = Object.freeze({
    insights:['position','hilal','malaa','assets','transactions','reports'],
    hilal:['position','transactions','funding','fees','cycles','ledger'],
    malaa:['position','goals','interbank','scheduled','receivables','cycles'],
    assets:['position','research','interbank','goals','documents','reports'],
    transactions:['hilal','spending','ledger','reports','import'],
    spending:['transactions','spending-followups','hilal','reports'],
    'spending-followups':['spending','transactions','reports','intelligence'],
    cycles:['hilal','malaa','assets','debts','fees','scheduled'],
    goals:['malaa','assets','position','cycles'],
    debts:['cycles','fees','position','ledger'],
    fees:['hilal','cycles','scheduled','position'],
    reserves:['position','hilal','malaa','assets','settings'],
    funding:['interbank','hilal','debts','ledger','position'],
    interbank:['funding','hilal','malaa','assets','position'],
    scheduled:['cycles','transactions','fees','receivables'],
    receivables:['scheduled','transactions','position','ledger'],
    position:['hilal','malaa','assets','debts','ledger','reports'],
    externalBanks:['position','transactions','documents','ledger'],
    research:['assets','position','documents','reports'],
    intelligence:['spending','reports','debts','position'],
    ledger:['transactions','position','reports','documents'],
    reports:['position','ledger','spending','goals'],
    documents:['transactions','ledger','import','assets'],
    import:['transactions','ledger','documents'],
    settings:['cycles','reserves','position','guide'],
    guide:['insights','position','ledger','settings']
  });
  const fallbackLabels = Object.freeze({
    insights:'الرئيسية', hilal:'بنك الهلال', malaa:'بنك ملاءة', assets:'بنك الأصول',
    position:'الوضع المالي الموحد للبنوك', interbank:'التمويل بين البنوك',
    ledger:'دفتر الأستاذ', funding:'التمويل الداخلي', transactions:'المعاملات المالية',
    spending:'كفاءة الإنفاق', 'spending-followups':'متابعة الإجراءات',
    cycles:'دورة الراتب', goals:'الأهداف المالية', debts:'الديون والالتزامات',
    fees:'الرسوم الدورية', reserves:'مخصصات البنوك', research:'مركز الشركات',
    intelligence:'مركز ذكاء ركائز', scheduled:'العمليات المجدولة',
    receivables:'المستحقات', reports:'التقارير', documents:'المستندات',
    import:'استيراد المعاملات', settings:'الإعدادات', guide:'دليل الاستخدام',
    externalBanks:'البنوك الخارجية'
  });
  const clean = value => typeof esc === 'function' ? esc(String(value ?? '')) : String(value ?? '');
  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const cash = value => money(Math.round(num(value)));
  const ratio = value => num(value).toLocaleString('ar-SA-u-nu-latn',{maximumFractionDigits:1}) + '%';

  // Route metadata is never stored as a financial transaction or reflected in db.
  let bankContext = null;
  const pageExists = target => Array.isArray(N) && N.some(row => row[0] === target);
  const pageLabel = target => fallbackLabels[target] || N.find(row => row[0] === target)?.[1] || target;
  function icon(bank) {
    const source = document.querySelector('#nav [data-rk33-page="'+ bank +'"] .rk35-bankmark');
    return source ? source.outerHTML : '';
  }
  function link(target,label,variant='text') {
    if (!pageExists(target)) return '';
    return '<button type="button" class="rk37-link rk37-link-'+variant+'" data-rk37-to="'+clean(target)+'">'+clean(label||pageLabel(target))+'</button>';
  }
  function bankLink(bank,primary=false) {
    if (!bankNames[bank]) return '';
    return '<button type="button" class="rk37-banklink'+(primary?' rk37-banklink-primary':'')+'" data-rk37-to="'+bank+'" data-rk37-bank="'+bank+'" aria-label="فتح صفحة '+bankNames[bank]+'">'+ icon(bank) +'<span>'+bankNames[bank]+'</span></button>';
  }
  function datum(label,value,tone='navy',explanation='') {
    return '<div class="rk37-datum rk37-'+tone+'"><dt>'+clean(label)+'</dt>'+ 
      '<dd>'+value+'</dd>'+(explanation?'<small>'+clean(explanation)+'</small>':'')+'</div>';
  }
  function bankCard(config) {
    return '<section class="rk37-bank" aria-label="ملخص '+config.name+'">'+
       '<header class="rk37-bank-head"><div class="rk37-bank-title">'+icon(config.id)+'<div><h3>'+config.name+'</h3>'+
       '<p>'+clean(config.purpose)+'</p></div></div>'+bankLink(config.id,true)+'</header>'+
       '<dl class="rk37-bank-figures">'+config.figures.map(item=>datum(...item)).join('')+'</dl>'+
       (config.note?'<p class="rk37-bank-note">'+clean(config.note)+'</p>':'')+
       '<div class="rk37-bank-related"><span>انتقل إلى</span>'+
       config.related.filter(pageExists).map(id=>link(id,null,'subtle')).join('')+'</div></section>';
  }
  function financialCenter() {
    if (typeof v4Numbers !== 'function') return previousPositionView();
    const stats=v4Numbers(), reserve=db.reserves||{}, ratios=db.ratios||{};
    const savingList=Array.isArray(db.savings)?db.savings:[];
    const holdings=Array.isArray(db.holdings)?db.holdings:[];
    const withdrawals=Array.isArray(db.withdrawals)?db.withdrawals:[];
    const savingInstant=savingList.find(s=>s.id==='instant');
    const unpriced=holdings.filter(h=>typeof rkHoldingHasPrice==='function'?!rkHoldingHasPrice(h):
      (h.kind==='محفظة استثمارية'?h.marketValue==null:h.price==null)).length;
    const planned = id => Math.round(num(db.salary)*num(ratios[id])/100);
    const salaryRecorded=Array.isArray(db.salaryMonths) && db.salaryMonths.includes(month);
    const unresolvedWithdrawalCount=withdrawals.filter(w=>!['paid','completed','executed','fulfilled','مكتمل','منفذ'].includes(String(w.status||'').toLowerCase())).length;
    const sections = [
      {id:'hilal',name:bankNames.hilal,purpose:'التشغيل والمصروفات والمخصصات',figures:[
        ['الحصة الشهرية المخططة من الراتب',cash(planned('hilal')),'blue'],
        ['مخصص التشغيل المسجل للشهر',cash(stats.operatingBudget),'teal'],
        ['مصروفات الشهر الفعلية',cash(stats.spending),'red'],
        ['الفرق بين المخصص والمصروف',cash(stats.operatingHeadroom),stats.operatingHeadroom>=0?'teal':'red'],
        ['الاحتياطي المستهدف',cash(reserve.hilal),'navy']
      ],note:salaryRecorded?'قيمة المخصص محسوبة بعد تسجيل راتب الشهر.':'لم يُرحّل راتب الشهر بعد؛ الحصة المخططة ليست رصيدًا نقديًا متاحًا.',
        related:['transactions','funding','fees','cycles']},
      {id:'malaa',name:bankNames.malaa,purpose:'الادخار والسيولة وطلبات السحب',figures:[
        ['رصيد الادخار المسجل',cash(stats.saving),'teal'],
        ['الرصيد الفوري المسجل',cash(savingInstant?.balance),'blue'],
        ['الاحتياطي المستهدف',cash(reserve.malaa),'navy'],
        ['الفرق العددي عن المستهدف',cash(stats.saving-num(reserve.malaa)),stats.saving>=num(reserve.malaa)?'teal':'red'],
        ['طلبات السحب غير المغلقة',String(unresolvedWithdrawalCount),'gold']
      ],note:'أرصدة الادخار تعكس الإدخالات المحلية وليست كشفًا حيًا للبنك.',
        related:['goals','scheduled','receivables','interbank']},
      {id:'assets',name:bankNames.assets,purpose:'المحافظ والأصول والقيم السوقية المدخلة',figures:[
        ['القيمة السوقية المسجلة',cash(stats.investments),'blue'],
        ['عدد الأصول المسجلة',String(holdings.length),'navy'],
        ['أصول دون تقييم مكتمل',String(unpriced),unpriced>0?'gold':'teal'],
        ['الاحتياطي المستهدف',cash(reserve.assets),'navy'],
        ['الفرق العددي عن المستهدف',cash(stats.investments-num(reserve.assets)),stats.investments>=num(reserve.assets)?'teal':'red']
      ],note:'القيمة السوقية قد تكون غير مكتملة. الفرق عن المستهدف مؤشر مرجعي وليس سيولة قابلة للسحب.',
        related:['research','goals','interbank','documents']}
    ];
    const goalsTarget=(Array.isArray(db.goals)?db.goals:[]).reduce((sum,g)=>sum+Math.max(0,num(g.target)),0);
    const reserveTarget=['hilal','malaa','assets'].reduce((sum,id)=>sum+Math.max(0,num(reserve[id])),0);
    const summary=[
      ['الادخار المسجل',cash(stats.saving),'teal'],
      ['الاستثمارات المسجلة',cash(stats.investments),'blue'],
      ['الديون الخارجية المتبقية',cash(stats.debt),'red'],
      ['صافي الوضع المالي الجزئي',cash(stats.partialNet),stats.partialNet>=0?'teal':'red']
    ];
    const references=[
      ['أصل التمويل الداخلي المتبقي',cash(stats.internal),'red','مرجع إداري لا يُخصم مرة ثانية من الصافي'],
      ['الرسوم السنوية المتوقعة',cash(stats.annualFees),'red','تقدير لمصاريف مستقبلية وليس دفعة مسددة'],
      ['مجموع الاحتياطيات المستهدفة',cash(reserveTarget),'navy','أهداف تخطيطية وليست نقدًا إضافيًا'],
      ['مجموع الأهداف المالية المستقبلية',cash(goalsTarget),'navy','مستهدفات لا تخصم من الوضع الحالي']
    ];
    return '<section class="rk37-center" aria-label="الوضع المالي الموحد للبنوك">'+
       '<header class="rk37-center-head"><h2>الوضع المالي الموحد للبنوك</h2>'+ 
       '<p>قراءة مرتبطة بجميع البنوك؛ توضح المخصصات والأرصدة والمصروفات والالتزامات دون خلطها.</p></header>'+
       '<section class="rk37-ledger-summary"><h3>الملخص المالي المسجل</h3><dl>'+summary.map(x=>datum(...x)).join('')+'</dl>'+ 
       '<p>صافي الوضع المالي الجزئي = الادخار المسجل + الاستثمار المسجل − الديون الخارجية؛ ليس ميزانية عمومية مكتملة أو رصيدًا مصرفيًا.</p></section>'+
       '<section class="rk37-center-banks"><h3>البنوك بالتفصيل</h3>'+sections.map(bankCard).join('')+'</section>'+
       '<section class="rk37-ledger-summary rk37-references"><h3>الالتزامات والمستهدفات المرجعية</h3><dl>'+references.map(([label,value,tone,note])=>datum(label,value,tone,note)).join('')+'</dl></section>'+
       '<p class="rk37-center-disclaimer">لا يتوفر في هذه السجلات رصيد نقدي مؤكد لكل بنك. لا تُحسب المخصصات والاستثمارات والأهداف والمبالغ التخطيطية كسيولة واحدة؛ يلزم الرجوع إلى كشوف البنوك للمطابقة.</p>'+
       '</section>';
  }

  // Keep financial formulas and every previously available page action intact.
  const previousPositionView = typeof positionView==='function' ? positionView : ()=>'';
  positionView=financialCenter;

  // Name bank-to-bank transfers accurately; don't change the stored type or its mathematics.
  if(typeof interbankView==='function') {
    const earlierInterbank=interbankView;
    interbankView=function(){
      const html=earlierInterbank.apply(this,arguments);
      return html.replaceAll('طلبات التمويل بين المراكز','طلبات التمويل بين البنوك')
        .replaceAll('طلب تمويل بين المراكز','طلب تمويل بين البنوك')
        .replaceAll('الجهة المقرضة','البنك المقرض')
        .replaceAll('الجهة المستفيدة','البنك المستفيد');
    };
  }
  for(const entry of Array.isArray(N)?N:[]) {
    if(bankNames[entry[0]])entry[1]=bankNames[entry[0]];
    if(entry[0]==='position')entry[1]='الوضع المالي الموحد للبنوك';
    if(entry[0]==='interbank')entry[1]='التمويل بين البنوك';
    if(entry[0]==='reserves')entry[1]='مخصصات البنوك';
  }

  function indexRelated(pageName) {
    const ids=(links[pageName]||[]).filter(pageExists).filter(x=>x!==pageName);
    return '<nav class="rk37-context" aria-label="الصفحات المرتبطة"><span>صفحات مرتبطة</span>'+
      ids.map(id=>link(id,null,'context')).join('')+'</nav>';
  }
  function centerBankNames(root) {
    const replacements = {
      'المركز الممول':'البنك الممول','المركز المستفيد':'البنك المستفيد',
      'مركز مالي':'بنك', 'المراكز المالية بالتفصيل':'البنوك بالتفصيل',
      'طلبات التمويل بين المراكز':'طلبات التمويل بين البنوك',
      'طلب تمويل بين المراكز':'طلب تمويل بين البنوك',
      'المراكز المالية':'البنوك'
    };
    const precise = '.v27-centers small,.v27-card-head strong,.v30-record-head .v30-pill,'+
      '.rk35-pagehead h2,.rk35-request-intro strong,.rk33-guide-topic summary>span,'+
      '.rk34-bank-card .rk34-tag,.v30-record-head .v30-status';
    root.querySelectorAll(precise).forEach(el=>{
      const txt=(el.textContent||'').trim();
      if(Object.hasOwn(replacements,txt))el.textContent=replacements[txt];
    });
  }
  function bankOfMark(element) {
    return Object.keys(bankNames).find(id=>element.querySelector('.rk35-bankmark-'+id))||null;
  }
  function makeBankClickable(container,selector) {
    container.querySelectorAll(selector).forEach(el=>{
      if(el.hasAttribute('data-rk37-to'))return;
      const bank=bankOfMark(el);
      if(!bank||!pageExists(bank))return;
      // The v36 decorator may also have added a mark inside the text label.
      // Keep only the original, approved bank mark — one icon per bank.
      if(el.matches('.rk35-route-bank')) {
        el.querySelectorAll('strong .rk35-bankmark').forEach(mark=>mark.remove());
      }
      // Replaces a display-only label with the same text and icon in a real button.
      const btn=document.createElement('button');
      btn.type='button';btn.className=el.className+' rk37-inline-bank';
      btn.dataset.rk37To=bank;btn.dataset.rk37Bank=bank;
      btn.setAttribute('aria-label','فتح '+bankNames[bank]);
      btn.innerHTML=el.innerHTML;
      el.replaceWith(btn);
    });
  }
  function activateBankLinks(root) {
    makeBankClickable(root,'.rk35-route-bank');
    makeBankClickable(root,'.v27-centers b');
    makeBankClickable(root,'.rk34-reserve-card .rk34-cardidentity h3');
    makeBankClickable(root,'.rk34-fee-card .rk34-cardidentity small');
  }
  function decorateCurrentPage() {
    const view=document.getElementById('view');
    if(!view)return;
    view.classList.add('rk37-linked');
    view.setAttribute('data-rk37-page',String(page));
    if(page==='position')view.classList.add('rk37-financial-view');
    else view.classList.remove('rk37-financial-view');
    centerBankNames(view);
    activateBankLinks(view);
    // Scope hints to the read-only display; never append text inside an input or posting.
    if(!view.querySelector('.rk37-context')) view.insertAdjacentHTML('afterbegin',indexRelated(page));
    const title=document.getElementById('pageTitle');
    if(title&&page==='position')title.textContent='الوضع المالي الموحد للبنوك';
    if(title&&page==='interbank')title.textContent='التمويل بين البنوك';
  }
  function openPage(target,bank=null) {
    if(!pageExists(target))return;
    const origin=page;
    bankContext=bankNames[bank]?bank:(bankNames[origin]&&target==='interbank'?origin:null);
    if(typeof closeModal==='function')closeModal();
    navigate(target);
    // Bank-scoped links narrow the existing filter without changing any records.
    if(target==='interbank' && bankContext){
      const select=document.getElementById('rk35BankFilter');
      if(select){select.value=bankContext;select.dispatchEvent(new Event('change',{bubbles:true}));}
    }
  }
  document.addEventListener('click',event=>{
    const btn=event.target.closest('[data-rk37-to]');
    if(!btn)return;
    event.preventDefault();event.stopImmediatePropagation();
    openPage(btn.dataset.rk37To,btn.dataset.rk37Bank||null);
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&document.activeElement?.closest('.rk37-context')){
      document.activeElement.blur();
    }
  });

  // Link detail windows to the corresponding page without adding extra statistic boxes.
  let modalCheckPending=false;
  function addModalRelations(){
    const holder=document.getElementById('modalRoot');
    if(!holder||!holder.children.length)return;
    const dialog=holder.querySelector('.v27-dialog,.v32-document-dialog,.rk-record-detail,.rk-budget-detail-dialog');
    if(!dialog||dialog.querySelector('.rk37-modal-nav'))return;
    const targets=(links[page]||[]).slice(0,3).filter(pageExists);
    if(!targets.length)return;
    dialog.insertAdjacentHTML('beforeend','<nav class="rk37-modal-nav" aria-label="صفحات ذات صلة"><span>مرتبط بـ</span>'+targets.map(id=>link(id,null,'subtle')).join('')+'</nav>');
  }
  const modal=document.getElementById('modalRoot');
  if(modal&&typeof MutationObserver!=='undefined') {
    const observer=new MutationObserver(()=>{
      if(modalCheckPending)return;
      modalCheckPending=true;
      queueMicrotask(()=>{modalCheckPending=false;addModalRelations();});
    });
    observer.observe(modal,{childList:true,subtree:true});
  }

  const renderPrevious=render;
  render=function(){
    const result=renderPrevious.apply(this,arguments);
    decorateCurrentPage();
    return result;
  };
  decorateCurrentPage();
})();
