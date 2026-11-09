/* ركائز 39 — نظام العمليات التشغيلية الفعلية للمخصص الشهري والاحتياطي.
   مسودة محلية للمراجعة فقط؛ لا تُنفذ تحويلات مصرفية تلقائيا ولا تغيّر دفتر الأستاذ الأصلي. */
(function(){
'use strict';
const core=typeof window!=='undefined'?window.RakaezHilalCore:null;
if(!core||typeof hilal!=='function'||typeof render!=='function'||typeof navigate!=='function'||typeof db==='undefined')return;
const escaping=v=>typeof esc==='function'?esc(String(v??'')):String(v??'').replace(/[&<>'"]/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[x]));
const financial=v=>money(Math.round(v||0));
const humanAmount=n=>(Math.round(n)/100).toLocaleString('en-US',{maximumFractionDigits:2,minimumFractionDigits:2});
const asRiyals=v=>{const n=Number(v);if(!Number.isFinite(n)||n<=0)return NaN;return Math.round(n*100)};
const labelPeriod=p=>{const [y,m]=String(p).split('-');return String(m||'')+'/'+String(y||'')};
const mainMonths=()=>{
 const list=new Set();
 const base=typeof month==='string'&&/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)?month:new Date().toISOString().slice(0,7);
 const [y,m]=base.split('-').map(Number);
 for(let i=-5;i<=1;i++){
  const d=new Date(y,m-1+i,1);
  list.add(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));
 }
 (db.salaryMonths||[]).forEach(p=>list.add(p));
 Object.keys(core.read(db).months).forEach(p=>list.add(p));
 for(const e of core.read(db).events){if(e.from)list.add(e.from);if(e.to)list.add(e.to)}
 return [...list].filter(p=>/^20\d{2}-(0[1-9]|1[0-2])$/.test(p)).sort().reverse();
};
let selectedPeriod=typeof month==='string'?month:new Date().toISOString().slice(0,7);
// Exposes only the selected month for consistent read-only bank summaries.
window.RakaezHilalSelectedPeriod=()=>selectedPeriod;
function dynamicSafetyTarget(){
 const engine=window.RakaezAdaptiveCore;
 if(!engine||typeof engine.assess!=='function')return undefined;
 try{return engine.assess(db,selectedPeriod).banks.hilal.target;}
 catch(e){return undefined;}
}
const bankSymbol=()=>document.querySelector('#nav [data-rk33-page="hilal"] .rk35-bankmark')?.outerHTML||'';
const tone=(amount,preferred='teal')=>amount<0?'red':preferred;
function value(label,amount,style='navy',hint=''){
 return '<div class="rk39-number rk39-'+style+'"><span>'+escaping(label)+'</span><strong>'+financial(amount)+'</strong>'+(hint?'<small>'+escaping(hint)+'</small>':'')+'</div>';
}
const actionIcons={'reserve-add':'plus','reserve-opening':'shield','reserve-release':'refresh',snapshot:'calendar',rollover:'forward','bank-transfer':'bank'};
const pageIcons={reserves:'edit',transactions:'plus',cycles:'calendar',fees:'fund',ledger:'list'};
const fullActionNames={'reserve-add':'تغذية الاحتياطي','reserve-opening':'تثبيت احتياطي افتتاحي','reserve-release':'إعادة تخصيص الاحتياطي',snapshot:'تثبيت مخصص الشهر',rollover:'ترحيل الفائض','bank-transfer':'طلب تحويل بين البنوك'};
const semanticIcon=name=>typeof ico==='function'?ico(name):'';
function action(key,title,extra='',disabled=false,variant='secondary'){
 return '<button type="button" class="rk39-action rk39-'+variant+'" data-rk39-open="'+escaping(key)+'" '+(extra?'data-rk39-id="'+escaping(extra)+'" ':'')+(disabled?'disabled ':'')+
 ' aria-label="'+escaping(fullActionNames[key]||title)+'" title="'+escaping(fullActionNames[key]||title)+'">'+semanticIcon(actionIcons[key]||'help')+'<span>'+escaping(title)+'</span></button>';
}
function toPage(target,title){return '<button type="button" class="rk39-text-link" data-rk39-go="'+target+'" aria-label="'+escaping(title)+'">'+semanticIcon(pageIcons[target]||'list')+'<span>'+escaping(title)+'</span></button>'}
function hint(label,description){
 return '<details class="rk39-hint"><summary aria-label="معلومات: '+escaping(label)+'" title="معلومات: '+escaping(label)+'">'+semanticIcon('help')+'</summary>'+
  '<div class="rk39-hint-body">'+escaping(description)+'</div></details>';
}
function periodOptions(current){return mainMonths().map(p=>'<option value="'+p+'" '+(p===current?'selected':'')+'>'+labelPeriod(p)+'</option>').join('')}
function rowsHistory(){
 const months=mainMonths().filter(p=>core.read(db).months[p]||(db.salaryMonths||[]).includes(p)||core.history(db,p).length);
 if(!months.length)return '<p class="rk39-muted">لا توجد أشهر مرجعية مثبتة بعد.</p>';
 return months.slice(0,12).map(p=>{
  const state=core.monthly(db,p);
  return '<button type="button" class="rk39-history-row '+(state.deficit?'rk39-alert':'')+'" data-rk39-month="'+p+'"><span>'+labelPeriod(p)+'</span><span>'+(state.posted?'مخصص مثبت':'غير مثبت')+'</span><strong class="rk39-'+tone(state.free)+'">'+financial(state.free)+'</strong></button>';
 }).join('');
}
function eventType(e){
 return {'rollover':'ترحيل فائض','reserve-add':'تغذية الاحتياطي','reserve-opening':'رصيد احتياطي افتتاحي','reserve-release':'إعادة تخصيص من الاحتياطي','bank-transfer':'تحويل بين البنوك'}[e.kind]||'عملية مالية';
}
function eventDestination(e){
 if(e.kind==='rollover')return 'إلى شهر '+labelPeriod(e.to);
 if(e.kind==='reserve-add')return 'إلى احتياطي بنك الهلال';
 if(e.kind==='reserve-release')return 'إلى شهر '+labelPeriod(e.to);
 if(e.kind==='bank-transfer')return 'إلى '+(core.BANKS[e.targetBank]||'بنك آخر');
 return '';
}
function status(e){return {posted:'مثبتة',pending:'بانتظار إثبات التنفيذ',confirmed:'منفذة وتنتظر مطابقة الوصول',matched:'تمت مطابقة الوصول',cancelled:'ملغاة'}[e.status]||'غير محددة';}
function ledgerList(){
 const events=core.history(db,selectedPeriod);
 if(!events.length)return '<p class="rk39-muted">لا توجد عمليات تخصيص أو ترحيل مسجلة لهذا الشهر.</p>';
 return events.map(e=>{
  const pending=e.status==='pending',confirmed=e.status==='confirmed';
  const buttons=pending?action('confirm','إثبات التنفيذ',e.id,false,'primary')+action('cancel','إلغاء الطلب',e.id):confirmed?action('match','مطابقة الوصول',e.id,false,'primary'):'';
  return '<article class="rk39-entry"><div><h4>'+escaping(eventType(e))+'</h4><small>'+escaping(eventDestination(e))+'</small>'+
   (e.reference?'<small>مرجع التنفيذ: '+escaping(e.reference)+'</small>':'')+
   (e.note?'<small>البيان: '+escaping(e.note)+'</small>':'')+'</div><div class="rk39-entry-amount"><strong>'+financial(e.amount)+'</strong><span class="rk39-status">'+status(e)+'</span></div>'+
   (buttons?'<div class="rk39-entry-controls">'+buttons+'</div>':'')+'</article>';
 }).join('');
}
const originalHilal=hilal;
function hilalState(){
 const budget=core.monthly(db,selectedPeriod);
 const res=core.reserve(db,dynamicSafetyTarget());
 const salary=(db.salaryMonths||[]).includes(selectedPeriod);
 const pending=core.read(db).events.filter(e=>e.kind==='bank-transfer'&&e.status==='pending'&&e.from===selectedPeriod);
 return {budget,res,salary,pending,hasAvail:budget.free>0&&!budget.deficit};
}
function hilalReservePanel(state){
 const {res,hasAvail}=state;
 const progress=Math.min(100,Math.max(0,res.progress));
 return '<section class="rk39-ws-section" aria-label="الاحتياطي المالي">'+
  '<header class="rk39-ws-section-title"><h3>الاحتياطي المتغير</h3>'+
   hint('كيف يُحسب الهدف؟','الهدف متغير بحسب المصروفات والالتزامات وفترة الحماية. الحجز الداخلي لا يمثل نقدًا مصرفيًا حتى تتم المطابقة.')+'</header>'+
  '<div class="rk39-ws-reserve-stats">'+
  value('الهدف',res.target,'navy')+value('المحجوز',res.earmarked,'teal')+
  value('الفجوة',res.gap,'red')+'</div>'+
  '<div class="rk39-ws-meter"><span style="width:'+progress+'%"></span></div>'+
  '<div class="rk39-controls rk39-quick-actions">'+
    action('reserve-add','تغذية','',!hasAvail||res.gap<=0,'primary')+
    action('reserve-opening','افتتاحي','',res.earmarked>0||core.history(db).some(e=>e.kind==='reserve-add'||e.kind==='reserve-release'||e.kind==='reserve-opening'))+
    action('reserve-release','تخصيص','',res.earmarked<=0)+
    toPage('reserves','تعديل')+
  '</div></section>';
}
function hilalOperationsPanel(state){
 const {budget,salary,hasAvail}=state;
 return '<section class="rk39-ws-section" aria-label="عمليات دورة الراتب">'+
   '<header class="rk39-ws-section-title"><h3>إجراءات المخصص</h3>'+
   hint('سجل العمليات','التخصيص لا ينشئ نقدًا جديدًا. التحويل لا يكتمل قبل إثبات تنفيذه ومطابقة الوصول.')+'</header>'+
   '<div class="rk39-controls rk39-quick-actions">'+
     action('rollover','ترحيل','',!hasAvail)+
     action('bank-transfer','تحويل','',!hasAvail)+
     toPage('cycles','الراتب')+
     toPage('fees','الرسوم')+'</div>'+
   '<div class="rk39-ws-subaction">'+
     (budget.posted?'<span class="rk39-ws-status rk39-ws-done">المخصص مثبت</span>':
     (salary?action('snapshot','تثبيت المخصص','',false,'primary'):
     '<span class="rk39-ws-status">يلزم تسجيل الراتب قبل التثبيت</span>'))+
     toPage('transactions','تسجيل مصروف')+
   '</div></section>';
}
function hilalRecordsPanel(state){
 let legacy='';
 try{legacy=originalHilal()}catch(e){legacy='<p class="rk39-muted">تعذر عرض التفاصيل التشغيلية القديمة.</p>'}
 return '<div class="rk39-ws-records">'+
 '<section class="rk39-history"><header><h3>الأرصدة الشهرية</h3></header>'+
 '<div class="rk39-history-head"><span>الشهر</span><span>الحالة</span><span>غير المخصص</span></div>'+rowsHistory()+'</section>'+
 '<section class="rk39-audit"><header><h3>العمليات المسجلة</h3><small>'+
  (state.pending.length?'تحويلات معلقة: '+state.pending.length:'لا توجد تحويلات معلقة')+
  '</small></header>'+ledgerList()+'</section>'+
 '<div class="rk39-ws-subaction">'+toPage('ledger','دفتر الأستاذ')+toPage('transactions','المعاملات')+'</div>'+
 '<details class="rk39-existing-budget"><summary>بنود الميزانية والتفاصيل القديمة</summary>'+
 '<div class="rk39-existing-content">'+legacy+'</div></details></div>';
}
function openBankWorkspace(tab='reserve'){
 const root=document.getElementById('modalRoot');if(!root)return;
 const state=hilalState();
 const tabs={reserve:'الحماية',operations:'العمليات',records:'السجلات'};
 if(!Object.prototype.hasOwnProperty.call(tabs,tab))tab='reserve';
 const body=tab==='reserve'?hilalReservePanel(state):
  tab==='operations'?hilalOperationsPanel(state):hilalRecordsPanel(state);
 root.innerHTML='<div class="rk39-ws-overlay" data-rk39-workspace-overlay>'+
  '<section class="rk39-workspace" role="dialog" aria-modal="true" aria-labelledby="rk39-ws-title">'+
   '<header class="rk39-ws-header"><span aria-hidden="true"></span>'+
   '<h2 id="rk39-ws-title">إدارة بنك الهلال</h2>'+
   '<button type="button" class="rk39-ws-close" data-rk39-workspace-close aria-label="إغلاق نافذة الإدارة">×</button></header>'+
   '<nav class="rk39-ws-tabs" aria-label="أقسام إدارة بنك الهلال">'+
    Object.entries(tabs).map(([id,label])=>'<button type="button" data-rk39-workspace-tab="'+id+'"'+
      (tab===id?' class="active" aria-current="page"':'')+'>'+label+'</button>').join('')+
   '</nav>'+
   '<div class="rk39-ws-content">'+body+'</div>'+
  '</section></div>';
 root.querySelector('.rk39-ws-close')?.focus();
}
hilal=function(){
 const state=hilalState();
 const {budget,salary,pending}=state;
 const posted=!!budget.posted;
 const status=posted?(budget.deficit?'يحتاج معالجة':'مثبت'):salary?'بانتظار التثبيت':'الراتب غير مسجل';
 const brief=posted&&budget.deficit?'يوجد تجاوز في مخصص الشهر':
   !posted&&salary?'يلزم تثبيت مخصص هذا الشهر':
   !posted?'سجّل الراتب قبل اعتماد المخصص':'';
 const primary=salary&&!posted?action('snapshot','تثبيت المخصص','',false,'primary'):
  !salary&&!posted?toPage('cycles','دورة الراتب'):toPage('transactions','تسجيل مصروف');
 return '<section class="rk39-page rk39-focus-page" aria-label="بنك الهلال — مخصصات التشغيل">'+
   '<header class="rk39-header"><div class="rk39-bank-identity"><h2>مخصصات التشغيل</h2>'+
   hint('المخصص الشهري','مخصص التشغيل مقيد داخل النظام ولا يعد رصيدًا مصرفيًا جديدًا. لكل شهر سجل مستقل.')+
   '</div><label class="rk39-period"><span>الشهر</span><select id="rk39Period" aria-label="شهر المتابعة">'+
     periodOptions(selectedPeriod)+'</select></label></header>'+
   '<section class="rk39-focus" aria-label="ملخص دورة الراتب">'+
    '<div class="rk39-focus-head"><span>حالة الدورة</span><b class="'+(posted&&budget.deficit?'rk39-red':posted?'rk39-teal':'rk39-gold')+'">'+status+'</b></div>'+
    '<div class="rk39-focus-balance"><div><small>المتبقي للتخصيص</small>'+
     hint('المتبقي','المتبقي حساب إداري بعد المصروفات والحجوزات، وليس رصيد الحساب البنكي.')+'</div>'+
     '<strong class="rk39-'+(posted?tone(budget.free):'navy')+'">'+
      (posted?financial(budget.free):'بانتظار التثبيت')+'</strong></div>'+
    (brief?'<p class="rk39-focus-note" role="status">'+brief+'</p>':'')+
    '<dl class="rk39-focus-figures">'+value('مخصص الشهر',budget.allocation,'blue')+
     value('مصروفات الشهر',budget.expenses,'red')+
     value('حوالات معلقة',budget.holds,'gold')+'</dl>'+
    '<div class="rk39-focus-actions">'+primary+
      '<button type="button" class="rk39-manage-btn" data-rk39-workspace-open>'+
        semanticIcon('settings')+'<span>إدارة البنك</span></button></div>'+
   '</section>'+
   '<button type="button" class="rk39-focus-footer" data-rk39-workspace-open data-rk39-workspace-section="records">'+
    semanticIcon('list')+'<span>سجلات الدورة وتفاصيلها</span>'+
    '<small>'+(pending.length?pending.length+' حوالة معلقة':'عرض عند الحاجة')+'</small>'+
    semanticIcon('forward')+'</button>'+
 '</section>';
};
function nextPeriod(p){const [y,m]=p.split('-').map(Number),d=new Date(y,m,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
const kinds={'reserve-opening':'إثبات احتياطي افتتاحي موثق',snapshot:'تثبيت مخصص الشهر',rollover:'ترحيل فائض إلى شهر لاحق','reserve-add':'تغذية الاحتياطي المستهدف','reserve-release':'إعادة تخصيص من الاحتياطي','bank-transfer':'طلب تحويل بين البنوك',confirm:'إثبات تنفيذ تحويل خارجي',cancel:'إلغاء طلب تحويل',match:'مطابقة وصول التحويل'};
function field(label,element){return '<div class="rk39-field"><span>'+escaping(label)+'</span>'+element+'</div>'}
function currencyField(defaultValue=''){return field('المبلغ بالريال','<input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" required value="'+escaping(defaultValue)+'">')}
function selectMonth(name,value){return field('الشهر','<select name="'+name+'" required>'+periodOptions(value)+'</select>')}
function modalForm(kind,eventId){
 const root=document.getElementById('modalRoot');if(!root)return;
 let content='',event;
 if(['confirm','cancel','match'].includes(kind)){event=core.read(db).events.find(e=>e.id===eventId);if(!event)return;}
 const info=core.monthly(db,selectedPeriod);
 if(kind==='snapshot'){
  const planned=Math.max(0,Math.round((Number(db.salary)||0)*(Number(db.ratios?.hilal)||0)/100));
  content=field('الشهر','<input name="from" readonly value="'+selectedPeriod+'">')+
   currencyField(humanAmount(planned))+
   '<p class="rk39-dialog-note">أكّد قيمة المخصص من سجل دورة الراتب لهذا الشهر. لا تُستعاد مخصصات الأشهر الماضية من النسب الحالية دون مراجعتك.</p>'+
   field('تأكيد المراجعة','<label class="rk39-accept"><input name="accept" type="checkbox" required> راجعت راتب الشهر وقيمة التخصيص الفعلية، وأوافق على تثبيتها مرة واحدة.</label>');
 }
 if(kind==='rollover')content=field('الشهر المصدر','<input name="from" readonly value="'+selectedPeriod+'">')+
  field('الشهر المستفيد','<input name="to" type="month" min="'+nextPeriod(selectedPeriod)+'" value="'+nextPeriod(selectedPeriod)+'" required>')+
  currencyField()+field('البيان','<input name="note" maxlength="180" placeholder="سبب الترحيل">')+
  '<p class="rk39-dialog-note">يُخصم المبلغ من المتاح في الشهر المصدر ويضاف لسجل الشهر المستفيد دون إنشاء نقد جديد.</p>';
 if(kind==='reserve-add')content=field('شهر المصدر','<input name="from" readonly value="'+selectedPeriod+'">')+currencyField()+
  field('البيان','<input name="note" maxlength="180" value="تعزيز احتياطي بنك الهلال">')+
  '<p class="rk39-dialog-note">سيُحجز المبلغ داخليًا ولن يُعد رصيدًا مصرفيًا مثبتًا.</p>';
 if(kind==='reserve-opening')content=currencyField()+
   field('مرجع مستند الافتتاح أو كشف البنك','<input name="reference" minlength="5" maxlength="100" required placeholder="المرجع البنكي أو المستند">')+
   field('تأكيد','<label class="rk39-accept"><input type="checkbox" name="accept" required> هذا احتياطي موجود مسبقًا وموثّق، ولم يدخل في أي مخصص أو تحويل مسجل في هذا النظام.</label>')+
   '<p class="rk39-dialog-note">هذا رصيد افتتاحي توثيقي. لا تُضاف قيمته إلى رصيد البنك ولا تُنشأ سيولة جديدة؛ تأكد من عدم تكراره.</p>';
 if(kind==='reserve-release')content=field('الشهر المستفيد','<input name="to" readonly value="'+selectedPeriod+'">')+currencyField()+
  field('سبب إعادة التخصيص','<input name="note" maxlength="180" required placeholder="بيان السبب">')+
  '<p class="rk39-dialog-note">سوف تنخفض القيمة المحجوزة في الاحتياطي ويُعاد المبلغ إلى المخصص المتاح للشهر.</p>';
 if(kind==='bank-transfer')content=field('شهر المصدر','<input name="from" readonly value="'+selectedPeriod+'">')+
  field('البنك المستفيد','<select name="targetBank" required><option value="malaa">بنك ملاءة</option><option value="assets">بنك الأصول</option></select>')+
  currencyField()+field('سبب التحويل','<input name="note" maxlength="180" required placeholder="الغرض من التحويل">')+
  '<p class="rk39-dialog-note">هذه الخطوة تحجز المبلغ داخليًا ولا تنفّذ التحويل المصرفي. لإثبات التنفيذ ستحتاج إلى رقم مرجع حقيقي.</p>';
 if(kind==='confirm')content='<p class="rk39-dialog-note">المبلغ: '+financial(event.amount)+' — المستفيد: '+(core.BANKS[event.targetBank]||'بنك آخر')+'</p>'+
  field('مرجع التنفيذ المصرفي','<input name="reference" minlength="5" maxlength="100" required placeholder="رقم العملية البنكية">')+
  field('تأكيد','<label class="rk39-accept"><input type="checkbox" name="accept" required> أؤكد تنفيذ التحويل خارج النظام بمبلغ العملية المذكور.</label>');
 if(kind==='cancel')content='<p class="rk39-dialog-note">سيُلغى طلب تحويل مبلغ '+financial(event.amount)+' ويُحرر الحجز المعلق. لا يمكن إلغاء عملية سبق إثبات تنفيذها.</p>'+
  field('تأكيد الإلغاء','<label class="rk39-accept"><input type="checkbox" name="accept" required> أوافق على إلغاء طلب التحويل غير المنفذ.</label>');
 if(kind==='match')content='<p class="rk39-dialog-note">إثبات تنفيذ: '+escaping(event.reference)+' — '+(core.BANKS[event.targetBank]||'بنك آخر')+'. لا تضيف هذه المطابقة مبلغًا جديدًا إلى رصيد البنك المستفيد.</p>'+
  field('مرجع الوصول لدى البنك المستفيد','<input name="reference" minlength="5" maxlength="100" required placeholder="رقم الحركة في حساب المستفيد">')+
  field('تأكيد','<label class="rk39-accept"><input type="checkbox" name="accept" required> راجعت الوصول مع كشف البنك المستفيد، ولم أسجل الإيداع مرتين.</label>');
 root.innerHTML='<div class="modalbg rk39-overlay" data-rk39-overlay><section class="rk39-dialog" role="dialog" aria-modal="true" aria-labelledby="rk39DialogTitle">'+
  '<header class="rk39-dialog-head"><h2 id="rk39DialogTitle">'+escaping(kinds[kind]||'عملية')+'</h2><button type="button" class="rk39-dialog-close" data-rk39-close aria-label="رجوع">رجوع</button></header>'+
  '<form id="rk39OperationForm" data-rk39-kind="'+kind+'" data-rk39-id="'+escaping(eventId||'')+'"><div class="rk39-dialog-fields">'+content+'<p class="rk39-form-error" role="alert" hidden></p></div>'+
  '<footer class="rk39-dialog-foot"><button type="button" class="rk39-action" data-rk39-close>إلغاء</button><button type="submit" class="rk39-action rk39-primary">'+(kind==='cancel'?'تأكيد الإلغاء':'حفظ العملية')+'</button></footer></form></section></div>';
 root.querySelector('input:not([readonly]),select,button')?.focus({preventScroll:true});
}
function submitForm(form){
 const fields=new FormData(form),kind=form.dataset.rk39Kind,id=form.dataset.rk39Id,p=selectedPeriod;
 const amt=asRiyals(fields.get('amount')),note=String(fields.get('note')||'').trim();
 const before=db.rk39?JSON.stringify(db.rk39):null;
 let result;
 if(['snapshot','reserve-opening','confirm','cancel','match'].includes(kind)&&kind!=='snapshot'&&!fields.has('accept'))throw new Error('يجب تأكيد الإجراء أولاً.');
 if(kind==='snapshot'){
  if(!fields.has('accept'))throw new Error('يجب مراجعة المخصص والموافقة على تثبيته.');
  result=core.snapshotMonth(db,p,amt,'تمت مراجعته يدويًا في دورة الراتب');
 }
 if(kind==='rollover')result=core.rollover(db,p,String(fields.get('to')||''),amt,note);
 if(kind==='reserve-add')result=core.reserveAdd(db,p,amt,note,dynamicSafetyTarget());
 if(kind==='reserve-opening')result=core.reserveOpening(db,amt,fields.get('reference'),'رصيد افتتاحي موثق خارج مخصصات الأشهر',dynamicSafetyTarget());
 if(kind==='reserve-release')result=core.reserveRelease(db,p,amt,note);
 if(kind==='bank-transfer')result=core.requestTransfer(db,p,String(fields.get('targetBank')||''),amt,note);
 if(kind==='confirm')result=core.confirmTransfer(db,id,fields.get('reference'));
 if(kind==='cancel')result=core.cancelTransfer(db,id);
 if(kind==='match')result=core.matchTransfer(db,id,fields.get('reference'));
 if(!result)throw new Error('تعذّر تحديد نوع العملية.');
 try{
  if(typeof save!=='function')throw new Error('الحفظ المحلي غير متاح؛ أوقفت عملية التثبيت.');
  save();
 }catch(error){db.rk39=before?JSON.parse(before):undefined;throw new Error('تعذر حفظ العملية؛ لم يتم تثبيتها. '+(error.message||''));}
 document.getElementById('modalRoot').innerHTML='';
 render();
 const toast=document.getElementById('toastRoot');
 if(toast){toast.textContent='تم حفظ العملية في سجل المخصصات المحلي.';setTimeout(()=>{if(toast.textContent.includes('تم حفظ العملية'))toast.textContent=''},2800);}
}
document.addEventListener('click',event=>{
 const workspaceOpen=event.target.closest('[data-rk39-workspace-open]');
 if(workspaceOpen){
  event.preventDefault();event.stopImmediatePropagation();
  openBankWorkspace(workspaceOpen.dataset.rk39WorkspaceSection||'reserve');return;
 }
 const workspaceTab=event.target.closest('[data-rk39-workspace-tab]');
 if(workspaceTab){
  event.preventDefault();event.stopImmediatePropagation();
  openBankWorkspace(workspaceTab.dataset.rk39WorkspaceTab);return;
 }
 const workspaceClose=event.target.closest('[data-rk39-workspace-close]');
 if(workspaceClose||event.target.matches('[data-rk39-workspace-overlay]')){
  event.preventDefault();event.stopImmediatePropagation();
  document.getElementById('modalRoot').innerHTML='';return;
 }
 const open=event.target.closest('[data-rk39-open]');
 if(open){event.preventDefault();event.stopImmediatePropagation();modalForm(open.dataset.rk39Open,open.dataset.rk39Id||'');return;}
 const goto=event.target.closest('[data-rk39-go]');
 if(goto){event.preventDefault();event.stopImmediatePropagation();document.getElementById('modalRoot').innerHTML='';navigate(goto.dataset.rk39Go);return;}
 const previous=event.target.closest('[data-rk39-month]');
 if(previous){event.preventDefault();selectedPeriod=previous.dataset.rk39Month;document.getElementById('modalRoot').innerHTML='';render();return;}
 const closer=event.target.closest('[data-rk39-close]');
 if(closer){event.preventDefault();event.stopImmediatePropagation();document.getElementById('modalRoot').innerHTML='';return;}
 if(event.target.matches('[data-rk39-overlay]'))document.getElementById('modalRoot').innerHTML='';
},true);
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&document.querySelector('#modalRoot .rk39-workspace')){
  event.preventDefault();event.stopImmediatePropagation();
  document.getElementById('modalRoot').innerHTML='';
 }
},true);
document.addEventListener('change',event=>{
 if(event.target.id==='rk39Period'){selectedPeriod=event.target.value;render();}
});
document.addEventListener('submit',event=>{
 const form=event.target.closest('#rk39OperationForm');if(!form)return;
 event.preventDefault();event.stopImmediatePropagation();
 try{submitForm(form)}catch(error){const e=form.querySelector('.rk39-form-error');if(e){e.hidden=false;e.textContent=error.message||'تعذر حفظ العملية.';}}
},true);
const prevRender=render;
render=function(){const result=prevRender.apply(this,arguments);const root=document.getElementById('view');if(root)root.classList.toggle('rk39-running',page==='hilal');return result;};
render();
})();
