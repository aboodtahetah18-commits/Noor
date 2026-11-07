/* ركائز 44 — الاحتياطيات المتغيرة والقدرة على الاستثمار.
   تحليل تلقائي لكل بنك، تسجيل تعديل سياسة الحماية باعتماد المستخدم فقط.
   لا يحدث أي تحويل، قيد محاسبي، بيع أصل أو استثمار تلقائي.
*/
(function(){
 'use strict';
 const adaptive=window.RakaezAdaptiveCore;
 if(!adaptive||typeof reservesView!=='function'||typeof render!=='function'||typeof db==='undefined')return;
 const fmt=v=>money(Math.round(Number(v)||0));
 const safe=v=>esc(String(v??''));
 const num=v=>Number.isFinite(Number(v))?Number(v):0;
 const infoSvg='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 10.5v5m0-8h.01"/></svg>';
 const magnify='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m5 15 5-5 4 4 5-6"/><path d="M14 8h5v5"/></svg>';
 function bankIcon(id){
  return document.querySelector('#nav [data-rk33-page="'+id+'"] .rk35-bankmark')?.outerHTML||'';
 }
 function hint(text){
  return '<details class="rk44-help"><summary aria-label="عرض شرح الحساب" title="عرض شرح الحساب">'+infoSvg+'</summary><p>'+safe(text)+'</p></details>';
 }
 function tone(value){return value<0?'red':value===0?'navy':'teal';}
 function metric(label,value,color='navy'){
  return '<div class="rk44-metric"><span>'+safe(label)+'</span><strong class="rk44-'+color+'">'+value+'</strong></div>';
 }
 const actions={
  hilal:[['hilal','تغذية أو استخدام الاحتياطي'],['debts','سداد الالتزامات'],['transactions','مراجعة المصروفات']],
  malaa:[['malaa','مراجعة السيولة'],['transfer','تحويل معتمد بين البنوك'],['assets','استثمار الفائض بعد الحماية']],
  assets:[['assets','إدارة الاستثمارات'],['research','دراسة الأسهم والشركات'],['malaa','فحص السيولة المتاحة']]
 };
 function bankCard(id,title,subtitle,mainLabel,main,toneMain,info,metrics,year,snapshot){
  const opts=Array.from({length:6},(_,i)=>{
   const count=i+1;return '<option value="'+count+'" '+(snapshot.policy[id]===count?'selected':'')+'>'+count+' '+(count===1?'شهر':'أشهر')+'</option>';
  }).join('');
  return '<article class="rk44-card rk44-'+id+'">'+
   '<header class="rk44-bank-head"><div class="rk44-bank-id">'+bankIcon(id)+
   '<div><h3>'+safe(title)+'</h3><small>'+safe(subtitle)+'</small></div></div>'+
   '<span class="rk44-status '+(id==='assets'?'rk44-neutral':info.gap>0?'rk44-watch':'rk44-good')+'">'+
   (id==='assets'?'استثمار':info.gap>0?'يحتاج تعزيزًا':id==='hilal'?'حجز داخلي مكتمل':'سيولة مسجلة كافية')+'</span></header>'+
   '<div class="rk44-hero"><span>'+safe(mainLabel)+'</span><strong class="rk44-'+toneMain+'">'+main+'</strong>'+
   (year?'<small>'+safe(year)+'</small>':'')+'</div>'+
   '<div class="rk44-metrics">'+metrics.join('')+'</div>'+
   (id!=='assets'?'<div class="rk44-progressrow"><span>تغطية الاحتياطي</span>'+
   '<strong class="rk44-'+(info.gap>0?'red':'teal')+'">'+Math.min(100,Math.max(0,(info.coverage||0)*100)).toFixed(0)+'%</strong></div>'+
   '<div class="rk44-progress" role="progressbar" aria-label="نسبة تغطية الاحتياطي" aria-valuenow="'+Math.min(100,Math.max(0,(info.coverage||0)*100)).toFixed(1)+'" aria-valuemin="0" aria-valuemax="100"><span style="width:'+Math.min(100,Math.max(0,(info.coverage||0)*100)).toFixed(1)+'%"></span></div>':'')+
   '<div class="rk44-policy"><label>مدة الحماية <select data-rk44-policy="'+id+'" aria-label="مدة حماية '+safe(title)+'">'+opts+'</select></label>'+
   hint(id==='hilal'?
   'الهدف = الاحتياج الشهري × مدة الحماية + 40% من هامش المديونية (الهامش يساوي 5% من الدين المتبقي). الفجوة = الهدف ناقص المحجوز داخليًا، وبحد أدنى صفر. زيادة المدة ترفع الهدف، ولا تنشئ رصيدًا مصرفيًا جديدًا.':
   id==='malaa'?
   'الهدف = الاحتياج الشهري × مدة الحماية + هامش المديونية بالكامل (5% من الدين المتبقي). التغطية تُقاس بالنقد الأقل بين الادخار السائل خلال 3 أيام ودفتر ملاءة بعد الحجوزات؛ الفجوة = الهدف ناقص النقد المتاح، وبحد أدنى صفر. الأرقام محلية وليست مطابقة كشف بنك تلقائية.':
   'هامش أمان الاستثمار = الاحتياج الشهري × مدة الحماية + نصف هامش المديونية (5% من الدين المتبقي). زيادة المدة تقلل الفائض المقترح للاستثمار. لا تُحسب الأسهم والمحافظ كنقد فوري، ولا يتم الاستثمار أو البيع دون موافقتك.')+'</div>'+
   '<footer class="rk44-actions">'+actions[id].map(([route,label],i)=>'<button type="button" class="'+(i===0?'rk44-primary':'')+'" '+(route==='transfer'?'data-rk44-open-transfer':'data-rk44-page="'+route+'"')+'>'+safe(label)+'</button>').join('')+'</footer></article>';
 }



 function rkStartMonth(){
  const n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0');
 }

 function rkCertifiedSummary(){
  const state=adaptive.onboardingState(db,rkStartMonth());
  const wizard=adaptive.wizardState(db);
  const insufficient=!wizard.completed||wizard.record.expensesProvided===false;
  const heading=insufficient?'المعلومات غير مكتملة':state.verified?(state.phase==='scheduled'?'بداية الدورة الكاملة مجدولة':'الحسابات مبنية على البيانات المؤكدة'):'المعلومات غير مكتملة';
  const note=insufficient?
   'أكمل نافذة التأسيس مع إدخال بنود المصروفات لتظهر التوقعات، أو واصل تسجيل عملياتك حتى تتوفر بيانات كافية.':!state.verified?
   'لا يعرض النظام راتبًا أو فائضًا أو أهدافًا من الأرقام التجريبية. أدخل البيانات الفعلية وراجعها من صفحة الانطلاقة.':
   state.phase==='scheduled'?'تبدأ الدورة الكاملة في '+safe(state.startMonth)+'. الشهر الجاري للتسجيل الجزئي فقط.':
   'البيانات الأساسية مؤكدة. الملخص التالي تخطيطي ولا يغير الأرصدة البنكية.';
  let content='';
  if(!insufficient&&state.phase==='active'){
   const p=adaptive.verifiedStarterPlan(db,rkStartMonth());
   if(p.ready)content='<div class="rk44-starter-lines">'+
    '<div class="rk44-starter-line"><strong>الراتب المعتمد للحساب</strong><b>'+fmt(p.income)+'</b></div>'+
    '<div class="rk44-starter-line"><strong>الضروريات والأقساط والرسوم</strong><b>'+fmt(p.costs)+'</b></div>'+
    '<div class="rk44-starter-line"><strong>'+(p.rawSurplus<0?'العجز الحسابي':'الفائض الحسابي')+'</strong><b>'+fmt(Math.abs(p.rawSurplus))+'</b></div>'+
    '</div>';
  }
  return '<section class="rk44-starter rk44-certified-summary">'+
   '<header class="rk44-sectionhead"><h3>'+heading+'</h3>'+
   hint('تم تعليق لوحات الاستنتاجات القديمة لأنها تعتمد على بيانات لم تُراجع. لا يساوي الدخل المخطط إيداعًا مصرفيًا ولا تمثل أرقام الأمثلة أهدافًا معتمدة.')+'</header>'+
   '<p class="rk44-subnote">'+note+'</p>'+content+
   '<button type="button" class="rk44-transfer-primary" data-rk44-page="reserves">الانتقال إلى إعداد الانطلاقة المالية</button>'+
   '</section>';
 }


 function flexibleToolsPanel(){
  const source=adaptive.userDetails(db),summary=adaptive.userDetailsSummary(db);
  const frequencyOptions=[['daily','يومي'],['weekly','أسبوعي'],['monthly','شهري'],
   ['yearly','سنوي'],['asNeeded','عند الحاجة دون موعد'],['none','لا توجد نفقة']];
  const select=(name,opts,chosen)=>{
   return '<select name="'+name+'">'+opts.map(([v,label])=>
    '<option value="'+safe(v)+'" '+(String(chosen)===String(v)?'selected':'')+'>'+safe(label)+'</option>').join('')+'</select>';
  };
  const categories=[['auto','اقتراح النظام'],...adaptive.categoryLabels.map(x=>[x,x])];
  const categoryItems=source.items.map(x=>{
   const suggested=adaptive.categorySuggestion(x.name);
   const monthly=adaptive.monthlyEquivalent(x.amount,x.frequency);
   return '<details class="rk44-flex-record"><summary>'+safe(x.name)+
    ' · '+safe(x.category)+' · '+(monthly===null?'غير منتظم':fmt(monthly)+'/شهر')+'</summary>'+
    '<form data-rk44-edit-item data-id="'+safe(x.id)+'"><div class="rk44-starter-inputs">'+
    '<label>اسم البند<input name="name" required maxlength="100" value="'+safe(x.name)+'"></label>'+
    '<label>المبلغ بالريال<input type="number" name="amount" min="0" step="0.01" required value="'+(x.amount/100).toFixed(2)+'"></label>'+
    '<label>المتبقي من المخصص (اختياري)<input type="number" name="remaining" step="0.01" placeholder="غير مدخل" value="'+(x.remaining===null||x.remaining===undefined?'':(x.remaining/100).toFixed(2))+'"></label>'+
    '<label>الدورية'+select('frequency',frequencyOptions,x.frequency)+'</label>'+
    '<label>التصنيف'+select('category',categories,x.category)+'</label></div>'+
    '<small>'+(x.remaining===null||x.remaining===undefined?'المتبقي غير مسجل':'المتبقي المعلن: '+fmt(x.remaining))+' · المصدر: '+(x.categorySource==='manual'?'تصنيف معدل يدويًا':'اقتراح النظام')+
    ' · التخمين الحالي: '+safe(suggested.category||'غير محدد')+'</small>'+
    '<div class="rk44-flex-actions"><button type="submit">حفظ تعديل البند</button>'+
    '<button type="button" data-rk44-detail-remove="item" data-id="'+safe(x.id)+'">حذف البند</button></div></form></details>';
  }).join('');
  const dependents=source.dependents.map(d=>{
   const monthly=adaptive.monthlyEquivalent(d.amount,d.frequency);
   return '<details class="rk44-flex-record"><summary>'+safe(d.name)+
    ' · '+safe(d.relation)+' · '+(d.includedInItems?'ضمن بند موجود':monthly===null?'غير منتظم':fmt(monthly)+'/شهر')+
    '</summary><form data-rk44-edit-dependent data-id="'+safe(d.id)+'"><div class="rk44-starter-inputs">'+
    '<label>الاسم أو الصفة<input name="name" maxlength="100" required value="'+safe(d.name)+'"></label>'+
    '<label>صلة القرابة<input name="relation" maxlength="60" value="'+safe(d.relation)+'"></label>'+
    '<label>المبلغ بالريال<input type="number" name="amount" min="0" step="0.01" required value="'+(d.amount/100).toFixed(2)+'"></label>'+
    '<label>الدورية'+select('frequency',frequencyOptions,d.frequency)+'</label></div>'+
    '<label class="rk44-approval"><input type="checkbox" name="included" '+(d.includedInItems?'checked':'')+
    '> النفقة موجودة أصلًا ضمن بند آخر، فلا تُجمع مرة ثانية</label>'+
    '<div class="rk44-flex-actions"><button type="submit">حفظ تعديل المعال</button>'+
    '<button type="button" data-rk44-detail-remove="dependent" data-id="'+safe(d.id)+'">حذف المعال</button></div></form></details>';
  }).join('');
  const flexibleDebts=(Array.isArray(db.debts)?db.debts:[]).filter(d=>d.repaymentMode==='capacity');
  return '<section class="rk44-starter rk44-flexible" aria-label="البنود المرنة والإعالة والالتزامات">'+
   '<header class="rk44-sectionhead"><h3>تفصيل البنود والإعالة والالتزامات المرنة</h3>'+
   hint('يصنف ركائز اسم البند بشكل مبدئي فقط ويمكنك تعديله. يُحسب الدعم اليومي والسنوي وفق دوريّته، ولا يُفرض على المعال مبلغ ثابت. الديون بلا تاريخ استحقاق لا تنشئ أقساطًا، ولا تُسدد تلقائيًا.')+'</header>'+
   '<details class="rk44-starter-settings"><summary>1. بنودك الخاصة — تصنيف مقترح قابل للتعديل ('+source.items.length+')</summary>'+
   '<div class="rk44-flex-list">'+categoryItems+'</div>'+
   '<form data-rk44-add-item><div class="rk44-starter-inputs">'+
   '<label>اسم البند<input name="name" data-rk44-suggest-name required maxlength="100" placeholder="اكتب اسم البند بالتفصيل"></label>'+
   '<label>المخصص بالريال<input type="number" name="amount" min="0" step="0.01" required placeholder="المبلغ"></label>'+
   '<label>المتبقي من المخصص (اختياري)<input name="remaining" type="number" step="0.01" placeholder="غير مدخل حتى تبدأ المتابعة"></label>'+
   '<label>دورية الصرف'+select('frequency',frequencyOptions,'monthly')+'</label>'+
   '<label>تصنيفه'+select('category',categories,'auto')+'</label></div>'+
   '<small data-rk44-suggest-output>اكتب اسم البند ليظهر التصنيف المقترح</small>'+
   '<button class="rk44-transfer-primary" type="submit">إضافة البند</button></form></details>'+
   '<details class="rk44-starter-settings"><summary>2. الأشخاص الذين تعيلهم ('+source.dependents.length+')</summary>'+
   '<div class="rk44-flex-list">'+dependents+'</div>'+
   '<form data-rk44-add-dependent><div class="rk44-starter-inputs">'+
   '<label>الاسم أو الصفة<input name="name" required maxlength="100" placeholder="مثلاً: أحد الوالدين"></label>'+
   '<label>صلة القرابة<input name="relation" maxlength="60" placeholder="والد، والدة، ابن، آخر"></label>'+
   '<label>المبلغ عند وجود نفقة<input type="number" name="amount" min="0" step="0.01" required placeholder="0 إذا لا توجد"></label>'+
   '<label>دورية النفقة'+select('frequency',frequencyOptions,'none')+'</label></div>'+
   '<label class="rk44-approval"><input type="checkbox" name="included"> سجلت هذه النفقة ضمن بند سابق، فلا تُضاف مرة أخرى</label>'+
   '<button class="rk44-transfer-primary" type="submit">إضافة المعال</button></form></details>'+
   '<div class="rk44-flex-summary"><span>المصروفات الأساسية المعروفة من البنود والمعالين</span>'+
   '<strong>'+fmt(summary.monthlyBudget)+'</strong><small>'+ 'الأقساط والأهداف المستبعدة من الأساسيات: '+fmt(summary.excludedFromEssentials)+' · '+
   (summary.incomplete?'مصروفات غير منتظمة تحتاج مراجعة: '+summary.incomplete+' · ':'')+
   (summary.reconciledIntoBudget?'يحل التفصيل محل مصروفات الأساس القديمة دون إضافتها مرة أخرى':
    'تفاصيل للمراجعة، لا تُضاف فوق إجمالي المصروفات حتى تعتمد استبداله')+
   '</small></div>'+
   '<form data-rk44-detail-mode><label class="rk44-approval">'+
   '<input type="checkbox" name="useAsEssentials" '+(source.useAsEssentials?'checked':'')+
   '> أعتمد استخدام البنود المعروفة والإنفاق غير المكرر للمعالين بدل إجمالي المصروفات الضرورية القديم. الأقساط والأهداف تُستثنى من الجمع.</label>'+
   '<button class="rk44-transfer-primary" type="submit">حفظ اختيار مصدر الميزانية</button></form>'+
   '<details class="rk44-starter-settings"><summary>3. التزامات بلا موعد سداد ثابت ('+flexibleDebts.length+')</summary>'+
   (flexibleDebts.length?'<div class="rk44-flex-list">'+flexibleDebts.map(d=>
    '<div class="rk44-starter-line"><div><strong>'+safe(d.name)+'</strong><small>سداد حسب القدرة، دون قسط إلزامي · يظهر أيضًا في صفحة الالتزامات</small></div>'+
    '<b>'+fmt(Math.max(0,Number(d.principal||0)-Number(d.paid||0)))+'</b></div>').join('')+'</div>':'')+
   '<form data-rk44-flex-debt><div class="rk44-starter-inputs">'+
   '<label>اسم الدين أو الجهة<input name="name" required maxlength="100" placeholder="اسم الالتزام"></label>'+
   '<label>المتبقي من الدين (ريال)<input type="number" name="amount" min="0.01" step="0.01" required></label></div>'+
   '<label class="rk44-approval"><input name="approval" type="checkbox" required> أؤكد أنه التزام فعلي غير مسجل من قبل، وليس له قسط أو موعد سداد إلزامي.</label>'+
   '<button type="submit" class="rk44-transfer-primary">إضافة إلى سجل الالتزامات في الهلال</button></form>'+
   '<form data-rk44-flex-preview><h4>محاكاة التحسن في الدخل دون اقتطاع تلقائي</h4>'+
   '<div class="rk44-starter-inputs">'+
   '<label>الدخل السابق (ريال)<input type="number" name="before" step="0.01" min="0" required placeholder="قبل التحسن"></label>'+
   '<label>الدخل الجديد (ريال)<input type="number" name="after" step="0.01" min="0" required placeholder="بعد التحسن"></label>'+
   '<label>مخصص الحماية الإضافي غير المحسوب في المصروفات (ريال)<input type="number" name="protected" step="0.01" min="0" required placeholder="0 إن لم يوجد"></label></div>'+
   '<button type="submit" class="rk44-transfer-primary">اختبار قدرة السداد</button>'+
   '<div data-rk44-flex-result aria-live="polite"></div></form></details>'+
   '<p class="rk44-subnote">الدفعات المقترحة ليست استحقاقات ولا تُرحَّل ماليًا. زيادة الراتب وحدها لا تكفي؛ يجب أن يكون هناك فائض فعلي بعد ضروريات الحياة والأقساط والحماية.</p>'+
   '</section>';
 }


 // معالج تأسيس واحد في نافذة منبثقة؛ لا تظهر الاستمارة داخل صفحة المركز المالي.
 let wizardStep=0;
 let wizardShown=false;
 const emptyDraft=()=>({
  profile:{marital:'undisclosed',children:'0',supported:'0',
   salary:'',otherIncome:'',externalBank:'',salaryDay:'27'},
  items:[],dependents:[],obligations:[],goals:[]
 });
 let wizardDraft=db.rk44WizardDraft&&typeof db.rk44WizardDraft==='object'?
  JSON.parse(JSON.stringify(db.rk44WizardDraft)):emptyDraft();
 const wizardTitles=['مرحبًا بك في ركائز','وضعك الأسري','الدخل ودورة الراتب',
  'البنود الشهرية','المعالون','الالتزامات','الأهداف المالية','مراجعة واعتماد'];
 const wizardFrequencies=[['monthly','شهري'],['daily','يومي'],['weekly','أسبوعي'],
  ['yearly','سنوي'],['asNeeded','عند الحاجة'],['none','دون نفقة']];
 function wizardCurrency(raw,required=false){
  const text=String(raw??'').trim();
  if(!text){
   if(required)throw new Error('أدخل المبلغ المطلوب أو اكتب صفرًا صراحة.');
   return null;
  }
  if(!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(text))throw new Error('أدخل مبلغًا صحيحًا بالريال بحد أقصى منزلتين عشريتين.');
  const n=Math.round(Number(text)*100);
  if(!Number.isSafeInteger(n)||n>100000000000)throw new Error('المبلغ أكبر من المسموح.');
  return n;
 }
 function wizardSelect(group,index,key,options,value){
  return '<select data-w-group="'+group+'" data-w-index="'+index+'" data-w-key="'+key+'">'+
   options.map(([id,label])=>'<option value="'+safe(id)+'" '+(value===id?'selected':'')+'>'+safe(label)+'</option>').join('')+
   '</select>';
 }
 function wizardInput(group,index,key,label,value,type='text',extra=''){
  return '<label>'+safe(label)+'<input data-w-group="'+group+'" data-w-index="'+index+
   '" data-w-key="'+key+'" type="'+type+'" '+extra+' value="'+safe(value??'')+'"></label>';
 }
 function wizardSelectField(group,index,key,label,choices,value){
  return '<label>'+safe(label)+wizardSelect(group,index,key,choices,value)+'</label>';
 }
 function wizardItems(){
  const categories=[['auto','اقتراح النظام'],...adaptive.categoryLabels.map(x=>[x,x])];
  return '<p class="rk44-wizard-note">أضف البنود بأسمائها ومبالغها المتوقعة. يرشح ركائز التصنيف ويمكنك تغييره. المتبقي اختياري في البداية.</p>'+
   wizardDraft.items.map((item,i)=>{
    const suggestion=adaptive.categorySuggestion(item.name);
    return '<div class="rk44-wizard-line"><div class="rk44-wizard-linehead"><strong>البند '+(i+1)+'</strong>'+
     '<button type="button" data-w-remove="items" data-w-index="'+i+'">حذف</button></div>'+
     '<div class="rk44-wizard-grid">'+
     wizardInput('items',i,'name','اسم البند',item.name,'text','maxlength="100" placeholder="اسم تفصيلي"')+
     wizardInput('items',i,'amount','المخصص المتوقع (ريال)',item.amount,'number','min="0" step="0.01"')+
     wizardInput('items',i,'remaining','المتبقي (اختياري)',item.remaining,'number','step="0.01"')+
     wizardSelectField('items',i,'frequency','دورية المصروف',wizardFrequencies,item.frequency)+
     wizardSelectField('items',i,'category','التصنيف',categories,item.category)+
     '</div><small data-w-suggestion="'+i+'">اقتراح النظام: '+safe(suggestion.category||'يحتاج تحديدًا منك')+'</small></div>';
   }).join('')+
   '<button type="button" data-w-add="items" class="rk44-wizard-add">إضافة بند آخر</button>';
 }
 function wizardDependents(){
  return '<p class="rk44-wizard-note">يمكن أن تكون النفقة يومية أو سنوية أو عند الحاجة أو بلا نفقة. لا نفترض تكلفة ثابتة لأي فرد.</p>'+
   wizardDraft.dependents.map((d,i)=>
    '<div class="rk44-wizard-line"><div class="rk44-wizard-linehead"><strong>معال '+(i+1)+'</strong>'+
    '<button type="button" data-w-remove="dependents" data-w-index="'+i+'">حذف</button></div>'+
    '<div class="rk44-wizard-grid">'+
    wizardInput('dependents',i,'name','الاسم أو الصفة',d.name,'text','maxlength="100"')+
    wizardInput('dependents',i,'relation','صلة القرابة',d.relation,'text','maxlength="60"')+
    wizardSelectField('dependents',i,'frequency','دورية النفقة',wizardFrequencies,d.frequency)+
    wizardInput('dependents',i,'amount','قيمة النفقة عند وجودها (ريال)',d.amount,'number','min="0" step="0.01"')+
    '</div><label class="rk44-wizard-check"><input type="checkbox" data-w-group="dependents" data-w-index="'+i+
    '" data-w-key="includedInItems" '+(d.includedInItems?'checked':'')+'> هذه النفقة محسوبة بالفعل ضمن أحد البنود</label></div>').join('')+
   '<button type="button" class="rk44-wizard-add" data-w-add="dependents">إضافة معال</button>';
 }
 function wizardDebts(){
  return '<p class="rk44-wizard-note">الالتزام ذو موعد يستلزم قسطًا وتاريخ استحقاق. أما الالتزام المرن فيُراجع للسداد عند توافر فائض آمن، ولا يُفرض عليه قسط.</p>'+
   wizardDraft.obligations.map((debt,i)=>
    '<div class="rk44-wizard-line"><div class="rk44-wizard-linehead"><strong>التزام '+(i+1)+'</strong>'+
    '<button type="button" data-w-remove="obligations" data-w-index="'+i+'">حذف</button></div>'+
    '<div class="rk44-wizard-grid">'+
    wizardInput('obligations',i,'name','اسم الالتزام أو الجهة',debt.name,'text','maxlength="100"')+
    wizardInput('obligations',i,'remaining','المبلغ المتبقي (ريال)',debt.remaining,'number','min="0" step="0.01"')+
    wizardSelectField('obligations',i,'mode','طريقة السداد',
      [['scheduled','قسط بموعد'],['capacity','حسب القدرة دون استحقاق']],debt.mode)+
    (debt.mode==='scheduled'?wizardInput('obligations',i,'installment','القسط الشهري (ريال)',debt.installment,'number','min="0.01" step="0.01"')+
      wizardInput('obligations',i,'due','الاستحقاق القادم',debt.due,'date'):'')+
    '</div></div>').join('')+
   '<button type="button" class="rk44-wizard-add" data-w-add="obligations">إضافة التزام</button>';
 }
 function wizardGoals(){
  return '<p class="rk44-wizard-note">أهداف السفر والسكن والزواج وتعليم الأبناء وغيرها اختيارية، ولا تعني ضرورة الاستدانة أو الاستثمار فورًا.</p>'+
   wizardDraft.goals.map((goal,i)=>
    '<div class="rk44-wizard-line"><div class="rk44-wizard-linehead"><strong>هدف '+(i+1)+'</strong>'+
    '<button type="button" data-w-remove="goals" data-w-index="'+i+'">حذف</button></div>'+
    '<div class="rk44-wizard-grid">'+
    wizardInput('goals',i,'name','اسم الهدف',goal.name,'text','maxlength="100"')+
    wizardInput('goals',i,'target','التكلفة المستهدفة (ريال)',goal.target,'number','min="0.01" step="0.01"')+
    wizardInput('goals',i,'date','الموعد المرغوب (اختياري)',goal.date,'date')+
    '</div></div>').join('')+
   '<button type="button" class="rk44-wizard-add" data-w-add="goals">إضافة هدف آخر</button>';
 }
 function wizardReview(){
  const p=wizardDraft.profile;
  const assigned=wizardDraft.items.reduce((s,i)=>s+(wizardCurrency(i.amount)||0),0);
  const known=wizardDraft.dependents.reduce((s,d)=>s+
   (d.includedInItems?0:(adaptive.monthlyEquivalent(wizardCurrency(d.amount)||0,d.frequency)||0)),0);
  const monthly=wizardDraft.items.reduce((s,i)=>s+
   (['التزامات','أهداف مستقبلية'].includes(i.category==='auto'?adaptive.categorySuggestion(i.name).category:i.category)?
    0:(adaptive.monthlyEquivalent(wizardCurrency(i.amount)||0,i.frequency)||0)),0)+known;
  const installments=wizardDraft.obligations.reduce((s,d)=>s+(d.mode==='scheduled'?(wizardCurrency(d.installment)||0):0),0);
  const salary=wizardCurrency(p.salary,true),income=salary+(wizardCurrency(p.otherIncome)||0);
  const leftover=income-monthly-installments;
  const reviewRow=(label,value)=>'<div class="rk44-wizard-reviewline"><span>'+safe(label)+'</span><strong>'+value+'</strong></div>';
  return '<p class="rk44-wizard-note">راجع المعلومات قبل التأسيس. هذه توقعات من بياناتك وليست مبالغ وصلت للبنك الخارجي، ولا يتم توزيع نقد أو إنشاء استثمار.</p>'+ (wizardDraft.items.length===0?' <p class="rk44-wizard-error">لم تدخل بنود مصروفات؛ سيبقى التوقع المالي غير مكتمل حتى تسجلها.</p>':'')+
   reviewRow('صافي الدخل المتوقع',fmt(income))+
   reviewRow('مخصصات البنود المدخلة',fmt(assigned))+
   reviewRow('المكافئ الشهري المعروف للمعيشة والإعالة',fmt(monthly))+
   reviewRow('الأقساط الشهرية الجديدة',fmt(installments))+
   reviewRow(leftover<0?'العجز التخطيطي':'الفائض التخطيطي',fmt(Math.abs(leftover)))+
   reviewRow('البنود / المعالون',safe(wizardDraft.items.length+' / '+wizardDraft.dependents.length))+
   reviewRow('الالتزامات / الأهداف',safe(wizardDraft.obligations.length+' / '+wizardDraft.goals.length))+
   '<p class="rk44-wizard-note">لا تُستنتج دقة 100% من هذه الأرقام. المرحلة الأولى للتوقع، وبعد كل دورة راتب تُراجع المصروفات الفعلية، وبعد دورتين مكتملتين تبدأ توصيات مبنية على السجلات.</p>'+
   '<label class="rk44-wizard-check"><input type="checkbox" id="rk44-wizard-approved"> أؤكد مراجعة بياناتي وأوافق على اعتمادها كتقديرات أولية قابلة للتعديل، دون إنشاء نقد أو تحويلات.</label>';
 }
 function wizardContent(){
  const p=wizardDraft.profile;
  if(wizardStep===0)return '<div class="rk44-wizard-welcome"><h3>مرحبًا بك في ركائز</h3>'+
   '<p>لننظم ميزانيتك الشهرية، والتزاماتك، وطوارئك، وأهدافك المستقبلية، نحتاج بعض المعلومات الأولية.</p>'+
   '<p>الراتب يصل إلى بنكك الحقيقي الخارجي. أما الهلال وملاءة والأصول فهي بنوك افتراضية داخل ركائز لتنظيم أموالك دون مضاعفتها.</p>'+
   '<p>تملأ هذه الخطوات مرة واحدة. يبدأ النظام بالتوقعات، ثم يحسنها مع مراجعة دورات الراتب. ويمكنك تعديل بياناتك لاحقًا.</p></div>';
  if(wizardStep===1)return '<p class="rk44-wizard-note">البيانات الأسرية تساعد في فهم الالتزامات، لكنها لا تفرض مصروفًا على الزواج أو الأبناء.</p>'+
   '<div class="rk44-wizard-grid">'+
   wizardSelectField('profile',0,'marital','الحالة الاجتماعية',
    [['undisclosed','أفضل عدم التحديد'],['single','غير متزوج'],['married','متزوج'],['other','حالة أخرى']],p.marital)+
   wizardInput('profile',0,'children','عدد الأبناء',p.children,'number','min="0" max="100" step="1"')+
   wizardInput('profile',0,'supported','عدد الأشخاص الآخرين الذين تعيلهم',p.supported,'number','min="0" max="100" step="1"')+
   '</div>';
  if(wizardStep===2)return '<p class="rk44-wizard-note">الدخل يكون في حسابك البنكي الخارجي؛ لا نعتبره نقدًا لدى أي بنك افتراضي قبل تسجيل تخصيص صريح.</p>'+
   '<div class="rk44-wizard-grid">'+
   wizardInput('profile',0,'salary','صافي الراتب الشهري (ريال)',p.salary,'number','min="0" step="0.01" placeholder="مطلوب"')+
   wizardInput('profile',0,'otherIncome','دخل منتظم إضافي (اختياري)',p.otherIncome,'number','min="0" step="0.01"')+
   wizardInput('profile',0,'externalBank','اسم البنك الخارجي الحقيقي (اختياري)',p.externalBank,'text','maxlength="100"')+
   wizardInput('profile',0,'salaryDay','يوم استلام الراتب',p.salaryDay,'number','min="1" max="31" step="1"')+
   '</div>';
  if(wizardStep===3)return wizardItems();
  if(wizardStep===4)return wizardDependents();
  if(wizardStep===5)return wizardDebts();
  if(wizardStep===6)return wizardGoals();
  return wizardReview();
 }
 function wizardPersistDraft(){
  db.rk44WizardDraft=JSON.parse(JSON.stringify(wizardDraft));
  save();
 }
 function wizardShow(){
  const root=document.getElementById('modalRoot');
  if(!root)return;
  const back=wizardStep>0?'<button type="button" data-w-prev aria-label="السابق">→</button>':'<span></span>';
  root.innerHTML='<div class="modalbg rk44-wizard-overlay" role="presentation">'+
   '<section class="modal rk44-wizard" role="dialog" aria-modal="true" aria-labelledby="rk44-wizard-title" dir="rtl">'+
   '<header class="rk44-wizard-head">'+back+'<h2 id="rk44-wizard-title">'+safe(wizardTitles[wizardStep])+'</h2>'+
   '<button type="button" data-w-close aria-label="الإغلاق">×</button></header>'+
   '<div class="rk44-wizard-body"><div class="rk44-wizard-step">الخطوة '+(wizardStep+1)+' من '+wizardTitles.length+
   '</div>'+wizardContent()+'<p id="rk44-wizard-error" class="rk44-wizard-error" role="alert"></p></div>'+
   '<footer class="rk44-wizard-footer"><button type="button" data-w-close>لاحقًا</button>'+
   '<button type="button" data-w-next>'+ (wizardStep===0?'ابدأ التأسيس':wizardStep===7?'اعتماد البيانات':'التالي')+
   '</button></footer></section></div>';
  const focus=root.querySelector('.rk44-wizard-head [data-w-close]');
  if(focus)focus.focus({preventScroll:true});
 }
 function wizardOpen(){
  wizardStep=0;
  wizardShow();
 }
 function wizardMaybeOpen(){
  if(wizardShown||adaptive.wizardState(db).completed)return;
  if(document.getElementById('modalRoot')?.innerHTML)return;
  wizardShown=true;
  wizardOpen();
 }
 function wizardMessage(message){
  const el=document.getElementById('rk44-wizard-error');
  if(el)el.textContent=String(message||'');
 }
 function wizardValidate(stage){
  const p=wizardDraft.profile;
  if(stage===2){
   wizardCurrency(p.salary,true);
   if(String(p.otherIncome||'').trim())wizardCurrency(p.otherIncome);
   const day=Number(p.salaryDay);
   if(!Number.isInteger(day)||day<1||day>31)throw Error('حدد يوم استلام الراتب بين 1 و31.');
  }
  if(stage===1){
   if(![p.children,p.supported].every(v=>Number.isInteger(Number(v))&&Number(v)>=0&&Number(v)<=100))
    throw Error('أدخل أعدادًا صحيحة لأفراد الأسرة.');
  }
  if(stage===3){
   for(const item of wizardDraft.items){
    if(!String(item.name||'').trim())throw Error('اكتب اسم كل بند أو احذفه.');
    wizardCurrency(item.amount,true);
    if(String(item.remaining||'').trim()&&!/^-?(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(item.remaining))
     throw Error('المتبقي يجب أن يكون مبلغًا صالحًا أو يترك فارغًا.');
    if(item.category==='auto'&&!adaptive.categorySuggestion(item.name).category)
     throw Error('اسم أحد البنود غير واضح؛ حدد تصنيفه بنفسك.');
   }
  }
  if(stage===4){
   for(const dep of wizardDraft.dependents){
    if(!String(dep.name||'').trim())throw Error('اكتب اسم المعال أو احذفه.');
    if(dep.frequency!=='none'&&dep.frequency!=='asNeeded')wizardCurrency(dep.amount,true);
    else if(dep.amount!=='')wizardCurrency(dep.amount);
   }
  }
  if(stage===5){
   for(const d of wizardDraft.obligations){
    if(!String(d.name||'').trim())throw Error('حدد اسم الدين أو احذفه.');
    const remaining=wizardCurrency(d.remaining,true);
    if(remaining<=0)throw Error('يجب أن يكون الدين المتبقي أكبر من صفر.');
    if(d.mode==='scheduled'){
     if(!d.due||!d.installment)throw Error('أكمل موعد وقيمة القسط أو اختر السداد المرن.');
     wizardCurrency(d.installment,true);
    }
   }
  }
  if(stage===6){
   for(const g of wizardDraft.goals){
    if(!String(g.name||'').trim())throw Error('اكتب اسم الهدف أو احذفه.');
    if(!(wizardCurrency(g.target,true)>0))throw Error('حدد قيمة موجبة للهدف.');
   }
  }
 }
 function wizardPayload(){
  for(let i=1;i<=6;i++)wizardValidate(i);
  const p=wizardDraft.profile;
  const items=wizardDraft.items.map(item=>{
   const suggestion=adaptive.categorySuggestion(item.name);
   return {id:item.id,name:item.name,amount:wizardCurrency(item.amount,true),
    remaining:item.remaining===''?null:Math.round(Number(item.remaining)*100),
    frequency:item.frequency,category:item.category==='auto'?suggestion.category:item.category,
    categorySource:item.category==='auto'?'suggestion':'manual'};
  });
  const deps=wizardDraft.dependents.map(d=>({id:d.id,name:d.name,relation:d.relation,
   amount:wizardCurrency(d.amount)||0,frequency:d.frequency,includedInItems:d.includedInItems===true}));
  return {salary:wizardCurrency(p.salary,true),
   otherIncome:wizardCurrency(p.otherIncome),externalBank:p.externalBank,salaryDay:Number(p.salaryDay),
   family:{marital:p.marital,children:Number(p.children),supported:Number(p.supported)},
   details:{items,dependents:deps},
   obligations:wizardDraft.obligations.map(x=>({name:x.name,remaining:wizardCurrency(x.remaining,true),
    mode:x.mode,installment:x.mode==='scheduled'?wizardCurrency(x.installment,true):0,due:x.due})),
   goals:wizardDraft.goals.map(x=>({name:x.name,target:wizardCurrency(x.target,true),date:x.date}))};
 }

 function rkVerifiedSetup(state){
  const details=state.verified?state.values:null;
  const first=state.startMonth||adaptive.offset(rkStartMonth(),1);
  const input=(id,label,amount)=>{
   const value=amount===undefined?' placeholder="المبلغ أو 0"':' value="'+(amount/100).toFixed(2)+'"';
   return '<label>'+safe(label)+'<input type="number" name="'+id+'" min="0" step="0.01" inputmode="decimal" required'+value+'></label>';
  };
  const fields=[['income','الراتب الفعلي الشهري'],['essentials','إجمالي الضروريات عند عدم استخدام تفصيل البنود'],
   ['obligations','الأقساط غير المكررة ضمن المصروفات'],['recurring','الرسوم الشهرية غير المكررة']];
  const banks=[['hilal','الهلال'],['malaa','ملاءة'],['assets','الأصول']];
  return '<section class="rk44-starter rk44-onboarding">'+
   '<header class="rk44-sectionhead"><h3>تأسيس البنوك من بياناتك</h3>'+
   hint('لا يُعتمد أي راتب أو فائض أو هدف من الأمثلة. يجب مراجعة البيانات الفعلية وإثباتها أولًا؛ الأشهر الجزئية لا يلزم استكمالها.')+'</header>'+
   '<div class="rk44-start-state"><strong>'+(state.verified?'المدخلات مؤكدة — '+(state.phase==='scheduled'?'في انتظار الدورة الكاملة':'الدورة الكاملة فعالة'):'التحليل معلق: البيانات غير مؤكدة')+
   '</strong><small>موعد بداية أول شهر كامل: '+safe(first)+'</small></div>'+
   (!state.startMonth?'<button type="button" class="rk44-transfer-primary" data-rk44-schedule-next>جدولة بداية الشهر القادم</button>':
    '<p class="rk44-subnote">بداية الدورة محفوظة في '+safe(first)+'. الشهر الجاري للتسجيل الجزئي دون استدراك البنود الفائتة.</p>')+
   '<details class="rk44-starter-settings" '+(state.verified?'':'open')+'><summary>مراجعة الدخل والمصروفات والأرصدة</summary>'+
   '<form data-rk44-verified-start><div class="rk44-starter-inputs">'+
   fields.map(([key,label])=>input(key,label,details?.[key])).join('')+'</div>'+
   '<h4>أرصدة البنوك عند البداية (أدخل صفرًا إن لم يوجد)</h4><div class="rk44-starter-inputs">'+
   banks.map(([key,label])=>input('opening_'+key,'الرصيد الافتتاحي — '+label,details?.opening?.[key])).join('')+'</div>'+
   '<p class="rk44-subnote">إدخال الرصيد هنا لأغراض التخطيط فقط، ولا ينشئ نقدًا أو يقيد مبلغًا في البنك.</p>'+
   '<label class="rk44-approval"><input type="checkbox" name="approval" required> أؤكد صحة المدخلات وعدم احتساب الالتزام مرتين.</label>'+
   '<button type="submit" class="rk44-transfer-primary">اعتماد بيانات البداية</button></form></details></section>';
 }
 function rkVerifiedMonth(state,period){
  if(!state.verified)return '<section class="rk44-starter"><p class="rk44-subnote">لا يمكن احتساب الفائض أو الأهداف؛ بيانات الراتب والمصروفات والالتزامات غير مؤكدة، وليست صفرًا.</p></section>';
  if(state.phase==='scheduled')return '<section class="rk44-starter"><p class="rk44-subnote">تبدأ الحسابات عند الدخول إلى شهر '+safe(state.startMonth)+'. سجل فقط ما يحدث الآن؛ لا يلزم اعتماد أي خطة لهذا الشهر الجزئي.</p></section>';
  const p=adaptive.verifiedStarterPlan(db,period);
  const row=(label,value,note)=>'<div class="rk44-starter-line"><div><strong>'+safe(label)+'</strong><small>'+safe(note)+'</small></div><b>'+fmt(value)+'</b></div>';
  const plan=p.allocation;
  const records=p.monthlyHistory;
  return '<section class="rk44-starter"><header class="rk44-sectionhead"><h3>خطة الحماية وفق القدرة المالية</h3>'+
   hint('الفائض = الدخل المؤكد ناقص المصروفات الأساسية والأقساط والرسوم غير المكررة. الأولوية لالتزامات الهلال ثم طوارئ ملاءة، ولا نضع هدفًا استثماريًا افتراضيًا.')+'</header>'+
   '<div class="rk44-starter-main"><span>'+(p.rawSurplus<0?'العجز':'الفائض الحسابي بعد الالتزامات')+'</span>'+
   '<strong>'+fmt(Math.abs(p.rawSurplus))+'</strong><small>تقدير من بياناتك، وليس نقدًا مصرفيًا جديدًا</small></div>'+
   '<div class="rk44-starter-lines">'+
   row('الهلال: حماية الالتزامات',plan.hilal,'هدف أولي: '+fmt(p.stageTargets.hilal))+
   row('ملاءة: طوارئ',plan.malaaEmergency,'هدف أولي: '+fmt(p.stageTargets.malaa))+
   row('ملاءة: ادخار إضافي',plan.malaaSavings,'المتبقي بعد الأولويات')+
   row('الأصول: استثمار',plan.assets,'لا استثمار تلقائي ولا هدف مفترض')+'</div>'+
   '<div class="rk44-starter-month"><h4>دورة شهر '+safe(period)+'</h4>'+
   (records.length?'<p class="rk44-subnote">تم اعتماد خطة هذا الشهر بقيمة '+fmt(records[0].amount)+'.</p>':
    '<form data-rk44-verified-month><label>الفائض المحقق (ريال)<input type="number" name="amount" min="0" step="0.01" required value="'+(p.amount/100).toFixed(2)+'"></label>'+
    '<label class="rk44-approval"><input type="checkbox" name="approval" required> أعتمد تخطيطًا لهذا الشهر دون نقل أموال.</label>'+
    '<button type="submit" class="rk44-transfer-primary" '+((p.income===0||(db.salaryMonths||[]).includes(period))?'':'disabled')+'>اعتماد خطة الشهر</button></form>')+
   (p.income>0&&!(db.salaryMonths||[]).includes(period)?'<p class="rk44-subnote">يُسجل راتب الشهر الحالي فقط في بنك الهلال قبل اعتماد خطة الشهر.</p>':'')+
   '</div></section>';
 }


 function yieldPanel(){
  const policy=adaptive.starterPolicy(db),revenue=adaptive.yieldRecords(db);
  const block=y=>{
   const parts=['malaa','assets'].map(bank=>{
    const requestId=y.transferIds[bank];
    const t=requestId?adaptive.transfers(db).find(x=>x.id===requestId):null;
    const state=t?({pending:'طلب قيد الانتظار',executed:'خرج ولم تصل مطابقته',matched:'مطابق',cancelled:'طلب ملغي'}[t.status]||'طلب مسجل'):'لم يعتمد طلب التحويل';
    const btn=y.status==='recorded'&&(!requestId||t?.status==='cancelled')&&y.splitAmounts[bank]>0?
     '<button type="button" data-rk44-yield-split="'+safe(y.id)+'" data-rk44-yield-bank="'+bank+'">'+(t?.status==='cancelled'?'إعادة اعتماد الطلب':'اعتماد طلب')+'</button>':
     '<small>'+safe(state)+'</small>';
    return '<div class="rk44-yield-line"><span>'+safe(adaptive.bankNames[bank])+'</span><b>'+fmt(y.splitAmounts[bank])+'</b>'+btn+'</div>';
   }).join('');
   const correction=y.status==='recorded'&&!Object.values(y.transferIds).some(id=>id&&adaptive.transfers(db).find(t=>t.id===id)?.status!=='cancelled')?
    '<details class="rk44-yield-correction"><summary>تصحيح العائد</summary><form data-rk44-yield-reverse data-rk44-id="'+safe(y.id)+'">'+
    '<label>سبب العكس<input name="reason" minlength="5" maxlength="150" required></label>'+
    '<button type="submit">قيد عكسي مستقل</button></form></details>':'';
   return '<article class="rk44-yield-record"><div class="rk44-transfer-heading"><strong>عائد بتاريخ '+safe(y.date)+'</strong>'+
    '<b>'+fmt(y.amount)+'</b></div><small>مرجع التحصيل: '+safe(y.reference)+'</small>'+
    (y.status==='reversed'?'<small>تم عكس القيد: '+safe(y.reversalReason||'')+'</small>':parts+correction)+'</article>';
  };
  return '<section class="rk44-starter rk44-yields" aria-label="توزيع عوائد الهلال">'+
   '<header class="rk44-sectionhead"><h3>عوائد الهلال المحصلة</h3>'+
   hint('القروض التي يأخذها البنك تُنشئ التزامًا وليست ربحًا. لا يسجل النظام عائدًا إلا بعد إثبات وصوله فعليًا. يُحسب توزيع العائد تلقائيًا ثم تُنشأ طلبات التحويل بعد تفويضك؛ التنفيذ والمطابقة والشراء الاستثماري ليست تلقائية.')+'</header>'+
   '<div class="rk44-yield-ratios"><span>حصة ملاءة <b>'+policy.yieldShares.malaa/100+'%</b></span>'+
   '<span>حصة الأصول <b>'+policy.yieldShares.assets/100+'%</b></span></div>'+
   '<details class="rk44-starter-settings"><summary>تسجيل عائد تم تحصيله فعلًا في الهلال</summary>'+
   '<form data-rk44-yield-new><div class="rk44-starter-inputs">'+
   '<label>قيمة العائد (ريال)<input name="amount" required type="number" min="0.01" step="0.01"></label>'+
   '<label>تاريخ الاستلام<input name="date" type="date" required value="'+new Date().toISOString().slice(0,10)+'"></label>'+
   '<label>مرجع التحصيل<input name="reference" required minlength="5" maxlength="100"></label>'+
   '<label>مصدر الربح أو البيان<input name="note" maxlength="180"></label></div>'+
   '<label class="rk44-approval"><input type="checkbox" name="approval" required> أؤكد استلام هذا العائد فعليًا وأنه لم يسجل مسبقًا في دفتر الأستاذ.</label>'+
   '<label class="rk44-approval"><input type="checkbox" name="autoRequests"> أفوض إنشاء طلبات توزيع حصص ملاءة والأصول آليًا إن سمحت السيولة، دون تنفيذ أي تحويل مصرفي.</label>'+
   '<button type="submit" class="rk44-transfer-primary">إثبات تحصيل العائد</button></form></details>'+
   '<div class="rk44-yield-records"><h4>العوائد المقيدة في دفتر الأستاذ</h4>'+
   (revenue.length?revenue.slice().reverse().slice(0,15).map(block).join(''):
    '<p class="rk44-subnote">لا توجد عوائد محصلة. الأرباح المستقبلية والقروض المستلمة ليست نقدًا متاحًا.</p>')+
   '</div></section>';
 }

 function liquidityPanel(data){
  const p=data.liquidityPlan;
  return '<section class="rk44-liquidity" aria-label="خطة توزيع السيولة">'+
   '<div class="rk44-sectionhead"><h3>أولويات حماية السيولة</h3>'+
   hint('الاحتياج الفوري حد احترازي محسوب، وليس مبلغًا مخصومًا من البنك. النقد المطابق هو الأقل بين الادخار المسجل ونقد ملاءة المتاح في دفتر الأستاذ؛ لا تجمع القيمتين باعتبارهما نقدًا جديدًا.')+'</div>'+
   '<div class="rk44-liquidity-grid">'+
   metric('حماية فورية مطلوبة',fmt(p.immediateRequired),'navy')+
   metric('الالتزامات الشهرية القريبة',fmt(p.upcomingCommitments),'red')+
   metric('السيولة المسجلة خلال 3 أيام',fmt(p.liquidRecorded),'teal')+
   metric('نقد مطابق متاح في الدفتر',fmt(p.reconciledCash),'blue')+
   metric('هامش الأمان قبل الاستثمار',fmt(p.investmentBuffer),'navy')+
   metric('فائض معتمد للدراسة فقط',fmt(p.investable),p.investable?'teal':'navy')+
   '</div><p class="rk44-subnote">إذا لم تُثبت أرصدة نقدية في دفتر الأستاذ، يتوقف ترشيح الاستثمار حفاظًا على الأموال؛ لا تُحوّل أرقام الادخار أو الأهداف تلقائيًا إلى نقد مؤكد.</p></section>';
 }
 function transferPanel(data){
  const names=adaptive.bankNames;
  const options=Object.entries(names).map(([id,name])=>'<option value="'+id+'">'+safe(name)+'</option>').join('');
  const ledger=Object.entries(names).map(([id,name])=>
   '<div class="rk44-ledger-bank"><span>'+safe(name)+'</span><strong>'+fmt(adaptive.cashBalance(db,id))+
   '</strong><small>متاح للطلبات: '+fmt(adaptive.availableBankCash(db,id))+'</small></div>').join('');
  const rows=adaptive.transfers(db).slice().reverse().map(op=>{
   const pending=op.status==='pending',executed=op.status==='executed';
   const status={pending:'طلب معتمد بانتظار التنفيذ',executed:'خرج من المصدر — بانتظار مطابقة الوصول',
    matched:'تمت مطابقة وصول المبلغ',cancelled:'أُلغي قبل التنفيذ'}[op.status]||'غير محددة';
   const ref=pending?'<form data-rk44-transfer-step="execute" data-rk44-id="'+safe(op.id)+'" class="rk44-step-form">'+
    '<label>مرجع إثبات خروج المبلغ<input name="reference" minlength="5" maxlength="100" required placeholder="مرجع التنفيذ من البنك"></label>'+
    '<button type="submit">إثبات التنفيذ</button>'+
    '<button type="button" data-rk44-transfer-cancel="'+safe(op.id)+'">إلغاء الطلب</button></form>':
    executed?'<form data-rk44-transfer-step="match" data-rk44-id="'+safe(op.id)+'" class="rk44-step-form">'+
    '<label>مرجع إثبات وصول المبلغ<input name="reference" minlength="5" maxlength="100" required placeholder="مرجع الوصول في البنك المستفيد"></label>'+
    '<button type="submit">مطابقة وصول المبلغ</button></form>':'';
   return '<article class="rk44-transfer-row"><div class="rk44-transfer-heading"><strong>'+
    safe(names[op.from]||op.from)+' ← '+safe(names[op.to]||op.to)+'</strong>'+
    '<b class="rk44-navy">'+fmt(op.amount)+'</b></div>'+
    '<span class="rk44-transfer-status">'+safe(status)+'</span>'+
    (op.note?'<small>'+safe(op.note)+'</small>':'')+
    (op.executionReference?'<small>مرجع التنفيذ: '+safe(op.executionReference)+'</small>':'')+
    (op.destinationReference?'<small>مرجع الوصول: '+safe(op.destinationReference)+'</small>':'')+ref+'</article>';
  }).join('');
  const open=adaptive.transfers(db).some(op=>['pending','executed'].includes(op.status))?' open':'';
  return '<details class="rk44-transfer-panel" id="rk44-transfers"'+open+'>'+
   '<summary><span>سجل تحويلات الحماية بين البنوك</span><small>'+adaptive.transfers(db).length+' عملية</small></summary>'+
   '<div class="rk44-transfer-content"><div class="rk44-ledger-banks">'+ledger+'</div>'+
   hint('التحويل يتم عبر دفتر الأستاذ النقدي V5 فقط. الطلب يحجز المبلغ ولا يرحله. إثبات التنفيذ يخصمه من البنك المصدر ويضعه قيد التحويل؛ المطابقة تُثبته في بنك الوصول. لا تُعدّل أرصدة الادخار أو المحافظ أو النقد المصرفي الحقيقي آليًا.')+
   '<form data-rk44-transfer-new class="rk44-transfer-form"><div class="rk44-transfer-fields">'+
   '<label>البنك المصدر<select name="from" required>'+options.replace('value="malaa"','value="malaa" selected')+'</select></label>'+
   '<label>البنك المستفيد<select name="to" required>'+options.replace('value="hilal"','value="hilal" selected')+'</select></label>'+
   '<label>المبلغ (ريال)<input name="amount" type="number" inputmode="decimal" min="0.01" step="0.01" required></label>'+
   '<label class="rk44-transfer-note">سبب التحويل<input name="note" maxlength="180" placeholder="الغرض من التمويل أو دعم السيولة"></label></div>'+
   '<label class="rk44-approval"><input type="checkbox" name="approval" required> أعتمد تسجيل طلب التحويل بعد مراجعة رصيد المصدر. لا يُنفّذ تحويل مصرفي فعلي.</label>'+
   '<button type="submit" class="rk44-transfer-primary">تسجيل طلب التحويل المعتمد</button></form>'+
   '<div class="rk44-transfer-history"><h4>الطلبات وحالة المطابقة</h4>'+
   (rows||'<p class="rk44-subnote">لا توجد تحويلات حماية مسجلة بعد.</p>')+'</div></div></details>';
 }
 function applyFinancialAction(action,verb,detail,successMessage){
  const keys=['rk44Transfers','rk44Yields','rk44StarterPolicy','rk44StarterMonths','rk44StartSchedule','rk44VerifiedStart','rk44VerifiedMonths','rk44Wizard','rk44WizardDraft','rk44WizardCycles','rk44UserDetails','rk44UserDetailsHistory','salary','goals','debts','ledgerEntries','audit'];
  const original=Object.fromEntries(keys.map(k=>[k,{
   exists:Object.prototype.hasOwnProperty.call(db,k),
   value:Object.prototype.hasOwnProperty.call(db,k)?JSON.stringify(db[k]):null
  }]));
  try{
   const result=action();
   audit(verb,detail);
   save();
   if(typeof toast==='function')toast(successMessage||'تم تسجيل العملية في مركز الحماية');
   try{render()}catch(e){/* عملية محفوظة لا تُعكس بسبب تعثر عرضها. */}
   return result;
  }catch(error){
   for(const k of keys){
    if(original[k].exists)db[k]=JSON.parse(original[k].value);
    else delete db[k];
   }
   alert(error.message||'تعذر حفظ العملية. لم يعتمد التعديل.');
   try{render()}catch(e){}
   return null;
  }
 }
 function riskPanel(data){
  const high=data.critical||data.warning;
  const shortage=data.gapToProtection;
  const level=high?'مرتفع':shortage>0?'بحاجة إلى تعزيز':'تحت المتابعة';
  return '<section class="rk44-risk" aria-label="الاستجابة المالية">'+
   '<div class="rk44-risk-title"><div><h3>الاستجابة المبكرة للالتزامات</h3>'+
   '<span class="rk44-risk-badge '+(high?'rk44-danger':shortage>0?'rk44-caution':'rk44-healthy')+'">'+level+'</span></div>'+
   hint('النظام يعيد حساب الضغط المالي كلما تغيرت الأقساط أو المصروفات أو الأرصدة المسجلة. لا يقترض ولا يبيع استثمارات ولا يحول أموالًا دون موافقتك.')+
   '</div>'+
   '<div class="rk44-risk-values">'+
   metric('الأقساط الشهرية القائمة',fmt(data.debtMonthly),'red')+
   metric('عبء الأقساط من الراتب',data.debtRatio===null?'غير محسوب':(data.debtRatio*100).toFixed(1)+'%',high?'red':'navy')+
   metric('العجز عن تغطية السيولة',fmt(shortage),shortage>0?'red':'teal')+'</div>'+
   '<div class="rk44-response">'+
   (high?'<strong class="rk44-red">حالة حماية: عُلّق ترشيح فائض للاستثمار؛ راجع الأقساط والسيولة قبل أي استثمار جديد.</strong>':
   shortage>0?'<strong class="rk44-gold">يلزم تعزيز السيولة قبل زيادة المخاطرة الاستثمارية.</strong>':
   '<strong class="rk44-teal">لا يظهر ضغط مرتفع من الالتزامات المسجلة حاليًا.</strong>')+
   '<div class="rk44-response-actions">'+
   '<button type="button" data-rk44-page="debts">مراجعة الأقساط وسدادها</button>'+
   '<button type="button" data-rk44-release>طلب تفعيل احتياطي الهلال</button>'+
   '<button type="button" data-rk44-open-transfer>إدارة تحويلات الحماية</button></div></div></section>';
 }
 function scenarioPanel(){
  return '<details class="rk44-scenario"><summary>اختبار تأثير قرض جديد على قوة البنوك</summary>'+
   '<form data-rk44-scenario><div class="rk44-scenario-fields">'+
   '<label>مبلغ القرض (ريال)<input name="amount" type="number" inputmode="decimal" min="1" step="0.01" required placeholder="مبلغ القرض المطلوب"></label>'+
   '<label>المدة بالأشهر<input name="term" type="number" min="1" max="600" step="1" required value="36"></label>'+
   '<label>المعدل السنوي %<input name="rate" type="number" min="0" max="100" step="0.01" value="0" required></label></div>'+
   '<button type="submit" class="rk44-simulate">احسب أثر القرض</button></form>'+
   '<div class="rk44-scenario-result" data-rk44-result aria-live="polite"></div></details>';
 }
 function activePeriod(){
  const fn=window.RakaezHilalSelectedPeriod;
  const candidate=typeof month==='string'?month:typeof fn==='function'?fn():null;
  return /^20\d{2}-(0[1-9]|1[0-2])$/.test(String(candidate))?candidate:new Date().toISOString().slice(0,7);
 }
 const previousReserves=reservesView;
 reservesView=function(){
  const wizard=adaptive.wizardState(db);
  if(!wizard.completed)return '<section class="rk44-screen rk44-onboarding-blank">'+
   '<header class="rk44-screen-title"><h2>الانطلاقة والحماية المالية</h2></header>'+
   '<section class="rk44-starter"><h3>تهيئة الميزانية الشهرية</h3>'+
   '<p class="rk44-subnote">يتم إعداد بياناتك عبر نافذة التأسيس. لن تظهر أرقام أو توقعات قبل اعتماد معلوماتك.</p>'+
   '<button type="button" class="rk44-transfer-primary" data-w-open>فتح نافذة التأسيس</button>'+
   '</section></section>';
  const phase=adaptive.wizardPhase(db),period=rkStartMonth();
  const verified=adaptive.onboardingState(db,period);
  const reviews=adaptive.wizardCycles(db),today=new Date().toISOString().slice(0,10);
  const plan=adaptive.wizardLearning(db,period);
  let nextReview=null;
  for(let i=0;i<36;i++){
   const candidate=adaptive.offset(wizard.record.startMonth,i);
   if(candidate>period)break;
   if(reviews.some(x=>x.period===candidate))continue;
   const end=adaptive.wizardDateBound(adaptive.offset(candidate,1),wizard.record.salaryDay);
   if(today>=end){nextReview=candidate;break;}
  }
  const stage='<p class="rk44-subnote">'+safe(phase.label)+
   ' · التوقعات مبنية على بياناتك، أما العمليات المسجلة فتظل فعلية بتاريخها.</p>';
  const review=nextReview?
   '<label class="rk44-approval"><input type="checkbox" data-w-cycle-confirm> راجعت مصروفات دورة '+safe(nextReview)+'، وأؤكد تسجيل جميع عملياتها، بما فيها إن لم يوجد أي مصروف.</label>'+
   '<button type="button" class="rk44-transfer-primary" data-w-cycle-review="'+safe(nextReview)+'">اعتماد مراجعة دورة '+safe(nextReview)+'</button>':
   '<p class="rk44-subnote">تتاح مراجعة الدورة بعد مرور موعد الراتب التالي. لا يُشترط إدخال عمليات لم تحدث.</p>';
  const forecast=plan.ready?
   '<div class="rk44-starter-lines">'+
   '<div class="rk44-starter-line"><strong>الدخل الذي أدخلته للتوقع</strong><b>'+fmt(plan.verifiedIncome)+'</b></div>'+
   '<div class="rk44-starter-line"><strong>المصروفات المتوقعة بعد التعلم</strong><b>'+fmt(plan.forecast)+'</b></div>'+
   '<div class="rk44-starter-line"><strong>'+(plan.surplus<0?'عجز متوقع':'فائض متوقع')+'</strong><b>'+fmt(Math.abs(plan.surplus))+'</b></div>'+
   '</div><p class="rk44-subnote">'+safe(plan.explanation)+
   '. هذه التقديرات لا تغير بنود الميزانية المعتمدة دون موافقتك.</p>':
   '<p class="rk44-subnote">'+safe(plan.reason||'لا توجد بيانات كافية للتوقع بعد')+'</p>';
  return '<section class="rk44-screen">'+
   '<header class="rk44-screen-title"><h2>الحماية المالية للبنوك الثلاثة</h2></header>'+
   '<section class="rk44-starter"><div class="rk44-sectionhead"><h3>متابعة دورة الراتب</h3>'+
   hint('بعد اعتماد التأسيس تتغير التوقعات من سجل المصروفات والأقساط. الانتقال للمرحلة التالية يحتاج مراجعة دورة مكتملة؛ الأرقام المستقبلية ليست حقائق مضمونة.')+'</div>'+
   stage+forecast+
   '<p class="rk44-subnote">الدورة الكاملة المجدولة تبدأ في '+safe(wizard.record.startMonth)+
   '. لا يلزم إدخال عمليات الأشهر الجزئية السابقة. البنوك الثلاثة افتراضية ولا تستقبل الراتب الحقيقي.</p>'+
   review+'</section>'+
   '<details class="rk44-advanced"><summary>سجل تحويلات الحماية السابق</summary>'+
   '<div class="rk44-advanced-body">'+transferPanel()+'</div></details></section>';
 };
 const originalRender=render;
 render=function(){
  const result=originalRender.apply(this,arguments);
  if(['insights','position','reports'].includes(page)){
   const root=document.getElementById('view');
   if(root)root.innerHTML=rkCertifiedSummary();
  }
  if(db.rk44LegacyCalculationApproved===true && ['insights','debts','hilal','malaa','assets','position'].includes(page)){
   const root=document.getElementById('view');
   if(root&&!root.querySelector('.rk44-alert-inline')){
    try{
     const data=adaptive.assess(db,activePeriod());
     if(data.critical||data.warning||(data.gapToProtection>0&&data.incomeRecorded)){
      const banner=document.createElement('div');
      banner.className='rk44-alert-inline';
      banner.setAttribute('role','alert');
      const warning=data.critical||data.warning?
       'تنبيه الحماية: ضغط الالتزامات '+(data.critical?'حرج':'مرتفع')+'؛ أُوقف ترشيح فائض جديد للاستثمار.':
       'تنبيه الحماية: النقد المتاح في الدفتر لا يغطي هدف السيولة المطلوب؛ أُوقف ترشيح الاستثمار.';
      banner.innerHTML='<span>'+warning+'</span>'+
       '<button type="button" data-rk44-page="reserves">مراجعة الحماية</button>';
      root.prepend(banner);
     }
    }catch(error){/* A bad financial entry must never hide the page. */}
   }
  }

  // Bank-specific cash reconciliation is derived from V5, never added to savings or investments.
  const root=document.getElementById('view');
  if(root&&['hilal','malaa','assets'].includes(page)&&!root.querySelector('.rk44-cash-link')){
   try{
    const cash=adaptive.cashBalance(db,page),free=adaptive.availableBankCash(db,page);
    const labels={hilal:'نقد بنك الهلال في دفتر الأستاذ',malaa:'نقد بنك ملاءة في دفتر الأستاذ',assets:'نقد بنك الأصول في دفتر الأستاذ'};
    const strip=document.createElement('div');
    strip.className='rk44-cash-link';
    strip.innerHTML='<span>'+safe(labels[page])+'</span><strong>'+fmt(cash)+
     '</strong><small>المتاح لطلبات التحويل بعد الحجوزات: '+fmt(free)+'</small>'+
     '<button type="button" data-rk44-page="reserves">حركة الحماية</button>';
    root.prepend(strip);
   }catch(err){/* Does not block reading legacy bank pages. */}
  }
  if(root&&page==='interbank'&&!root.querySelector('.rk44-cash-link')){
   const strip=document.createElement('div');
   strip.className='rk44-cash-link';
   strip.innerHTML='<span>طلبات التمويل هنا تخطيطية ولا تنقل النقد.</span>'+
    '<button type="button" data-rk44-open-transfer>فتح تحويلات الحماية المعتمدة</button>';
   root.prepend(strip);
  }
  return result;
 };
 const entry=Array.isArray(N)?N.find(item=>item[0]==='reserves'):null;
 if(entry)entry[1]='الاحتياطيات المتغيرة';
 const bankPosition=Array.isArray(N)?N.find(row=>row[0]==='position'):null;
 if(bankPosition)bankPosition[1]='الوضع المالي للبنوك';
 document.addEventListener('click',event=>{


  // أول جلسة: الترحيب داخل نافذة واحدة، ثم حفظ المسودة أو اعتماد التأسيس صراحةً.
  const wizardOpenButton=event.target.closest('[data-w-open]');
  if(wizardOpenButton){
   event.preventDefault();event.stopImmediatePropagation();
   wizardOpen();return;
  }
  if(event.target.closest('.rk44-wizard')){
   const close=event.target.closest('[data-w-close]');
   if(close){
    event.preventDefault();event.stopImmediatePropagation();
    wizardPersistDraft();
    document.getElementById('modalRoot').innerHTML='';
    return;
   }
   const back=event.target.closest('[data-w-prev]');
   if(back){
    event.preventDefault();event.stopImmediatePropagation();
    wizardStep=Math.max(0,wizardStep-1);
    wizardPersistDraft();wizardShow();return;
   }
   const add=event.target.closest('[data-w-add]');
   if(add){
    event.preventDefault();event.stopImmediatePropagation();
    const kind=add.getAttribute('data-w-add');
    if(kind==='items')wizardDraft.items.push({id:'wi-'+Date.now()+'-'+wizardDraft.items.length,
     name:'',amount:'',remaining:'',frequency:'monthly',category:'auto'});
    if(kind==='dependents')wizardDraft.dependents.push({id:'wd-'+Date.now()+'-'+wizardDraft.dependents.length,
     name:'',relation:'',amount:'',frequency:'none',includedInItems:false});
    if(kind==='obligations')wizardDraft.obligations.push({name:'',remaining:'',mode:'capacity',installment:'',due:''});
    if(kind==='goals')wizardDraft.goals.push({name:'',target:'',date:''});
    wizardPersistDraft();wizardShow();return;
   }
   const remove=event.target.closest('[data-w-remove]');
   if(remove){
    event.preventDefault();event.stopImmediatePropagation();
    const type=remove.getAttribute('data-w-remove');
    const index=Number(remove.getAttribute('data-w-index'));
    if(['items','dependents','obligations','goals'].includes(type)&&
     Number.isInteger(index)&&index>=0&&index<wizardDraft[type].length){
     wizardDraft[type].splice(index,1);
     wizardPersistDraft();wizardShow();
    }
    return;
   }
   const next=event.target.closest('[data-w-next]');
   if(next){
    event.preventDefault();event.stopImmediatePropagation();
    try{
     if(wizardStep>0&&wizardStep<7)wizardValidate(wizardStep);
     if(wizardStep<7){
      wizardStep++;
      wizardPersistDraft();wizardShow();
      return;
     }
     if(!document.getElementById('rk44-wizard-approved')?.checked)
      throw Error('راجع البيانات ووافق على التأسيس قبل الاعتماد.');
     const data=wizardPayload();
     const result=applyFinancialAction(()=>{
      const approved=adaptive.confirmWizard(db,data,rkStartMonth());
      delete db.rk44WizardDraft;
      return approved;
     },'اعتماد تأسيس ركائز','توقعات مالية معتمدة مع دورة راتب أولية',
      'اعتمدت بياناتك الأولية؛ ستُحسّن التوقعات بعد مراجعة دورات الراتب');
     if(result)document.getElementById('modalRoot').innerHTML='';
    }catch(error){wizardMessage(error.message||'راجع المدخلات قبل المتابعة.');}
    return;
   }
  }
  const cycleReview=event.target.closest('[data-w-cycle-review]');
  if(cycleReview){
   event.preventDefault();event.stopImmediatePropagation();
   const box=document.querySelector('[data-w-cycle-confirm]');
   if(!box?.checked){alert('راجع عمليات الدورة وأكد اكتمالها أولًا.');return;}
   if(!confirm('اعتماد مراجعة دورة راتب مكتملة؟ لن تُعدّل أي عملية قديمة.'))return;
   const period=cycleReview.getAttribute('data-w-cycle-review');
   applyFinancialAction(()=>adaptive.reviewWizardCycle(db,period),
    'اعتماد مراجعة دورة راتب',period,
    'تم حفظ مراجعة الدورة، ويستخدمها ركائز لتحسين المقارنات القادمة');
   return;
  }

  const removeDetail=event.target.closest('[data-rk44-detail-remove]');
  if(removeDetail){
   event.preventDefault();event.stopImmediatePropagation();
   if(!confirm('حذف هذا السجل من تفاصيل الميزانية؟ لن تُحذف أي معاملة مالية أصلية.'))return;
   const old=adaptive.userDetails(db),id=removeDetail.getAttribute('data-id');
   const type=removeDetail.getAttribute('data-rk44-detail-remove');
   const input={items:old.items.map(x=>({...x})),dependents:old.dependents.map(x=>({...x})),
    useAsEssentials:old.useAsEssentials===true};
   if(type==='item')input.items=input.items.filter(x=>x.id!==id);
   else if(type==='dependent')input.dependents=input.dependents.filter(x=>x.id!==id);
   else return;
   if(!input.items.length&&!input.dependents.length)input.useAsEssentials=false;
   applyFinancialAction(()=>adaptive.saveUserDetails(db,input),'حذف تفصيل من الميزانية',
    'السجل: '+id,'تم حذف التفصيل مع حفظ تاريخ المراجعات دون تعديل قيود مالية');
   return;
  }
  const scheduleButton=event.target.closest('[data-rk44-schedule-next]');
  if(scheduleButton){
   event.preventDefault();event.stopImmediatePropagation();
   if(!confirm('بدء الدورة المالية الكاملة من الشهر القادم؟ يمكنك تسجيل هذا الشهر جزئيًا دون استكمال ما فات.'))return;
   applyFinancialAction(()=>adaptive.scheduleNextMonth(db,rkStartMonth()),
    'جدولة دورة البداية','بداية شهر كامل بعد شهر '+rkStartMonth(),
    'تم اعتماد بداية الشهر القادم دون تعديل الأرصدة');
   return;
  }
  const release=event.target.closest('[data-rk44-release]');
  if(release){
   event.preventDefault();event.stopImmediatePropagation();
   const registry=window.RakaezHilalCore;
   const earmarked=registry&&typeof registry.reserve==='function'?registry.reserve(db).earmarked:0;
   navigate('hilal');
   if(earmarked>0){
    const trigger=document.querySelector('#view [data-rk39-open="reserve-release"]');
    if(trigger)trigger.click();
    else alert('افتح عمليات الاحتياطي وسجّل إعادة التخصيص بعد مراجعة المبلغ.');
   }else{
    alert('لم يُسجّل احتياطي محجوز يمكن إعادة تخصيصه. راجع احتياطي الهلال والرصيد الفعلي أولًا.');
   }
   return;
  }
  const transferOpen=event.target.closest('[data-rk44-open-transfer]');
  if(transferOpen){
   event.preventDefault();event.stopImmediatePropagation();
   if(page!=='reserves'){navigate('reserves');}
   const panel=document.getElementById('rk44-transfers');
   const advanced=panel?.closest('.rk44-advanced');if(advanced)advanced.open=true;
   if(panel){panel.open=true;panel.scrollIntoView({behavior:'smooth',block:'nearest'});}
   return;
  }

  const yieldButton=event.target.closest('[data-rk44-yield-split]');
  if(yieldButton){
   event.preventDefault();event.stopImmediatePropagation();
   const id=yieldButton.dataset.rk44YieldSplit,bank=yieldButton.dataset.rk44YieldBank;
   if(!confirm('اعتماد طلب تحويل حصة العائد إلى '+(adaptive.bankNames[bank]||bank)+'؟ سيظل التنفيذ والمطابقة يدويين.'))return;
   applyFinancialAction(()=>adaptive.requestYieldSplit(db,id,bank),'اعتماد توزيع عائد',id+' — '+bank,
    'طلب تحويل معتمد — يتطلب إثبات التنفيذ والوصول');
   return;
  }
  const cancel=event.target.closest('[data-rk44-transfer-cancel]');
  if(cancel){
   event.preventDefault();event.stopImmediatePropagation();
   if(!confirm('إلغاء طلب التحويل قبل تنفيذه؟'))return;
   const id=cancel.getAttribute('data-rk44-transfer-cancel');
   applyFinancialAction(()=>adaptive.cancelTransfer(db,id),'إلغاء تحويل حماية',id);
   return;
  }
  const button=event.target.closest('[data-rk44-page]');
  if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  navigate(button.dataset.rk44Page);
 },true);
 document.addEventListener('change',event=>{
  const selector=event.target.closest('[data-rk44-policy]');
  if(!selector)return;
  const id=selector.dataset.rk44Policy;
  if(!Object.hasOwn(adaptive.defaults,id))return;
  const n=Number(selector.value);
  if(!Number.isInteger(n)||n<1||n>6){alert('مدة حماية غير صالحة.');render();return;}
  const prior=db.rk44Policy?{...db.rk44Policy}:undefined;
  const previousAudit=Array.isArray(db.audit)?db.audit.slice():null;
  const p=adaptive.monthsPolicy(db);
  db.rk44Policy={...p,[id]:n};
  try{
   audit('تحديث سياسة الحماية',id+' — '+n+' أشهر');
   save();
   render();
   if(typeof toast==='function')toast('حُفظت مدة الحماية وأُعيد الحساب');
  }catch(err){
   if(prior)db.rk44Policy=prior;
   else delete db.rk44Policy;
   if(previousAudit!==null)db.audit=previousAudit;
   else delete db.audit;
   alert('تعذر حفظ السياسة. لم يعتمد التعديل.');
   render();
  }
 },true);

 document.addEventListener('input',event=>{
  const name=event.target.closest('[data-rk44-suggest-name]');
  if(!name)return;
  const form=name.closest('[data-rk44-add-item]');
  const suggestion=adaptive.categorySuggestion(name.value);
  const label=form?.querySelector('[data-rk44-suggest-output]');
  if(label)label.textContent=suggestion.category?
   'اقتراح التصنيف: '+suggestion.category+' — '+suggestion.reason:
   'التصنيف غير واضح؛ اختر تصنيفًا يدويًا قبل الحفظ';
 },true);


 document.addEventListener('input',event=>{
  const element=event.target.closest('[data-w-group][data-w-key]');
  if(!element||!element.closest('.rk44-wizard'))return;
  const group=element.getAttribute('data-w-group');
  const key=element.getAttribute('data-w-key');
  const index=Number(element.getAttribute('data-w-index'));
  const row=group==='profile'?wizardDraft.profile:
   ['items','dependents','obligations','goals'].includes(group)?wizardDraft[group]?.[index]:null;
  if(!row||!Object.hasOwn(row,key))return;
  row[key]=element.type==='checkbox'?element.checked:element.value;
  if(group==='items'&&key==='name'){
   const note=element.closest('.rk44-wizard-line')?.querySelector('[data-w-suggestion]');
   const suggested=adaptive.categorySuggestion(element.value);
   if(note)note.textContent='اقتراح النظام: '+(suggested.category||'يحتاج تحديدًا منك');
  }
 },true);
 document.addEventListener('change',event=>{
  const element=event.target.closest('[data-w-group][data-w-key]');
  if(!element||!element.closest('.rk44-wizard'))return;
  const group=element.getAttribute('data-w-group'),key=element.getAttribute('data-w-key');
  const index=Number(element.getAttribute('data-w-index'));
  const row=group==='profile'?wizardDraft.profile:wizardDraft[group]?.[index];
  if(row&&Object.hasOwn(row,key)){
   row[key]=element.type==='checkbox'?element.checked:element.value;
   if(group==='obligations'&&key==='mode')wizardShow();
  }
 },true);
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&document.querySelector('#modalRoot .rk44-wizard')){
   event.preventDefault();event.stopImmediatePropagation();
   wizardPersistDraft();
   document.getElementById('modalRoot').innerHTML='';
  }
 },true);

 document.addEventListener('submit',event=>{

  const detailForm=event.target.closest('[data-rk44-add-item],[data-rk44-edit-item],[data-rk44-add-dependent],[data-rk44-edit-dependent],[data-rk44-detail-mode],[data-rk44-flex-debt],[data-rk44-flex-preview]');
  if(detailForm){
   event.preventDefault();event.stopImmediatePropagation();
   const find=n=>detailForm.elements.namedItem(n);
   const cents=n=>{
    const raw=String(find(n)?.value??'').trim();
    if(!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(raw))throw Error('أدخل مبلغًا بالريال بحد أقصى منزلتين عشريتين.');
    const amount=Math.round(Number(raw)*100);
    if(!Number.isSafeInteger(amount)||amount<0)throw Error('المبلغ غير صالح.');
    return amount;
   };
   try{
    if(detailForm.hasAttribute('data-rk44-flex-preview')){
     const before=cents('before'),after=cents('after'),protectedAmount=cents('protected');
     const result=adaptive.flexibleRepaymentPreview(db,{
      previousIncome:before,currentIncome:after,protectedAmount,period:rkStartMonth()});
     const el=detailForm.querySelector('[data-rk44-flex-result]');
     if(el){
      if(!result.ready)el.textContent=result.reason;
      else el.innerHTML='<p class="rk44-subnote">التغير النسبي في الدخل: '+
       (result.growth===null?'لا يُحسب من دخل سابق صفر':(result.growth*100).toFixed(1)+'%')+
       ' · الفائض الآمن بعد المصروفات والحماية: '+fmt(result.newFree)+
       ' · الزيادة في الفائض المتاح: '+fmt(result.extraFree)+'</p>'+
       '<strong class="'+(result.warning?'rk44-red':'rk44-teal')+'">'+
       (result.warning?'لا يُقترح سداد إضافي حتى تتوفر الحماية':'سقف دراسة السداد المبكر: '+fmt(result.ceiling))+
       '</strong><p class="rk44-subnote">هذا الحد الأقصى للمراجعة وليس دفعة إلزامية؛ يتطلب اختيار الدين والتحقق من الرصيد الحقيقي واعتمادك قبل السداد.</p>';
     }
     return;
    }
    if(detailForm.hasAttribute('data-rk44-flex-debt')){
     if(!find('approval').checked)throw Error('أكد أن هذا الدين لم يسجّل من قبل.');
     const name=String(find('name').value||'').trim(),amount=cents('amount');
     applyFinancialAction(()=>adaptive.saveFlexibleDebt(db,{name,amount}),
      'إضافة التزام مرن','التزام دون تاريخ استحقاق — '+name,
      'تم تسجيل التزام بلا قسط إلزامي؛ لا توجد حركة نقدية');
     return;
    }
    const old=adaptive.userDetails(db);
    const input={items:old.items.map(x=>({...x})),dependents:old.dependents.map(x=>({...x})),
     useAsEssentials:old.useAsEssentials===true};
    const identifier='rk44-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
    if(detailForm.hasAttribute('data-rk44-add-item')||detailForm.hasAttribute('data-rk44-edit-item')){
     const name=String(find('name').value||'').trim();
     const suggested=adaptive.categorySuggestion(name),selected=String(find('category').value);
     const category=selected==='auto'?suggested.category:selected;
     if(!category)throw Error('لا يمكن تحديد تصنيف موثوق لهذا الاسم. اختر التصنيف المناسب يدويًا.');
     const isEdit=detailForm.hasAttribute('data-rk44-edit-item');
     const id=isEdit?detailForm.getAttribute('data-id'):identifier;
     const remainingRaw=String(find('remaining')?.value??'').trim();
     const remaining=remainingRaw===''?null:(()=>{
      if(!/^-?(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(remainingRaw))throw Error('أدخل المتبقي بالريال، أو اتركه فارغًا.');
      return Math.round(Number(remainingRaw)*100);
     })();
     const row={id,name,amount:cents('amount'),remaining,frequency:find('frequency').value,
      category,categorySource:selected==='auto'?'suggestion':'manual'};
     if(isEdit){
      const idx=input.items.findIndex(v=>v.id===id);
      if(idx<0)throw Error('لم يُعثر على البند.');
      input.items[idx]=row;
     }else input.items.push(row);
    }
    if(detailForm.hasAttribute('data-rk44-add-dependent')||detailForm.hasAttribute('data-rk44-edit-dependent')){
     const isEdit=detailForm.hasAttribute('data-rk44-edit-dependent');
     const id=isEdit?detailForm.getAttribute('data-id'):identifier;
     const row={id,name:String(find('name').value||'').trim(),relation:String(find('relation').value||'').trim(),
      amount:cents('amount'),frequency:find('frequency').value,includedInItems:find('included').checked};
     if(isEdit){
      const idx=input.dependents.findIndex(v=>v.id===id);
      if(idx<0)throw Error('لم يُعثر على المعال.');
      input.dependents[idx]=row;
     }else input.dependents.push(row);
    }
    if(detailForm.hasAttribute('data-rk44-detail-mode')){
     input.useAsEssentials=find('useAsEssentials').checked;
    }
    applyFinancialAction(()=>adaptive.saveUserDetails(db,input),'تحديث تفصيل الميزانية',
     'عدد البنود '+input.items.length+'؛ عدد المعالين '+input.dependents.length,
     'تم حفظ التصنيف والتكرار والمبالغ دون حركة مالية');
   }catch(e){alert(e.message||'تعذر حفظ التفصيل.');}
   return;
  }
  const onboardingForm=event.target.closest('[data-rk44-verified-start]');
  const verifiedMonthForm=event.target.closest('[data-rk44-verified-month]');
  if(onboardingForm||verifiedMonthForm){
   event.preventDefault();event.stopImmediatePropagation();
   const cents=(form,name)=>{
    const v=String(form.elements.namedItem(name)?.value||'').trim();
    if(!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(v))throw Error('أدخل مبلغًا صحيحًا بالريال، أو صفراً عند عدم وجوده.');
    const n=Math.round(Number(v)*100);
    if(!Number.isSafeInteger(n)||n<0)throw Error('القيمة المالية غير صالحة.');
    return n;
   };
   try{
    if(onboardingForm){
     if(!onboardingForm.elements.namedItem('approval').checked)throw Error('يجب تأكيد المدخلات.');
     const data={
      income:cents(onboardingForm,'income'),essentials:cents(onboardingForm,'essentials'),
      obligations:cents(onboardingForm,'obligations'),recurring:cents(onboardingForm,'recurring'),
      opening:{
       hilal:cents(onboardingForm,'opening_hilal'),malaa:cents(onboardingForm,'opening_malaa'),
       assets:cents(onboardingForm,'opening_assets')
      }
     };
     applyFinancialAction(()=>adaptive.confirmFinancialStart(db,data,rkStartMonth()),
      'توثيق بيانات بداية البنوك','مدخلات راتب ومصروفات وأقساط وأرصدة — موعد '+rkStartMonth(),
      'حُفظت بياناتك دون إنشاء رصيد أو تعديل سجل قديم');
    }
    if(verifiedMonthForm){
     if(!verifiedMonthForm.elements.namedItem('approval').checked)throw Error('اعتمد الخطة قبل حفظها.');
     const amount=cents(verifiedMonthForm,'amount');
     applyFinancialAction(()=>adaptive.approveVerifiedMonth(db,rkStartMonth(),amount),
      'اعتماد توزيع شهر موثق',rkStartMonth()+' — '+amount+' هللة',
      'حُفظ توزيع الشهر دون تنفيذ إيداع أو تحويل مصرفي');
    }
   }catch(error){alert(error.message||'تعذر اعتماد العملية.');}
   return;
  }

  const planPolicy=event.target.closest('[data-rk44-starter-policy]');
  const planMonth=event.target.closest('[data-rk44-starter-month]');
  const yieldNew=event.target.closest('[data-rk44-yield-new]');
  const yieldReverse=event.target.closest('[data-rk44-yield-reverse]');
  if(planPolicy||planMonth||yieldNew||yieldReverse){
   event.preventDefault();event.stopImmediatePropagation();
   const moneyInput=(form,key)=>{
    const val=String(form.elements.namedItem(key)?.value||'').trim();
    if(!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(val))
     throw Error('أدخل المبلغ بالريال بحد أقصى منزلتين عشريتين.');
    const n=Math.round(Number(val)*100);
    if(!Number.isSafeInteger(n)||n<0)throw Error('المبلغ غير صالح.');
    return n;
   };
   const percent=(form,key)=>{
    const val=String(form.elements.namedItem(key)?.value||'').trim();
    if(!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(val))
     throw Error('أدخل النسبة بمنزلتين عشريتين كحد أقصى.');
    const n=Math.round(Number(val)*100);
    if(!Number.isInteger(n)||n<0||n>10000)throw Error('النسبة يجب أن تكون بين 0 و100.');
    return n;
   };
   try{
    if(planPolicy){
     if(!planPolicy.elements.namedItem('approval').checked)throw Error('اعتمد سياسة التخطيط أولًا.');
     const input={
      monthlySurplus:moneyInput(planPolicy,'monthly'),
      milestones:{
       hilal:moneyInput(planPolicy,'targetHilal'),
       malaa:moneyInput(planPolicy,'targetMalaa'),
       assets:moneyInput(planPolicy,'targetAssets')
      },
      shares:{
       hilal:percent(planPolicy,'shareHilal'),
       malaaEmergency:percent(planPolicy,'shareEmergency'),
       malaaSavings:percent(planPolicy,'shareSavings'),
       assets:percent(planPolicy,'shareAssets')
      },
      yieldShares:{malaa:percent(planPolicy,'yieldMalaa'),assets:percent(planPolicy,'yieldAssets')}
     };
     applyFinancialAction(()=>adaptive.saveStarterPolicy(db,input),'اعتماد سياسة الانطلاقة',
      'المبلغ المتوقع '+input.monthlySurplus+' هللة','حُفظت السياسة دون إجراء مالي أو تغيير بيانات سابقة');
    }
    if(planMonth){
     if(!planMonth.elements.namedItem('approval').checked)throw Error('اعتمد توزيع الشهر أولًا.');
     const amount=moneyInput(planMonth,'actual');
     applyFinancialAction(()=>adaptive.approveStarterMonth(db,activePeriod(),amount),
      'اعتماد خطة الفائض الشهرية',activePeriod()+' — '+amount+' هللة',
      'حُفظت خطة الفائض دون إيداع أو تحويل فعلي');
    }
    if(yieldNew){
     if(!yieldNew.elements.namedItem('approval').checked)throw Error('يجب تأكيد تحصيل العائد.');
     const input={amount:moneyInput(yieldNew,'amount'),
      reference:yieldNew.elements.namedItem('reference').value.trim(),
      date:yieldNew.elements.namedItem('date').value,
      note:yieldNew.elements.namedItem('note').value};
     const auto=yieldNew.elements.namedItem('autoRequests').checked;
     applyFinancialAction(()=>{
      const receipt=adaptive.recordRealizedYield(db,input);
      if(auto){
       for(const bank of ['malaa','assets']){
        try{adaptive.requestYieldSplit(db,receipt.id,bank)}
        catch(error){/* تتبقى الحصة المحمية كاقتراح، دون تنفيذ أو تلف القيد. */}
       }
      }
      return receipt;
     },'إثبات عائد محصل للهلال',input.reference+' — '+input.amount+' هللة',
     'تم إثبات العائد وتحديد حصصه؛ يلزم إثبات تنفيذ أي طلب تحويل');
    }
    if(yieldReverse){
     if(!confirm('إنشاء قيد عكسي مستقل دون حذف القيد الأصلي؟'))return;
     const id=yieldReverse.getAttribute('data-rk44-id');
     const reason=yieldReverse.elements.namedItem('reason').value.trim();
     applyFinancialAction(()=>adaptive.reverseYield(db,id,reason),
      'تصحيح عائد الهلال',id+' — '+reason,'تم إنشاء قيد عكسي موثق');
    }
   }catch(error){alert(error.message||'تعذّر اعتماد العملية.');}
   return;
  }
  const transferForm=event.target.closest('[data-rk44-transfer-new],[data-rk44-transfer-step]');
  if(transferForm){
   event.preventDefault();event.stopImmediatePropagation();
   if(transferForm.hasAttribute('data-rk44-transfer-new')){
    const from=transferForm.elements.namedItem('from').value;
    const to=transferForm.elements.namedItem('to').value;
    const raw=transferForm.elements.namedItem('amount').value.trim();
    if(!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(raw)||Number(raw)<=0){
     alert('أدخل مبلغًا صحيحًا بالريال بحد أقصى منزلتين عشريتين.');return;
    }
    if(!transferForm.elements.namedItem('approval').checked){
     alert('يجب اعتماد تسجيل الطلب صراحة.');return;
    }
    const amount=Math.round(Number(raw)*100);
    const note=transferForm.elements.namedItem('note').value;
    applyFinancialAction(()=>adaptive.requestTransfer(db,{from,to,amount,note}),
     'اعتماد طلب تحويل حماية',from+' ← '+to+' — '+amount+' هللة');
   }else{
    const id=transferForm.getAttribute('data-rk44-id');
    const ref=transferForm.elements.namedItem('reference').value.trim();
    const stage=transferForm.getAttribute('data-rk44-transfer-step');
    if(stage==='execute')applyFinancialAction(()=>adaptive.executeTransfer(db,id,ref),
      'إثبات خروج تحويل حماية',id+' — '+ref);
    if(stage==='match')applyFinancialAction(()=>adaptive.matchTransfer(db,id,ref),
      'مطابقة وصول تحويل حماية',id+' — '+ref);
   }
   return;
  }
  const form=event.target.closest('[data-rk44-scenario]');
  if(!form)return;
  event.preventDefault();event.stopImmediatePropagation();
  const output=form.parentElement.querySelector('[data-rk44-result]');
  if(!output)return;
  try{
   const amount=Number(form.elements.namedItem('amount').value);
   const months=Number(form.elements.namedItem('term').value);
   const rate=Number(form.elements.namedItem('rate').value);
   if(!Number.isFinite(amount)||amount<=0||amount>1e9)throw Error('أدخل مبلغًا صالحًا للقرض.');
   const r=adaptive.scenario(db,activePeriod(),amount,months,rate);
   output.innerHTML='<div class="rk44-stress-result">'+
    metric('القسط الشهري التقديري',fmt(r.monthly),'red')+
    metric('زيادة الاحتياطي المطلوب',fmt(r.increase),'gold')+
    metric('ضغط الأقساط بعد القرض',r.debtRatio===null?'غير محسوب':(r.debtRatio*100).toFixed(1)+'%',r.debtRatio>=0.35?'red':'navy')+
    '</div><p>هذا اختبار افتراضي فقط. لا يسجل قرضًا، ولا يحتسب رسومًا غير مدخلة أو يوافق على التمويل تلقائيًا.</p>'+
    '<button type="button" data-rk44-page="debts">الانتقال إلى إدارة الالتزامات</button>';
  }catch(err){
   output.textContent=err.message||'تعذّر حساب أثر القرض.';
  }
 },true);
 render();
 wizardMaybeOpen();
})();