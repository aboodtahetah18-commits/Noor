/* Rakaez v34 — nine-page calm financial redesign.
   The display is lighter: a single card, unboxed figures, modest controls.
   Data models, navigation and accounting/save routines remain unchanged. */
(function(){
'use strict';
if(typeof db==='undefined'||typeof render!=='function'||typeof money!=='function')return;
const clean=v=>esc(String(v===null||v===undefined?'':v));
const numeric=v=>Number.isFinite(Number(v))?Number(v):0;
const amt=v=>money(numeric(v));
const pct=v=>numeric(v).toLocaleString('ar-SA-u-nu-latn',{maximumFractionDigits:1})+'%';
const glyph={
 plus:'<path d="M12 5v14M5 12h14"/>',
 view:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 edit:'<path d="M12 20h9M16 4a2 2 0 0 1 3 3L8 18l-4 2 1-4Z"/>',
 next:'<path d="M9 18l6-6-6-6"/>'
};
const icon=name=>'<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+glyph[name]+'</svg>';
const button=(action,label,id='',symbol='view',primary=false)=>'<button type="button" class="rk34-action'+(primary?' rk34-primary':'')+'" data-rk34-action="'+action+'" data-rk34-id="'+clean(id)+'">'+icon(symbol)+'<span>'+clean(label)+'</span></button>';
const heading=(text,action='',label='')=>'<header class="rk34-pagehead"><h2>'+clean(text)+'</h2>'+(action?button(action,label,'','plus',true):'')+'</header>';
const tag=(value,tone='neutral')=>'<span class="rk34-tag rk34-'+tone+'">'+clean(value)+'</span>';
const caption=text=>'<p class="rk34-caption">'+clean(text)+'</p>';
const metric=(label,value,tone='navy',extra='')=>'<div class="rk34-figure rk34-'+tone+(extra?' '+extra:'')+'"><dt>'+clean(label)+'</dt><dd>'+value+'</dd></div>';
const values=(items,extra='')=>'<dl class="rk34-values'+(extra?' '+extra:'')+'">'+items.join('')+'</dl>';
const meta=(label,value,tone='navy')=>'<div class="rk34-meta"><span>'+clean(label)+'</span><b class="rk34-'+tone+'">'+clean(value)+'</b></div>';
const card=(title,status,content,action='',id='',footText='',statusTone='neutral',symbol='view')=>
 '<article class="rk34-card">'+
 '<header class="rk34-cardhead"><div class="rk34-cardidentity"><h3>'+clean(title)+'</h3></div>'+ (status?tag(status,statusTone):'')+'</header>'+
 content+(action?'<footer class="rk34-cardfoot">'+(footText?'<span>'+clean(footText)+'</span>':'<span></span>')+button(action,'عرض التفاصيل',id,symbol)+'</footer>':'')+
 '</article>';
const empty=text=>'<p class="rk34-empty">'+clean(text)+'</p>';
const screen=(key,title,contents,add='',addText='',note='')=>
 '<section class="rk34-screen rk34-'+key+'">'+heading(title,add,addText)+
 '<div class="rk34-cardgrid">'+(contents||empty('لا توجد سجلات مسجلة.'))+'</div>'+
 (note?caption(note):'')+'</section>';

// Goals: one legible card with full-width progress and three unboxed figures.
goalsView=function(){
 const entries=(db.goals||[]).slice().sort((a,b)=>String(a.date||'9999').localeCompare(String(b.date||'9999')));
 const cards=entries.map(goal=>{
  const target=Math.max(0,numeric(goal.target)),saved=Math.max(0,numeric(goal.saved));
  const remaining=Math.max(0,target-saved);
  const progress=target>0?Math.min(100,Math.max(0,saved/target*100)):0;
  const state=target>0&&saved>=target?'مكتمل':'قيد التوفير';
  const tone=state==='مكتمل'?'teal':'gold';
  return '<article class="rk34-card rk34-goal-card">'+
   '<header class="rk34-cardhead"><div class="rk34-cardidentity"><h3>'+clean(goal.name||'هدف مالي')+'</h3>'+
    '<small>الموعد المستهدف: <time>'+clean(goal.date||'غير محدد')+'</time></small></div>'+tag(state,tone)+'</header>'+
   '<div class="rk34-goal-status"><strong class="'+(progress>=70?'rk34-teal':progress>=35?'rk34-gold':'rk34-navy')+'">'+pct(progress)+'</strong><span>نسبة الإنجاز</span></div>'+
   '<div class="rk34-progress" role="progressbar" aria-label="نسبة إنجاز الهدف" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+progress.toFixed(1)+'"><span style="width:'+progress+'%"></span></div>'+
   values([metric('المستهدف',amt(target),'navy'),metric('المخصص المسجل',amt(saved),'teal'),metric('المتبقي',amt(remaining),remaining>0?'gold':'teal')],'rk34-three')+
   '<footer class="rk34-cardfoot"><span>هدف تخطيطي</span>'+button('view-goal','عرض التفاصيل',goal.id)+'</footer></article>';
 }).join('');
 return screen('goals','الأهداف المالية المسجلة',cards,'add-goal','إضافة هدف');
};

// Debts: show real accounting figures without nested tiles.
debtsView=function(){
 const entries=(db.debts||[]).slice().sort((a,b)=>String(a.date||'9999').localeCompare(String(b.date||'9999')));
 const cards=entries.map(debt=>{
  const principal=Math.max(0,numeric(debt.principal)),paid=Math.max(0,numeric(debt.paid));
  const remaining=Math.max(0,principal-paid),progress=principal>0?Math.max(0,Math.min(100,paid/principal*100)):0;
  return '<article class="rk34-card rk34-debt-card">'+
   '<header class="rk34-cardhead"><div class="rk34-cardidentity"><h3>'+clean(debt.name||'التزام مالي')+'</h3>'+
    '<small>الاستحقاق: <time>'+clean(debt.date||'غير محدد')+'</time></small></div>'+
    tag(remaining===0?'مسدد':'التزام قائم',remaining===0?'teal':'gold')+'</header>'+
   values([metric('أصل الالتزام',amt(principal),'navy'),metric('المسدّد',amt(paid),'teal'),
    metric('المتبقي',amt(remaining),remaining>0?'red':'teal'),metric('القسط الشهري',amt(debt.installment),'red')])+
   '<div class="rk34-progress-row"><span>نسبة السداد</span><strong class="rk34-teal">'+pct(progress)+'</strong></div>'+
   '<div class="rk34-progress" role="progressbar" aria-label="نسبة سداد الالتزام" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+progress.toFixed(1)+'"><span style="width:'+progress+'%"></span></div>'+
   '<footer class="rk34-cardfoot"><span>المتبقي من الالتزام</span>'+button('view-debt','عرض التفاصيل',debt.id)+'</footer></article>';
 }).join('');
 return screen('debts','الالتزامات المسجلة',cards,'add-debt','إضافة التزام');
};

// Periodic fees: principal amount prominent, recurrence and account as plain rows.
feesView=function(){
 const cards=(db.fees||[]).map(fee=>{
  const recurrence=typeof periodLabel==='function'?periodLabel(fee.period):'غير محدد';
  const bank=typeof bankName==='function'&&fee.bank?bankName(fee.bank):'غير محدد';
  return '<article class="rk34-card rk34-fee-card">'+
   '<header class="rk34-cardhead"><div class="rk34-cardidentity"><h3>'+clean(fee.name||'رسم دوري')+'</h3>'+
    '<small>'+clean(bank)+'</small></div>'+tag('رسم دوري','red')+'</header>'+
   '<div class="rk34-fee-amount"><span>قيمة الرسم</span><strong class="rk34-red">'+amt(fee.amount)+'</strong></div>'+
   '<div class="rk34-meta-list">'+meta('الدورية',recurrence)+meta('الحساب المرتبط',fee.account||'غير محدد')+'</div>'+
   '<footer class="rk34-cardfoot"><span>قيمة دورية مسجلة</span>'+button('view-fee','عرض التفاصيل',fee.id)+'</footer></article>';
 }).join('');
 return screen('fees','الرسوم والاشتراكات',cards,'add-fee','إضافة رسم');
};

// Banks' target reserves: one highlighted amount, not three nested blocks.
reservesView=function(){
 const groups=[['hilal','بنك الهلال','التشغيل'],['malaa','بنك ملاءة','الادخار'],['assets','بنك الأصول','الاستثمار']];
 const cards=groups.map(([id,name,purpose])=>
  '<article class="rk34-card rk34-reserve-card">'+
   '<header class="rk34-cardhead"><div class="rk34-cardidentity"><h3>'+name+'</h3><small>مخصص '+purpose+'</small></div>'+
   tag('مستهدف','teal')+'</header>'+
   '<div class="rk34-reserve-amount"><span>الاحتياطي المستهدف</span><strong class="rk34-blue">'+amt(db.reserves?.[id])+'</strong></div>'+
   '<footer class="rk34-cardfoot"><span>هدف تخطيطي وليس رصيدًا نقديًا</span>'+button('edit-reserve','تعديل',id,'edit')+'</footer></article>'
 ).join('');
 return screen('reserves','الاحتياطيات المستهدفة',cards);
};

// Unified center: keep savings, invested values and budgets conceptually separate.
positionView=function(){
 const b=v4Numbers();
 const listed=[
  {id:'hilal',title:'بنك الهلال',label:'التشغيل',rows:[
   ['مخصص تشغيل الشهر',b.operatingBudget,'blue'],
   ['مصروفات الشهر',b.spending,'red'],
   ['الفرق بين المخصص والمصروف',b.operatingHeadroom,b.operatingHeadroom>=0?'teal':'red']]},
  {id:'malaa',title:'بنك ملاءة',label:'الادخار',rows:[
   ['رصيد الادخار المسجل',b.saving,'teal'],
   ['الاحتياطي المستهدف',numeric(db.reserves?.malaa),'blue'],
   ['الفرق عن المستهدف',b.saving-numeric(db.reserves?.malaa),b.saving-numeric(db.reserves?.malaa)>=0?'teal':'red']]},
  {id:'assets',title:'بنك الأصول',label:'الاستثمار',rows:[
   ['القيمة السوقية المسجلة',b.investments,'blue'],
   ['الاحتياطي المستهدف',numeric(db.reserves?.assets),'navy'],
   ['الفرق عن المستهدف',b.investments-numeric(db.reserves?.assets),b.investments-numeric(db.reserves?.assets)>=0?'teal':'red']]}
 ];
 const cards=listed.map(bank=>'<article class="rk34-card rk34-bank-card">'+
  '<header class="rk34-cardhead"><div class="rk34-cardidentity"><h3>'+bank.title+'</h3><small>'+bank.label+'</small></div>'+tag('مركز مالي')+'</header>'+
  values(bank.rows.map(([name,value,tone])=>metric(name,amt(value),tone)),'rk34-three')+
  '<footer class="rk34-cardfoot"><span>بيانات المركز المسجلة</span>'+button('open-bank','عرض البنك',bank.id)+'</footer></article>').join('');
 const extras=[
  ['الديون الخارجية المتبقية',b.debt,'red'],
  ['أصل التمويل الداخلي التخطيطي',b.internal,'navy'],
  ['الرسوم السنوية المتوقعة',b.annualFees,'red']
 ];
 return '<section class="rk34-screen rk34-position">'+heading('المراكز المالية بالتفصيل')+
 '<p class="rk34-caption">الادخار والاستثمارات والمخصصات أرقام مختلفة الطبيعة، ولا تُجمع تلقائيًا كرصيد نقدي واحد.</p>'+
 '<div class="rk34-cardgrid">'+cards+'</div>'+
 '<section class="rk34-overview"><h3>التزامات وتقديرات مرجعية</h3><div class="rk34-meta-list">'+
 extras.map(([label,value,tone])=>'<div class="rk34-meta"><span>'+label+'</span><b class="rk34-'+tone+'">'+amt(value)+'</b></div>').join('')+
 '</div></section></section>';
};

// Intelligence: one row per recommendation, not an extra box around every number.
intelligenceView=function(){
 const result=insightData();
 const banks=['الهلال','ملاءة','الأصول'];
 const sections=banks.map(bank=>{
  const notices=(result.notices||[]).filter(n=>n.bank===bank);
  const rows=notices.length?notices.map(n=>{
   const tone=n.level==='تحذير'?'red':n.level==='متابعة'?'gold':'teal';
   const validLink=N.some(link=>link[0]===n.link);
   return '<article class="rk34-notice">'+
     '<div class="rk34-notice-main">'+tag(n.level||'معلومة',tone)+
     '<h4>'+clean(n.title||'توصية')+'</h4>'+
     '<strong class="rk34-notice-amount rk34-'+tone+'">'+clean(n.amount||'—')+'</strong></div>'+
     (validLink?button('open-bank','عرض القسم',n.link):'')+
    '</article>';
  }).join(''):'<p class="rk34-no-notices">لا توجد تنبيهات بحاجة للمتابعة حاليًا.</p>';
  return '<section class="rk34-intelligence-group"><header><h3>'+bank+'</h3>'+
   '<small>'+notices.length+' '+(notices.length===1?'توصية':'توصيات')+'</small></header>'+
   '<div class="rk34-notice-list">'+rows+'</div></section>';
 }).join('');
 return '<section class="rk34-screen rk34-intelligence">'+heading('التوصيات المالية')+
 '<p class="rk34-caption">مراجعة الحالات التي تستدعي انتباهك، بحسب البيانات المسجلة في كل مركز.</p>'+
 '<div class="rk34-intelligence-list">'+sections+'</div>'+
 '<p class="rk34-caption">التوصيات للتحليل والمراجعة ولا تنفّذ تعديلًا ماليًا آليًا.</p></section>';
};

// No changes to accounting, balances, write handlers, or salary logic.
document.addEventListener('click',event=>{
 const el=event.target.closest('[data-rk34-action]');
 if(!el)return;
 event.preventDefault();
 event.stopImmediatePropagation();
 const action=el.dataset.rk34Action,id=el.dataset.rk34Id||'';
 if(action==='add-goal')return formV3('goals');
 if(action==='view-goal')return detailV3('goals',id);
 if(action==='add-debt')return formV3('debts');
 if(action==='view-debt')return detailV3('debts',id);
 if(action==='add-fee')return formV3('fees');
 if(action==='view-fee')return detailV3('fees',id);
 if(action==='edit-reserve')return formV3('reserves',id);
 if(action==='open-bank')return navigate(id);
},true);
const previousRender=render;
render=function(){
 const result=previousRender.apply(this,arguments);
 if(page==='intelligence'){
  const view=document.getElementById('view');
  if(view){view.innerHTML=intelligenceView();view.classList.add('rk34-ready');}
 }
 const view=document.getElementById('view');
 if(view)view.classList.toggle('rk34-ready',['goals','debts','fees','reserves','position','research','intelligence','funding','interbank'].includes(page));
 return result;
};
render();
})();
