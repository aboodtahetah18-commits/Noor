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


 function starterPanel(data){
  const p=adaptive.starterProjection(db,activePeriod()),policy=p.policy;
  const parts=p.allocation;
  const percent=n=>(n/100).toFixed(2).replace(/\.?0+$/,'');
  const field=(name,label,value,step='0.01')=>'<label>'+safe(label)+
   '<input name="'+name+'" type="number" required min="0" step="'+step+'" value="'+safe(value)+'"></label>';
  const item=(label,value,note)=>'<div class="rk44-starter-line"><div><strong>'+safe(label)+
   '</strong><small>'+safe(note)+'</small></div><b>'+fmt(value)+'</b></div>';
  return '<section class="rk44-starter" aria-label="الانطلاقة المالية التدريجية">'+
   '<header class="rk44-sectionhead"><h3>الانطلاقة المالية من الصفر</h3>'+
   hint('هذه أهداف مرحلية وأرقام تخطيطية وليست ديونًا أو أرصدة مؤكدة. لا يُصفّر النظام البيانات السابقة. الاعتماد الشهري لا ينشئ نقدًا أو يحوّل أموالًا.')+'</header>'+
   '<div class="rk44-starter-main"><span>فائض شهري متوقع بعد جميع الالتزامات</span>'+
   '<strong>'+fmt(p.amount)+'</strong><small>'+(policy.configured?'سياسة توزيع معتمدة':'نموذج مبدئي غير معتمد')+'</small></div>'+
   '<div class="rk44-starter-lines">'+
   item('الهلال: حماية التشغيل',parts.hilal,'هدف مرحلي توضيحي '+fmt(policy.milestones.hilal))+
   item('ملاءة: صندوق الطوارئ',parts.malaaEmergency,'سيولة فورية قابلة للاستخدام')+
   item('ملاءة: ادخار وأموال إضافية',parts.malaaSavings,'الهدف الإجمالي لملاءة '+fmt(policy.milestones.malaa))+
   item('الأصول: مخصص استثماري',parts.assets,'هدف استثماري توضيحي '+fmt(policy.milestones.assets))+
   '</div><p class="rk44-subnote">حصة الأصول '+(p.investedAvailable?'يمكن دراستها دون تنفيذ شراء تلقائي.':'مؤجلة للاستثمار الفعلي حتى استكمال الحماية.')+
   ' المقترح الشهري قابل للتغيير حسب فائضك الحقيقي.</p>'+
   '<details class="rk44-starter-settings"><summary>تعديل الأهداف والنسب والفائض الشهري</summary>'+
   '<form data-rk44-starter-policy><div class="rk44-starter-inputs">'+
   field('monthly','الفائض المتوقع (ريال)',(policy.monthlySurplus/100).toFixed(2))+
   field('targetHilal','هدف الهلال (ريال)',(policy.milestones.hilal/100).toFixed(2))+
   field('targetMalaa','هدف ملاءة (ريال)',(policy.milestones.malaa/100).toFixed(2))+
   field('targetAssets','هدف الأصول (ريال)',(policy.milestones.assets/100).toFixed(2))+'</div>'+
   '<h4>نسب التوزيع من الفائض (المجموع 100%)</h4><div class="rk44-starter-inputs">'+
   field('shareHilal','الهلال %',percent(policy.shares.hilal))+
   field('shareEmergency','طوارئ ملاءة %',percent(policy.shares.malaaEmergency))+
   field('shareSavings','ادخار ملاءة %',percent(policy.shares.malaaSavings))+
   field('shareAssets','الأصول %',percent(policy.shares.assets))+'</div>'+
   '<h4>نسب توزيع الأرباح المحصلة (المجموع 100%)</h4><div class="rk44-starter-inputs">'+
   field('yieldMalaa','ملاءة %',percent(policy.yieldShares.malaa))+
   field('yieldAssets','الأصول %',percent(policy.yieldShares.assets))+'</div>'+
   '<label class="rk44-approval"><input type="checkbox" name="approval" required> أعتمد إعدادات التخطيط دون إيداعات أو تحويلات فعلية.</label>'+
   '<button class="rk44-transfer-primary" type="submit">حفظ سياسة الانطلاقة</button></form></details>'+
   '<div class="rk44-starter-month"><h4>خطة شهر '+safe(p.period)+'</h4>'+
   (p.monthlyHistory.length?
    '<p class="rk44-subnote">سبق اعتماد خطة هذا الشهر بقيمة '+fmt(p.monthlyHistory[0].amount)+'. لا تُغيرها التعديلات الجديدة تلقائيًا.</p>':
    '<form data-rk44-starter-month><label>الفائض الفعلي بعد الخصومات (ريال)'+
    '<input name="actual" type="number" required min="0" step="0.01" value="'+(p.amount/100).toFixed(2)+'"></label>'+
    '<label class="rk44-approval"><input type="checkbox" name="approval" required> راجعت التزاماتي وأوافق على حفظ توزيع مخطط دون أي قيد نقدي.</label>'+
    '<button type="submit" class="rk44-transfer-primary" '+(policy.configured&&p.salaryRegistered?'':'disabled')+
    '>اعتماد خطة الشهر</button></form>')+
   (!p.salaryRegistered?'<p class="rk44-subnote">يلزم تسجيل استلام راتب الشهر في بنك الهلال قبل تثبيت خطة شهرية، ويمكنك حفظ السياسة الآن.</p>':'')+
   '</div></section>';
 }


 function yieldPanel(){
  const policy=adaptive.starterPolicy(db),revenue=adaptive.yieldRecords(db);
  const block=y=>{
   const parts=['malaa','assets'].map(bank=>{
    const requestId=y.transferIds[bank];
    const t=requestId?adaptive.transfers(db).find(x=>x.id===requestId):null;
    const state=t?({pending:'طلب قيد الانتظار',executed:'خرج ولم تصل مطابقته',matched:'مطابق',cancelled:'طلب ملغي'}[t.status]||'طلب مسجل'):'لم يعتمد طلب التحويل';
    const btn=y.status==='recorded'&&!requestId&&y.splitAmounts[bank]>0?
     '<button type="button" data-rk44-yield-split="'+safe(y.id)+'" data-rk44-yield-bank="'+bank+'">اعتماد طلب</button>':
     '<small>'+safe(state)+'</small>';
    return '<div class="rk44-yield-line"><span>'+safe(adaptive.bankNames[bank])+'</span><b>'+fmt(y.splitAmounts[bank])+'</b>'+btn+'</div>';
   }).join('');
   const correction=y.status==='recorded'&&!Object.values(y.transferIds).some(Boolean)?
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
  const keys=['rk44Transfers','rk44Yields','rk44StarterPolicy','rk44StarterMonths','ledgerEntries','audit'];
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
  let data;
  try{data=adaptive.assess(db,activePeriod());}
  catch(err){return previousReserves();}
  const h=data.banks.hilal,m=data.banks.malaa,a=data.banks.assets;
  const hilal=bankCard('hilal','بنك الهلال','التشغيل وامتصاص الأزمات','هدف الحماية المتغير',fmt(h.target),'navy',
   h,[metric('المحجوز داخليًا',fmt(h.recorded),'teal'),
   metric('الفجوة الحالية',fmt(h.gap),h.gap>0?'red':'teal'),
   metric('مدة الحماية',data.policy.hilal+' '+(data.policy.hilal===1?'شهر':'أشهر'),'blue')],null,data);
  const malaa=bankCard('malaa','بنك ملاءة','السيولة والادخار المتاح','احتياطي السيولة المتغير',fmt(m.target),'navy',
   m,[metric('السيولة خلال 3 أيام',fmt(m.recorded),'teal'),
   metric('السيولة الفورية',fmt(m.instant),'blue'),
   metric('نقص التغطية',fmt(m.gap),m.gap>0?'red':'teal')],null,data);
  const assets=bankCard('assets','بنك الأصول','الاستثمارات والقدرة على النمو','قيمة الاستثمارات المسجلة',fmt(a.market),'blue',
   a,[metric('فائض قابل للدراسة الاستثمارية',fmt(a.target),a.target?'teal':'navy'),
   metric('الأصول الاستثمارية',String(data.investment.count),'teal'),
   metric('هامش أمان قبل الاستثمار',fmt(a.safetyBuffer),'gold')],
   'القيمة السوقية ليست رصيدًا فوريًا للسحب',data);
  return '<section class="rk44-screen" aria-label="مركز الحماية والاستثمار">'+
   '<header class="rk44-screen-title"><h2>الاحتياطيات المتغيرة والاستثمار</h2>'+
   hint('يتغير احتياطي الحماية مع المصروفات والأقساط والديون والرسوم المسجلة. الأرصدة مدخلة محليًا، والاستثمارات ليست نقدًا متاحًا فورًا.')+
   '</header>'+
   starterPanel(data)+yieldPanel()+
   '<details class="rk44-advanced"><summary>تفاصيل الحماية الوقائية طويلة المدى وحساباتها</summary><div class="rk44-advanced-body">'+
   '<div class="rk44-topline">'+
   metric('الاحتياج الشهري المحسوب',fmt(data.monthlyNeed),'navy')+
   metric('إجمالي الادخار المسجل',fmt(data.savings.total),'teal')+
   metric('فجوة السيولة الوقائية',fmt(data.gapToProtection),data.gapToProtection?'red':'teal')+'</div>'+
   '<div class="rk44-bank-list">'+hilal+malaa+assets+'</div></div></details>'+
   riskPanel(data)+liquidityPanel(data)+transferPanel(data)+scenarioPanel()+
   '<p class="rk44-caution-note">لا تُنفّذ تحويلات أو مشتريات استثمارية تلقائيًا. تُثبت العمليات بعد المراجعة من صفحات البنوك المعنية. وقد تختلف السيولة الفعلية عن الأرصدة المدخلة حتى تتم المطابقة.</p>'+
   '</section>';
 };
 const originalRender=render;
 render=function(){
  const result=originalRender.apply(this,arguments);
  if(['insights','debts','hilal','malaa','assets','position'].includes(page)){
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
 document.addEventListener('submit',event=>{

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
})();