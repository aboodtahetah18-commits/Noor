/* Rakaez v19 — Salary cycle workspace, consolidation and mobile ergonomics.
   No external transfers are initiated; all monetary amounts are integer halalas. */
(function(){
'use strict';
if(typeof db==='undefined'||typeof v18Ensure!=='function')return;
const bankNames={hilal:'بنك الهلال',malaa:'بنك ملاءة',assets:'بنك الأصول'};
const cycleSteps=['تسوية البنود','الالتزامات','التوزيع الجديد','المراجعة','المتابعة'];
let openedPeriod='',cycleStep=0,loanDraft=null,loanStep=0,loanEditId='';
const nowISO=()=>new Date().toLocaleDateString('en-CA');
const periodShift=(p,n)=>v18PeriodAdd(p,n);
const upcomingPeriod=()=>{const d=new Date(),p=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');return d.getDate()<=Number(db.cycleDay||25)?p:periodShift(p,1)};
const cents=v=>Math.round(Number(v||0)*100);
const cash=v=>money(Number(v||0));
const field=(id,label,value='',type='text',extra='')=>`<div class="v19-field"><label for="${id}">${esc(label)}</label><input type="${type}" id="${id}" value="${esc(value)}" ${extra}></div>`;
const option=(value,label,current)=>`<option value="${esc(value)}" ${String(value)===String(current)?'selected':''}>${esc(label)}</option>`;
const formatDay=period=>`${period}-${String(db.cycleDay||25).padStart(2,'0')}`;
const personTime=()=>new Intl.DateTimeFormat('ar-SA-u-nu-latn',{weekday:'long',hour:'2-digit',minute:'2-digit',hour12:true}).format(new Date());
const note=(s)=>`<p class="v19-help">${s}</p>`;
const persist=(msg,detail)=>{if(msg)audit(msg,detail||openedPeriod);save()};
function ensure(){v18Ensure();if(!Array.isArray(db.rkCyclesV19))db.rkCyclesV19=[];if(!Array.isArray(db.rkSavingsFeesV19))db.rkSavingsFeesV19=[];}
function categorySnapshot(period){
 const old=db.salaryCycles?.find(c=>c.period===period),rows=v18ActiveCategories();
 return rows.map(cat=>{
  const limit=Number(old?.amounts?.[cat.id]??Math.round(Number(cat.limit||0)*100));
  const spent=db.transactions.filter(t=>t.type==='expense'&&t.category===cat.id&&String(t.date).slice(0,7)===period).reduce((s,t)=>s+Number(t.amount||0),0);
  return {categoryId:cat.id,name:cat.name,limit,spent,balance:limit-spent,cover:0,destination:'none',targetId:'',feeRate:0,deficitChoice:'next'};
 });
}
function buildPlan(period){ensure();const previous=periodShift(period,-1);return {
 id:rid(),period,day:db.cycleDay||25,salary:Number(db.salary||0),status:'draft',step:0,createdAt:new Date().toISOString(),closePeriod:previous,
 categories:categorySnapshot(previous),obligations:null,allocations:Object.fromEntries(v18ActiveCategories().map(c=>[c.id,Math.round(Number(c.limit||0)*100)])),
 approvedAt:null,receivedAt:null,tasks:[],ratios:{...db.ratios}
};}
function findPlan(period){ensure();return db.rkCyclesV19.find(c=>c.period===period)}
function getPlan(period,create=true){let p=findPlan(period);if(!p&&create){p=buildPlan(period);db.rkCyclesV19.push(p);persist('إنشاء مسودة دورة راتب',period)}return p}
function feeAmount(f){return f.period==='شهري'||f.period==='monthly'||f.period==='month'?Number(f.amount||0):0}
function scheduledEstimate(x){try{return typeof rkScheduledEstimated==='function'?Number(rkScheduledEstimated(x)||0):Number(x.amount||0)}catch{return Number(x.amount||0)}}
function makeObligations(period){v18Ensure();const rows=[];
 (db.hilalPayments||[]).filter(p=>p.period===period&&p.status!=='paid'&&db.hilalFinancings.some(f=>f.id===p.financingId&&f.status==='active')).forEach(p=>{
  const f=db.hilalFinancings.find(f=>f.id===p.financingId),r=db.hilalRequests.find(r=>r.id===f?.requestId);
  rows.push({id:'hilal:'+p.id,reference:p.id,source:'hilal',bank:'hilal',name:`قسط ${r?.title||'تمويل الهلال'}`,amount:p.amount,kind:'due',included:true,locked:true,dueDate:p.dueDate||formatDay(period)});
 });
 (db.debts||[]).filter(d=>Number(d.principal||0)>Number(d.paid||0)&&Number(d.installment||0)>0).forEach(d=>{
  rows.push({id:'debt:'+d.id,reference:d.id,source:'debt',bank:'hilal',name:`قسط ${d.name}`,amount:Math.min(d.installment,d.principal-d.paid),kind:'debt',included:true,locked:true,dueDate:d.date||formatDay(period)});
 });
 (db.fees||[]).filter(x=>feeAmount(x)>0).forEach(f=>rows.push({id:'fee:'+f.id,reference:f.id,source:'fee',bank: f.bank==='assets'?'assets':f.bank==='malaa'?'malaa':'hilal',name:f.name,amount:feeAmount(f),kind:'fee',included:true,locked:false,dueDate:formatDay(period)}));
 (db.scheduledOps||[]).filter(x=>x.status==='planned'&&scheduledEstimate(x)>0&&(!x.start||String(x.start).slice(0,7)<=period)).forEach(op=>{
  const bank=op.bank==='malaa'?'malaa':op.bank==='assets'?'assets':'hilal';
  rows.push({id:'scheduled:'+op.id,reference:op.id,source:'scheduled',bank,name:op.name,amount:scheduledEstimate(op),kind:'bill',included:true,locked:false,dueDate:op.start||formatDay(period)});
 });
 (db.rkSavingsFeesV19||[]).filter(x=>x.active&&x.startPeriod<=period).forEach(f=>{
   rows.push({id:'savingsfee:'+f.id,reference:f.id,source:'savingsfee',bank:'malaa',name:`رسوم ادخار ${f.name}`,amount:f.monthly,kind:'fee',included:true,locked:false,dueDate:formatDay(period)});
 });
 return rows;
}
function refreshObligations(plan){if(!plan.obligations){plan.obligations=makeObligations(plan.period);return}
 const incoming=makeObligations(plan.period);const old=new Map(plan.obligations.map(x=>[x.id,x]));plan.obligations=incoming.map(x=>{let prev=old.get(x.id);return prev?{...x,included:prev.included,skippedReason:prev.skippedReason||'',done:prev.done||false}:x});
}
function totalO(plan){refreshObligations(plan);return plan.obligations.filter(x=>x.included).reduce((a,x)=>a+x.amount,0)}
function bankSplit(plan){const net=Math.max(0,plan.salary-totalO(plan));const ratios=plan.ratios||db.ratios;
 const h=Math.round(net*Number(ratios.hilal||0)/100),m=Math.round(net*Number(ratios.malaa||0)/100);return {net,hilal:h,malaa:m,assets:net-h-m};}
function deficit(plan){return plan.categories.reduce((a,c)=>a+Math.max(0,-c.balance),0)}
function covered(plan){return plan.categories.reduce((a,c)=>a+Math.min(Math.max(0,c.balance),Math.max(0,Number(c.cover||0))),0)}
function deficitRemaining(plan){return Math.max(0,deficit(plan)-covered(plan))}
function shortagePlan(plan){return plan.categories.filter(c=>c.balance<0).map(c=>({...c,negative:-c.balance}));}
function allocationSum(plan){return Object.values(plan.allocations||{}).reduce((s,n)=>s+Number(n||0),0)}
function routeSurplus(plan){const routes=plan.categories.filter(c=>c.balance>Number(c.cover||0)&&c.destination!=='none').map(c=>({id:rid(),categoryId:c.categoryId,name:c.name,amount:c.balance-Number(c.cover||0),destination:c.destination,targetId:c.targetId,feeRate:Number(c.feeRate||0)}));
 if(!plan.combineSurplus)return routes;const pooled=routes.filter(x=>x.destination==='assets');if(pooled.length<2)return routes;return routes.filter(x=>x.destination!=='assets').concat([{id:rid(),categoryId:'combined',name:'الفوائض المجمعة',amount:pooled.reduce((a,x)=>a+x.amount,0),destination:'assets',targetId:'',feeRate:0,sources:pooled}]);}
function tasksFor(plan){const tasks=[{id:'receipt',name:'تأكيد نزول الراتب',bank:'hilal',amount:plan.salary,kind:'receipt',done:!!plan.receivedAt,required:true}];
 for(const o of plan.obligations.filter(x=>x.included))tasks.push({id:'pay:'+o.id,name:`سداد ${o.name}`,bank:o.bank,amount:o.amount,kind:'obligation',sourceId:o.id,done:false,required:true});
 for(const route of routeSurplus(plan))tasks.push({id:'surplus:'+route.categoryId,name:`ترحيل فائض ${route.name} إلى ${route.destination==='malaa'?'ملاءة':route.destination==='goal'?'هدف في الأصول':'الاستثمار'}`,bank:route.destination==='malaa'?'malaa':'assets',amount:route.amount,kind:'surplus',route,done:false,required:true});
 const splits=bankSplit(plan);tasks.push({id:'bank:hilal',name:'تأكيد مخصص بنك الهلال والبنود',bank:'hilal',amount:splits.hilal,kind:'bank',done:false,required:true});
 tasks.push({id:'bank:malaa',name:'تأكيد تحويل مخصص بنك ملاءة',bank:'malaa',amount:splits.malaa,kind:'bank',done:false,required:true});
 tasks.push({id:'bank:assets',name:'تأكيد تحويل مخصص بنك الأصول',bank:'assets',amount:splits.assets,kind:'bank',done:false,required:true});
 return tasks;
}
function summaryBox(label,value,sub=''){return `<div class="v19-fact"><span>${esc(label)}</span><strong>${value}</strong>${sub?`<small>${esc(sub)}</small>`:''}</div>`}
function statusText(p){return p?.status==='completed'?'مكتملة':p?.status==='approved'?'بانتظار تنفيذ التحويلات':p?.status==='tracking'?'قيد المتابعة':p?.status==='draft'?'مسودة':'لم تبدأ'}
function pageList(){ensure();const current=upcomingPeriod(),plans=db.rkCyclesV19.slice().sort((a,b)=>b.period.localeCompare(a.period));if(!plans.some(p=>p.period===current)){plans.unshift({period:current,day:db.cycleDay||25,salary:db.salary,status:'new'})}
 return `<section class="v19-cycle-page"><header class="v19-section-title"><h2>دورة الراتب</h2><button class="btn primary" data-v19-action="new-cycle">${ico('plus')} دورة جديدة</button></header>
 <div class="v19-cycle-list">${plans.map(p=>`<button class="v19-cycle-list-item" type="button" data-v19-open="${esc(p.period)}"><span><small>تاريخ الدورة</small><strong>${esc(p.period)}-${String(p.day||25).padStart(2,'0')}</strong></span><span><small>الراتب</small><strong>${cash(p.salary)}</strong></span><span><small>حالة الدورة</small><strong>${statusText(p)}</strong></span></button>`).join('')}</div>
 ${note('اضغط على الدورة لفتح مساحة العمل الكاملة. تأكيد السداد والتحويلات يدوي، وليس تنفيذًا مصرفيًا تلقائيًا.')}</section>`;
}
function renderCyclePage(){if(page!=='cycles')return;const view=document.getElementById('view');if(view)view.innerHTML=pageList();}
function drawStep1(plan){const deficits=shortagePlan(plan),availableCoverage=covered(plan),remainder=deficitRemaining(plan);
 return `<div class="v19-step-intro"><h2>تسوية البنود السابقة</h2><p>مراجعة إقفال ${esc(plan.closePeriod)} قبل إنشاء مخصصات الشهر الجديد. لا يتغير الإنفاق التاريخي.</p></div>
 <div class="v19-section-title"><button class="btn" data-v19-action="combine-surpluses" type="button">${ico('trend')} تجميع فوائض البنود للاستثمار</button></div><div class="v19-fact-grid">${summaryBox('إجمالي العجز',cash(deficit(plan)))}${summaryBox('مبلغ التغطية من الفوائض',cash(availableCoverage))}${summaryBox('العجز غير المغطى',cash(remainder))}</div>
 <div class="v19-record-grid">${plan.categories.map(c=>{
  const surplus=c.balance>0,negative=c.balance<0,remaining=c.balance-Number(c.cover||0);return `<article class="v19-record ${negative?'is-negative':surplus?'is-surplus':''}">
  <header><h3>${esc(c.name)}</h3><span class="v19-status ${negative?'is-negative':surplus?'is-positive':''}">${negative?'عجز':surplus?'فائض':'متوازن'}</span></header>
  <div class="v19-mini-grid">${summaryBox('المخصص السابق',cash(c.limit))}${summaryBox('المصروف',cash(c.spent))}${summaryBox('الرصيد',cash(c.balance))}</div>
  ${surplus?`<div class="v19-fields"><div class="v19-field"><label>تغطية عجز بنود أخرى (ر.س)</label><input type="number" min="0" max="${(c.balance/100).toFixed(2)}" step="0.01" value="${(c.cover/100).toFixed(2)}" data-v19-field="cover" data-id="${esc(c.categoryId)}"></div>
  <div class="v19-field"><label>وجهة الفائض المتبقي (${cash(Math.max(0,remaining))})</label><select data-v19-field="destination" data-id="${esc(c.categoryId)}">${[['none','لا ترحيل — إبقاؤه ضمن السيولة'],['malaa','ادخار مرتبط بالبند في بنك ملاءة'],['goal','تغذية هدف مالي في بنك الأصول'],['assets','استثمار مستقل في بنك الأصول']].map(([a,b])=>option(a,b,c.destination)).join('')}</select></div>
  ${c.destination==='goal'?`<div class="v19-field"><label>الهدف المالي</label><select data-v19-field="targetId" data-id="${esc(c.categoryId)}">${option('','اختر الهدف',c.targetId)}${(db.goals||[]).map(g=>option(g.id,g.name,c.targetId)).join('')}</select></div>`:''}
  ${c.destination==='malaa'?`<div class="v19-field"><label>رسوم الاستثمار الشهرية في ملاءة (%) — حسب اتفاقك</label><input type="number" min="0" max="100" step="0.01" data-v19-field="feeRate" data-id="${esc(c.categoryId)}" value="${c.feeRate||0}"></div>`:''}</div>`:negative?`<p class="v19-help">يمكن تغطية العجز من فوائض البنود الأخرى. أي عجز متبقٍ يحتاج إلى اختيار تسوية موثقة أو تخفيض مخصصات الإنفاق القادم.</p><button class="btn" type="button" data-v19-action="loan-deficit" data-id="${esc(c.categoryId)}">${ico('fund')} طلب قرض لمعالجة العجز</button>`:note('البند متوازن ولا يتطلب إجراءً.')}
 </article>`}).join('')}</div>
 <div class="v19-note">${remainder>0?`يوجد عجز غير مغطى بمبلغ ${cash(remainder)}. يجوز إعداد الدورة كمسودة، لكن لا تُعتمد التسوية نهائيًا حتى تتم تغطيته أو تسجيله صراحةً كعجز مرحّل.`:'تمت تغطية كل العجز حسابيًا من الفوائض. فوائض البنود الأخرى لا تُخصم من مخصصات الشهر الجديد إلا بعد اعتماد التوزيع.'}</div>`;
}
function drawStep2(plan){refreshObligations(plan);const due=totalO(plan);
 return `<div class="v19-step-intro"><h2>مراجعة الالتزامات عبر البنوك الثلاثة</h2><p>الأقساط والرسوم والفواتير ذات العلاقة تُراجع قبل توزيع الراتب. يمكنك إيقاف فاتورة ملغاة مع توثيق السبب، ولا يمكن إسقاط قسط قائم دون تسويته.</p></div>
 <div class="v19-fact-grid">${summaryBox('الراتب المخطط',cash(plan.salary))}${summaryBox('الالتزامات المستحقة',cash(due))}${summaryBox('المتاح بعد الالتزامات',cash(plan.salary-due))}</div>
 ${['hilal','malaa','assets'].map(bank=>`<section class="v19-ob-group"><h3>${bankNames[bank]}</h3>${plan.obligations.filter(x=>x.bank===bank).map(x=>`<div class="v19-ob-row"><div><strong>${esc(x.name)}</strong><small>${esc(x.dueDate||'')} · ${esc(x.kind==='bill'?'فاتورة/عملية مجدولة':x.kind==='fee'?'رسوم': 'قسط أو التزام')}</small></div><b>${cash(x.amount)}</b>${x.locked?`<span class="v19-status">التزام قائم</span>`:`<label class="v19-toggle"><input type="checkbox" data-v19-ob="${esc(x.id)}" ${x.included?'checked':''}> مستحق</label>`}</div>`).join('')||'<p class="v19-muted">لا توجد التزامات مسجلة لهذا البنك.</p>'}</section>`).join('')}
 ${note('إلغاء احتساب فاتورة من هذه الدورة لا يحذف سجلها الأصلي، ولا يمثل إثبات سداد. تحتاج الالتزامات القائمة إلى تسوية منفصلة.')}`;
}
function drawStep3(plan){const split=bankSplit(plan),total=allocationSum(plan);
 return `<div class="v19-step-intro"><h2>التوزيع الجديد من الصفر</h2><p>يبدأ كل بند بمخصص جديد للمستقبل فقط، دون نقل المصروفات القديمة إلى الشهر الجديد. تُخصم الالتزامات أولًا ثم توزّع المبالغ على البنوك.</p></div>
 <div class="v19-fact-grid">${summaryBox('الراتب',cash(plan.salary))}${summaryBox('الالتزامات المحجوزة',cash(totalO(plan)))}${summaryBox('الصافي للتوزيع',cash(split.net))}</div>
 <section class="v19-ob-group"><h3>التوزيع بين البنوك</h3><div class="v19-three-banks">${Object.keys(bankNames).map(bank=>`<div>${ico(bank==='hilal'?'moon':bank==='malaa'?'shield':'trend')}<span>${bankNames[bank]} (${Number(plan.ratios?.[bank]||0)}%)</span><strong>${cash(split[bank])}</strong></div>`).join('')}</div></section>
 <section class="v19-ob-group"><div class="v19-section-title"><h3>بنود الهلال الشهر الجديد</h3><button class="btn" type="button" data-v19-action="reset-allocations">${ico('refresh')} إعادة توزيع مقترح</button></div>
 <div class="v19-alloc-grid">${v18ActiveCategories().map(c=>`<div class="v19-field"><label>${esc(c.name)}</label><input type="number" data-v19-allocation="${esc(c.id)}" min="0" step="0.01" value="${(Number(plan.allocations[c.id]||0)/100).toFixed(2)}"></div>`).join('')}</div>
 <div class="v19-total ${total>split.hilal?'is-negative':''}"><span>إجمالي البنود</span><strong>${cash(total)}</strong><span>المتاح للهلال بعد الالتزامات: ${cash(split.hilal)}</span></div>
 ${total<split.hilal?note(`يتبقى ${cash(split.hilal-total)} احتياطيًا تشغيليًا غير موزّع، وليس مصروفًا.`):''}
 </section>`;
}
function drawStep4(plan){const split=bankSplit(plan),needs=deficitRemaining(plan),over=allocationSum(plan)>split.hilal;
 return `<div class="v19-step-intro"><h2>المعاينة والاعتماد</h2><p>راجع جميع الأرقام قبل إقفال البنود القديمة واعتماد توزيع الشهر الجديد. القيم المخصصة ليست تحويلات مصرفية منفذة.</p></div>
 <section class="v19-review">
 ${[['الدورة الجديدة',`${plan.period}-${String(plan.day||25).padStart(2,'0')}`],['الفترة السابقة',plan.closePeriod],['إجمالي الراتب',cash(plan.salary)],['فائض البنود المرحّل',cash(routeSurplus(plan).reduce((n,x)=>n+x.amount,0))],['عجز يحتاج إلى تسوية',cash(needs)],['الالتزامات',cash(totalO(plan))],['المتاح بعد الالتزامات',cash(split.net)],['بنك الهلال',cash(split.hilal)],['مخصص البنود الجديدة',cash(allocationSum(plan))],['بنك ملاءة',cash(split.malaa)],['بنك الأصول',cash(split.assets)]].map(([key,val])=>`<div><span>${esc(key)}</span><strong>${val}</strong></div>`).join('')}
 </section>
 ${needs>0?`<p class="v19-warning">العجز السابق غير المغطى ${cash(needs)} سيبقى ظاهرًا كعجز مرحّل، ولا نعتبره مسددًا. قبل إتمام التسوية أنشئ تمويلًا معتمدًا أو غطّه من الفوائض.</p>`:''}
 ${over?`<p class="v19-warning">توزيع بنود الهلال يتجاوز المبلغ المتاح بقيمة ${cash(allocationSum(plan)-split.hilal)}.</p>`:''}
 <div class="v19-review-actions"><button type="button" class="btn primary v19-wide" data-v19-action="approve" ${over||plan.salary<totalO(plan)?'disabled':''}>${ico('check')} اعتماد الدورة وبناء قائمة المتابعة</button></div>
 ${note('الاعتماد يثبت المخصصات والخطة فقط. يجب تأكيد نزول الراتب والتحويلات والسدادات يدويًا في المرحلة التالية.')}`;
}
function drawStep5(plan){return `<div class="v19-step-intro"><h2>المتابعة بعد نزول الراتب</h2><p>يبقى النظام معك حتى تتحقق من استلام الراتب، وسداد كل التزام، وتحويل مخصص كل بنك. يمكن تأكيد الخطوات واحدةً تلو الأخرى.</p></div>
 <div class="v19-fact-grid">${summaryBox('المهام المكتملة',String(plan.tasks.filter(x=>x.done).length))}${summaryBox('جميع المهام',String(plan.tasks.length))}${summaryBox('حالة الدورة',statusText(plan))}</div>
 <div class="v19-task-list">${plan.tasks.map((t,i)=>`<div class="v19-task ${t.done?'is-done':''}"><span class="v19-task-no">${String(i+1).padStart(2,'0')}</span><div><strong>${esc(t.name)}</strong><small>${bankNames[t.bank]||'المتابعة'} · ${cash(t.amount)}</small></div><button type="button" class="btn ${t.done?'':'primary'}" data-v19-action="confirm-task" data-id="${esc(t.id)}" ${t.done?'disabled':''}>${t.done?'تم التأكيد':'تأكيد التنفيذ'}</button></div>`).join('')}</div>
 ${note('لا تُرسل المنصة تحويلات بنكية، ولا تخصم الحسابات تلقائيًا. التأكيد يوثق أن الإجراء تم خارج المنصة.')}`;
}
function cycleShell(){const plan=getPlan(openedPeriod);if(!plan)return;const ready=plan.status!=='draft',idx=ready?4:cycleStep;
 const content=[drawStep1,drawStep2,drawStep3,drawStep4,drawStep5][idx](plan);
 document.getElementById('modalRoot').innerHTML=`<div class="v19-workspace-bg" role="presentation"><section class="v19-workspace" role="dialog" aria-modal="true" aria-label="دورة الراتب"><header class="v19-workspace-header"><button type="button" data-v19-action="close-cycle" class="v19-close" aria-label="إغلاق">${ico('close')}</button><div><h1>دورة الراتب ${esc(plan.period)}</h1><p>التاريخ ${esc(formatDay(plan.period))} · ${statusText(plan)}</p></div></header>
 <nav class="v19-progress">${cycleSteps.map((s,i)=>`<button type="button" class="${i===idx?'active':''} ${i<idx?'done':''}" data-v19-step="${i}" ${ready&&i!==4?'disabled':''}>${i+1}. ${s}</button>`).join('')}</nav><main class="v19-workspace-main">${content}</main>
 <footer class="v19-workspace-footer"><button type="button" class="btn" data-v19-action="previous" ${idx===0||ready?'disabled':''}>${ico('back')} السابق</button><button type="button" class="btn v19-save" data-v19-action="save-cycle">${ico('check')} حفظ المسودة</button><button type="button" class="btn primary" data-v19-action="next" ${idx===3||ready?'disabled':''}>التالي ${ico('forward')}</button></footer></section></div>`;
 const scroller=document.querySelector('.v19-workspace-main');if(scroller)scroller.scrollTop=0;
}
function openCycle(period){openedPeriod=period||upcomingPeriod();let p=getPlan(openedPeriod);if(p.status==='draft')cycleStep=Number(p.step||0);else cycleStep=4;cycleShell()}
function fieldValue(selector){return document.querySelector(selector)?.value||''}
function saveEdits(){const plan=getPlan(openedPeriod);if(!plan||plan.status!=='draft')return;
 plan.step=cycleStep;persist('حفظ مسودة دورة',openedPeriod);}
function canNext(plan){if(cycleStep===0){
 const totalCovered=covered(plan),totalDeficit=deficit(plan);
 if(totalCovered>totalDeficit){alert('تغطية العجز من الفوائض أكبر من العجز الفعلي. خفّض مبالغ التغطية.');return false}
 for(const c of plan.categories){if(c.balance>0&&(c.cover<0||c.cover>c.balance)){alert('مبلغ التغطية أكبر من فائض البند '+c.name);return false}if(c.destination==='goal'&&c.balance>c.cover&&!db.goals.some(g=>g.id===c.targetId)){alert('حدد هدفًا ماليًا صحيحًا لبند '+c.name);return false}}
 }else if(cycleStep===1){if(totalO(plan)>plan.salary){alert('الالتزامات تتجاوز الراتب. راجعها قبل الانتقال إلى التوزيع.');return false}
 }else if(cycleStep===2){const split=bankSplit(plan);if(allocationSum(plan)>split.hilal){alert('مجموع مخصصات البنود يتجاوز نصيب الهلال بعد الالتزامات.');return false}}
 return true;
}
function approveCycle(){const plan=getPlan(openedPeriod);if(!plan||plan.status!=='draft')return;
 if(totalO(plan)>plan.salary||allocationSum(plan)>bankSplit(plan).hilal)return alert('التوزيع غير متوازن. راجع الالتزامات والمخصصات.');
 if(deficitRemaining(plan)>0){const ok=confirm(`يوجد عجز سابق غير مغطى قدره ${cash(deficitRemaining(plan))}. سيبقى عجزًا مرحلًا ظاهرًا ولن يُعتبر مسددًا. هل تريد اعتماد توزيع الشهر الجديد مع إبقاء العجز مفتوحًا؟`);if(!ok)return}
 if(!confirm('اعتماد خطة الدورة وتحديث مخصصات البنود الجديدة؟ لن يجري النظام أي تحويل أو خصم مصرفي.'))return;
 const latest=makeObligations(plan.period),newIds=latest.filter(x=>x.locked).map(x=>x.id),oldIds=plan.obligations.filter(x=>x.included&&x.locked).map(x=>x.id);
 if(newIds.some(id=>!oldIds.includes(id)))return alert('ظهرت التزامات جديدة. راجع مرحلة الالتزامات قبل اعتماد الدورة.');
 if(!Array.isArray(db.salaryCycles))db.salaryCycles=[];
 let old=db.salaryCycles.find(c=>c.period===plan.period);if(old?.approved)return alert('سبق اعتماد دورة الشهر بهذه الفترة في السجل القديم. راجعها أولاً.');
 for(const c of v18ActiveCategories())c.limit=Number(((plan.allocations[c.id]||0)/100).toFixed(2));
 db.salaryCycles=db.salaryCycles.filter(c=>c.period!==plan.period);
 db.salaryCycles.push({period:plan.period,day:plan.day,amounts:{...plan.allocations},approved:true,approvedAt:new Date().toISOString(),origin:'v19'});
 db.salary=plan.salary;plan.approvedAt=new Date().toISOString();plan.status='tracking';plan.tasks=tasksFor(plan);plan.ratios={...plan.ratios};
 persist('اعتماد خطة دورة الراتب',plan.period);cycleStep=4;cycleShell();toast('اعتمدت الدورة. ابدأ تأكيد الإجراءات بعد نزول الراتب.');
}
function confirmTask(id){const plan=getPlan(openedPeriod),task=plan?.tasks.find(t=>t.id===id);if(!task||task.done)return;
 if(id!=='receipt'&&!plan.receivedAt)return alert('أكد نزول الراتب أولًا، ثم تابع إجراءات التوزيع والسداد.');
 if(!confirm(`هل تم فعليًا: ${task.name} (${cash(task.amount)})؟ هذا تسجيل تأكيد يدوي.`))return;
 if(task.kind==='receipt'){plan.receivedAt=new Date().toISOString();if(!db.salaryMonths.includes(plan.period))db.salaryMonths.push(plan.period)}
 else if(task.kind==='obligation'){
  const ob=plan.obligations.find(x=>x.id===task.sourceId);
  if(ob?.source==='hilal'){
   const pay=db.hilalPayments.find(x=>x.id===ob.reference);if(pay&&pay.status!=='paid'){pay.status='paid';pay.paidAt=new Date().toISOString();let f=db.hilalFinancings.find(f=>f.id===pay.financingId);if(f&&v18Paid(f.id)>=f.total)f.status='closed'}
  }else if(ob?.source==='debt'){
   const debt=db.debts.find(x=>x.id===ob.reference);if(debt)debt.paid=Math.min(Number(debt.principal||0),Number(debt.paid||0)+ob.amount);
  }
  if(ob)ob.done=true;
 }else if(task.kind==='surplus'){
  const route=task.route;
  if(route.destination==='malaa'){
   const targetId='v19-surplus-'+route.categoryId;let target=(db.savings||[]).find(s=>s.id===targetId);if(!target){target={id:targetId,name:'ادخار فائض - '+route.name,days:0,balance:0,rate:0};db.savings.push(target)}target.balance=Number(target.balance||0)+route.amount;
   if(route.feeRate>0){db.rkSavingsFeesV19.push({id:rid(),name:route.name,monthly:Math.round(route.amount*route.feeRate/100),active:true,startPeriod:periodShift(plan.period,1)});}
  }else if(route.destination==='goal'){
   const goal=db.goals.find(x=>x.id===route.targetId);if(goal)goal.saved=Number(goal.saved||0)+route.amount;
  }
 }
 task.done=true;task.confirmedAt=new Date().toISOString();
 plan.status=plan.tasks.every(x=>x.done)?'completed':'tracking';persist('تأكيد مهمة دورة',`${plan.period}: ${task.name}`);cycleShell();toast('تم تسجيل التأكيد');
}
function legacySummary(){return `<div class="v19-header-clock" id="v19Clock" aria-label="الوقت الحالي">${esc(personTime())}</div>`}
function addClock(){let existing=document.getElementById('v19Clock');if(page==='insights'||page==='overview'){
 if(!existing){document.getElementById('pageTitle')?.insertAdjacentHTML('afterend',legacySummary())}
 else existing.textContent=personTime();
 }else existing?.remove();}
function loanPreview(){if(!loanDraft)return '';let d=loanDraft,amt=cents(d.amount||0),rate=Number(d.rate||0),months=Math.max(1,Number(d.months||1)),profit=Math.round(amt*rate/100),fee=cents(d.fee||0),total=amt+profit+fee,inst=Math.ceil(total/months),previous=periodShift(iso(new Date()).slice(0,7),-1),spentLast=db.transactions.filter(t=>t.type==='expense'&&t.category===d.categoryId&&String(t.date).startsWith(previous)).reduce((s,x)=>s+x.amount,0),cat=db.categories.find(c=>c.id===d.categoryId),surplus=cat?Math.round(Number(cat.limit||0)*100)-spentLast:null;
 return `<div class="v19-step-intro"><h2>المعاينة المالية قبل الحفظ</h2><p>هذا طلب قرض من بنك الهلال. اختيار البند للتحليل فقط، ولا يُخصم منه مبلغ القرض أو يُزاد مخصصه.</p></div><section class="v19-review">${[['سبب القرض',d.name||'—'],['البند المرتبط',cat?.name||'—'],['قيمة القرض',cash(amt)],['الإنفاق على البند الشهر الماضي',cash(spentLast)],['الفائض المتوقع قياسًا بالشهر السابق',surplus==null?'—':cash(surplus)],['هامش الربح الإجمالي',`${rate}%`],['هامش الربح',cash(profit)],['الرسوم الإدارية',cash(fee)],['إجمالي السداد',cash(total)],['القسط التقريبي',cash(inst)],['عدد الأقساط',`${months} شهر`]].map(([k,v])=>`<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}</section>${note('المعاينة تقديرية مبنية على المدخلات والإنفاق المسجل، ولا تمثل عرضًا مصرفيًا ملزمًا. لا يؤثر الطلب على مخصص البند المحدد.')}`;
}
function loanModal(){if(!loanDraft)return;const d=loanDraft;
 const body=loanStep===0?`<div class="v19-step-intro"><h2>لماذا تحتاج القرض؟</h2><p>اختر البند للتحليل فقط. القرض مستقل تمامًا عن مخصصه الشهري.</p></div><div class="v19-form-grid">${field('v19LoanName','سبب القرض',d.name,'text','required maxlength="120"')}<div class="v19-field"><label for="v19LoanCat">البند المرتبط</label><select id="v19LoanCat">${option('','اختر البند',d.categoryId)}${v18ActiveCategories().map(c=>option(c.id,c.name,d.categoryId)).join('')}</select></div>${field('v19LoanAmount','مبلغ القرض المطلوب (ر.س)',d.amount,'number','min="0.01" step="0.01"')}${field('v19LoanDate','تاريخ الطلب',d.date,'date')}${field('v19LoanNotes','تفاصيل السبب',d.notes)}</div>`:
 loanStep===1?`<div class="v19-step-intro"><h2>التكلفة وجدولة السداد</h2><p>راجع تكلفة التمويل وتأثير القسط على الراتب قبل اتخاذ القرار.</p></div><div class="v19-form-grid">${field('v19LoanRate','هامش الربح الإجمالي (%)',d.rate,'number','min="0" max="100" step="0.01"')}${field('v19LoanMonths','عدد الأقساط الشهرية',d.months,'number','min="1" max="120" step="1"')}${field('v19LoanFee','الرسوم الإدارية لمرة واحدة (ر.س)',d.fee,'number','min="0" step="0.01"')}${field('v19LoanStart','أول دورة سداد',d.start,'month')}</div>${note('هامش الربح نسبة إجمالية على أصل التمويل وليس معدلًا سنويًا. يمكن تعديل القيم قبل الحفظ.')}`:loanPreview();
 document.getElementById('modalRoot').innerHTML=`<div class="v19-workspace-bg" role="presentation"><section class="v19-workspace v19-loan-workspace" role="dialog" aria-modal="true" aria-label="طلب قرض"><header class="v19-workspace-header"><button class="v19-close" type="button" data-v19-action="close-loan" aria-label="إغلاق">${ico('close')}</button><div><h1>${loanEditId?'تعديل طلب القرض':'طلب قرض جديد'}</h1><p>الممول: بنك الهلال · ${loanStep+1} من 3</p></div></header><nav class="v19-progress">${['سبب القرض والبند','التكلفة والأقساط','المعاينة'].map((x,i)=>`<span class="${loanStep===i?'active':''}">${i+1}. ${x}</span>`).join('')}</nav><main class="v19-workspace-main">${body}</main><footer class="v19-workspace-footer ${loanStep===2?'v19-loan-final':''}">${loanStep===2?`<button class="btn primary v19-wide" type="button" data-v19-action="loan-save">${ico('check')} حفظ الطلب بعد المراجعة</button>`:`<button class="btn" type="button" data-v19-action="loan-prev" ${loanStep===0?'disabled':''}>السابق</button><button class="btn v19-save" type="button" disabled>حفظ</button><button class="btn primary" type="button" data-v19-action="loan-next">التالي</button>`}</footer></section></div>`;
}
function readLoanFields(){if(!loanDraft)return true;
 if(loanStep===0){loanDraft.name=fieldValue('#v19LoanName').trim();loanDraft.categoryId=fieldValue('#v19LoanCat');loanDraft.amount=fieldValue('#v19LoanAmount');loanDraft.date=fieldValue('#v19LoanDate');loanDraft.notes=fieldValue('#v19LoanNotes');
  if(!loanDraft.name||!db.categories.some(c=>c.id===loanDraft.categoryId)||!(Number(loanDraft.amount)>0)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(loanDraft.date)){alert('أدخل سبب القرض والبند والمبلغ وتاريخ الطلب.');return false}
 }else if(loanStep===1){loanDraft.rate=fieldValue('#v19LoanRate');loanDraft.months=fieldValue('#v19LoanMonths');loanDraft.fee=fieldValue('#v19LoanFee');loanDraft.start=fieldValue('#v19LoanStart');
  if(!Number.isFinite(Number(loanDraft.fee))||Number(loanDraft.fee)<0||Number(loanDraft.fee)>100000000||!Number.isFinite(Number(loanDraft.rate))||Number(loanDraft.rate)<0||Number(loanDraft.rate)>100||!Number.isInteger(Number(loanDraft.months))||Number(loanDraft.months)<1||Number(loanDraft.months)>120||!/^\d{4}-(0[1-9]|1[0-2])$/.test(loanDraft.start)){alert('راجع الهامش ومدة السداد وتاريخ أول قسط.');return false}
 }return true;
}
function openLoan(id=''){v18Ensure();const r=db.hilalRequests.find(x=>x.id===id);if(r&&r.financeId)return alert('لا يمكن تعديل قرض ممول من هذا النموذج.');
 loanEditId=id;loanStep=0;loanDraft={name:r?.title||'',categoryId:r?.categoryId||'',amount:r?String(r.amount/100):'',date:r?.date||iso(new Date()),notes:r?.notes||'',rate:String(r?.draftRate??5),fee:String((r?.draftFee??0)/100),months:String(r?.draftMonths??5),start:r?.draftStart||periodShift(iso(new Date()).slice(0,7),1)};loanModal();
}
function saveLoan(){if(!loanDraft)return;const d=loanDraft;if(!d.name||!d.categoryId||Number(d.amount)<=0)return alert('بيانات القرض ناقصة');
 const amount=cents(d.amount);let old=db.hilalRequests.find(r=>r.id===loanEditId);
 if(old&&old.financeId)return alert('لا يمكن تعديل قرض معتمد.');
 if(old)Object.assign(old,{title:d.name,categoryId:d.categoryId,amount,date:d.date,notes:d.notes,draftRate:Number(d.rate),draftFee:cents(d.fee||0),draftMonths:Number(d.months),draftStart:d.start,status:'pending',requestType:'loan'});
 else db.hilalRequests.push({id:rid(),title:d.name,categoryId:d.categoryId,amount,date:d.date,notes:d.notes,draftRate:Number(d.rate),draftFee:cents(d.fee||0),draftMonths:Number(d.months),draftStart:d.start,status:'pending',financeId:null,executedAt:null,requestType:'loan'});
 v18Tab='requests';persist(loanEditId?'تعديل طلب قرض':'إضافة طلب قرض',d.name);loanDraft=null;loanEditId='';closeModal();render();toast('تم حفظ طلب القرض للمراجعة');
}
const originalAmounts=v18OfferAmounts;
v18OfferAmounts=function(){const quote=originalAmounts();if(!quote)return quote;const val=Number(document.getElementById('v19FinanceFee')?.value||0);if(!Number.isFinite(val)||val<0||val>100000000)return null;const fee=cents(val);return {...quote,fee,total:quote.total+fee}};
const originalUpdateRecords=v18UpdateRecords;
v18UpdateRecords=function(kind,id,form){const fee=kind==='finance'?cents(form?.querySelector('#v19FinanceFee')?.value||0):0;const before=new Set((db.hilalFinancings||[]).map(f=>f.id));originalUpdateRecords(kind,id,form);if(kind==='finance'){const req=db.hilalRequests.find(x=>x.id===id),fin=db.hilalFinancings.find(x=>x.requestId===req?.id&&!before.has(x.id));if(fin){fin.fee=fee;save()}}};
const originalOffer=v18FinanceOffer;
v18FinanceOffer=function(id){const r=db.hilalRequests.find(x=>x.id===id);originalOffer(id);if(!r)return;
 const rate=document.getElementById('v18Rate'),months=document.getElementById('v18Months'),start=document.getElementById('v18Start');
 if(start&&!document.getElementById('v19FinanceFee'))start.closest('.field')?.insertAdjacentHTML('afterend','<div class="field"><label for="v19FinanceFee">رسوم التمويل الإدارية (ر.س)</label><input id="v19FinanceFee" type="number" min="0" step="0.01" value="'+(Number(r.draftFee||0)/100)+'"></div>');
 if(rate&&r.draftRate!=null)rate.value=r.draftRate;if(months&&r.draftMonths!=null)months.value=r.draftMonths;if(start&&r.draftStart)start.value=r.draftStart;
 if(typeof v18UpdateOfferPreview==='function')v18UpdateOfferPreview();sanitizeOldModal();
};
function sanitizeOldModal(){const modal=document.querySelector('#modalRoot .v18-modal');if(!modal)return;
 const head=modal.querySelector('.v3header');if(head){head.querySelectorAll('button').forEach(b=>{if(!b.matches('[data-v18-close]'))b.remove()});const close=head.querySelector('[data-v18-close]');if(close){close.innerHTML=ico('close');close.setAttribute('title','إغلاق');head.prepend(close)}}
 const foot=modal.querySelector('.v18-footer');foot?.querySelectorAll('button').forEach(b=>{b.textContent=b.textContent.trim()||'حفظ';});
}
const originalModal=v18Modal;
v18Modal=function(){originalModal.apply(this,arguments);sanitizeOldModal()};
v18RequestModal=openLoan;
function loansView(){v18Ensure();const rows=db.hilalRequests.slice().reverse(),finances=db.hilalFinancings.slice().reverse();
 return `<div class="v19-section-title"><div><h2>القروض والتمويل</h2><p>طلب القرض وتكاليفه واعتماده ومتابعة سداده في مكان واحد</p></div><button type="button" class="btn primary" data-v19-action="new-loan">${ico('plus')} طلب قرض</button></div>
 <div class="v19-cards">${rows.map(r=>{let f=db.hilalFinancings.find(x=>x.requestId===r.id),cat=db.categories.find(x=>x.id===r.categoryId);return `<article class="card v19-loan-card"><header><h3>${esc(r.title)}</h3>${v18Tag(r.status)}</header><div class="v19-mini-grid">${summaryBox('مبلغ القرض',cash(r.amount))}${summaryBox('البند المرجعي',esc(cat?.name||'غير محدد'))}${summaryBox('نوع الطلب','قرض مستقل')}</div>${note('البند للمرجعية والتحليل فقط، ولا يُخصم منه مبلغ القرض.')}
 <div class="v19-card-actions"><button class="btn" type="button" data-v18-action="request-details" data-v18-id="${esc(r.id)}">${ico('view')} التفاصيل</button>${r.status==='pending'?`<button class="btn primary" type="button" data-v18-action="offer" data-v18-id="${esc(r.id)}">${ico('fund')} عرض التمويل</button><button class="btn" type="button" data-v19-action="edit-loan" data-id="${esc(r.id)}">${ico('edit')} تعديل</button>`:''}${r.status==='pending'?`<button class="btn warn" type="button" data-v18-action="delete-request" data-v18-id="${esc(r.id)}">${ico('delete')} حذف</button>`:''}${f?.status==='active'&&r.status==='approved'?`<button class="btn primary" type="button" data-v18-action="execute-request" data-v18-id="${esc(r.id)}">${ico('check')} تأكيد الصرف</button>`:''}</div></article>`}).join('')||'<section class="card v19-empty">لا توجد طلبات قروض. أضف طلبًا لعرض التمويل والتكاليف.</section>'}</div>
 ${finances.length?`<div class="v19-section-title"><h2>التمويلات المعتمدة</h2></div><div class="v19-cards">${finances.map(f=>{const request=db.hilalRequests.find(x=>x.id===f.requestId);const paid=v18Paid(f.id);return `<article class="card v19-loan-card"><header><h3>${esc(request?.title||'تمويل')}</h3>${v18Tag(f.status)}</header><div class="v19-mini-grid">${summaryBox('أصل التمويل',cash(f.principal))}${summaryBox('المتبقي',cash(Math.max(0,f.total-paid)))}${summaryBox('إجمالي السداد',cash(f.total))}</div>${Number(f.fee||0)>0?`<p class="v19-help">الرسوم الإدارية: ${cash(f.fee)}</p>`:''}<div class="v19-card-actions"><button class="btn primary" type="button" data-v18-action="finance-details" data-v18-id="${esc(f.id)}">${ico('calendar')} جدول السداد</button>${f.status==='active'?`<button class="btn" type="button" data-v18-action="reschedule" data-v18-id="${esc(f.id)}">${ico('refresh')} إعادة الجدولة</button>`:''}</div></article>`}).join('')}</div>`:''}`;
}
function trackingView(){v18Ensure();const today=iso(new Date()),pay=db.hilalPayments.filter(p=>p.status!=='paid'&&db.hilalFinancings.some(f=>f.id===p.financingId&&f.status==='active')).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)),cycles=db.rkCyclesV19||[],current=cycles.slice().sort((a,b)=>b.period.localeCompare(a.period))[0];
 return `<div class="v19-section-title"><div><h2>المتابعة والتنفيذ</h2><p>متابعة عمليات الراتب والتمويل والفواتير؛ لا تكرار لقائمة التمويلات</p></div><button type="button" class="btn" data-v19-action="go-cycle">${ico('calendar')} دورة الراتب</button></div>
 ${current?`<section class="card v19-overview-card"><h3>آخر دورة: ${esc(current.period)}</h3><p>الحالة: ${statusText(current)}</p><div class="v19-mini-grid">${summaryBox('الراتب',cash(current.salary))}${summaryBox('مكتمل',`${current.tasks?.filter(t=>t.done).length||0} مهام`)}${summaryBox('قيد التنفيذ',`${current.tasks?.filter(t=>!t.done).length||0} مهام`)}</div><button class="btn primary v19-wide" type="button" data-v19-open="${esc(current.period)}">فتح المتابعة</button></section>`:''}
 <section class="card"><h3>الأقساط القادمة</h3>${pay.length?pay.map(p=>{const f=db.hilalFinancings.find(x=>x.id===p.financingId),req=db.hilalRequests.find(x=>x.id===f?.requestId);return `<div class="v19-ob-row"><div><strong>${esc(req?.title||'قرض')}</strong><small>${esc(p.dueDate)} ${p.dueDate<today?'· متأخر':''}</small></div><b>${cash(p.amount)}</b><button class="btn primary" type="button" data-v18-action="pay-installment" data-v18-id="${esc(p.id)}">تأكيد السداد</button></div>`}).join(''):'<p class="v19-muted">لا توجد أقساط غير مسددة.</p>'}</section>`;
}
function budgetView(){
 const snapshot=db.salaryCycles?.find(x=>x.period===month&&x.approved);if(!snapshot)return v18Budgets();
 const originals=db.categories;
 try{db.categories=originals.map(c=>({...c,limit:Object.prototype.hasOwnProperty.call(snapshot.amounts||{},c.id)?Number(snapshot.amounts[c.id]||0)/100:c.limit}));
 return v18Budgets().replace('البنود الشهرية فقط، دون تحميل الطلبات الاستثنائية عليها','المخصصات التاريخية المعتمدة محفوظة؛ أي تعديل جديد يُطبق على إعدادات الدورات القادمة');
 }finally{db.categories=originals}
}
function hilalView(){v18Ensure();const normalized=v18Tab==='requests'||v18Tab==='finances'?'loans':v18Tab;v18Tab=normalized;
 const tabs=[['budgets','البنود','list'],['loans','القروض والتمويل','fund'],['tracking','المتابعة','calendar']];
 return `<div class="v18-hilal v19-hilal"><div class="v18-hero"><div><h2>بنك الهلال التشغيلي</h2><p>البنود الشهرية والقروض ومتابعة التنفيذ</p></div></div><nav class="v19-hilal-tabs" aria-label="أقسام بنك الهلال">${tabs.map(([id,label,icon])=>`<button type="button" data-v18-tab="${id}" class="${v18Tab===id?'is-active':''}">${ico(icon)}<span>${label}</span></button>`).join('')}</nav>${normalized==='loans'?loansView():normalized==='tracking'?trackingView():budgetView()}</div>`;
}
hilal=hilalView;
// Route the cycle menu to a compact entry; the complete workflow opens in a full-screen workspace.
v14CycleView=pageList;
const previousRender=render;
render=function(){previousRender();if(page==='cycles')renderCyclePage();addClock();};
const originalHilalAction=v18Action;
v18Action=function(action,id){if(action==='new-request')return openLoan();if(action==='edit-request')return openLoan(id);if(action==='go-cycle')return navigate('cycles');return originalHilalAction(action,id)};
function performAction(action,id){const plan=openedPeriod?getPlan(openedPeriod,false):null;
 switch(action){
  case 'new-cycle':{const proposed=upcomingPeriod(),answer=prompt('حدد شهر الدورة الجديدة (YYYY-MM)',proposed);if(!answer)return;if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(answer))return alert('أدخل شهرًا صحيحًا.');return openCycle(answer)}
  case 'close-cycle':saveEdits();openedPeriod='';closeModal();render();return;
  case 'save-cycle':saveEdits();toast(plan?.status==='draft'?'تم حفظ المسودة':'خطة الدورة محفوظة');return;
  case 'next':if(plan&&canNext(plan)&&cycleStep<3){cycleStep++;saveEdits();cycleShell()}return;
  case 'previous':if(plan&&cycleStep>0){cycleStep--;saveEdits();cycleShell()}return;
  case 'combine-surpluses':if(!plan||plan.status!=='draft')return;plan.combineSurplus=true;plan.categories.forEach(c=>{if(c.balance>c.cover&&c.destination==='none')c.destination='assets'});persist('تجميع فوائض البنود للاستثمار');cycleShell();return;
  case 'reset-allocations':if(!plan||plan.status!=='draft')return;if(!confirm('إعادة مخصصات البنود الحالية كاقتراح توزيع؟'))return;plan.allocations=Object.fromEntries(v18ActiveCategories().map(c=>[c.id,cents(c.limit)]));persist('إعادة اقتراح التوزيع');cycleShell();return;
  case 'approve':return approveCycle();
  case 'confirm-task':return confirmTask(id);
  case 'loan-deficit':{if(!plan)return;const cat=plan.categories.find(x=>x.categoryId===id);v18Tab='loans';closeModal();page='hilal';render();openLoan();if(loanDraft&&cat){loanDraft.name='تغطية عجز '+cat.name;loanDraft.categoryId=id;loanDraft.amount=String(Math.max(0,-cat.balance)/100);loanModal()}return}
  case 'new-loan':return openLoan();case 'edit-loan':return openLoan(id);
  case 'go-cycle':return navigate('cycles');
  case 'close-loan':loanDraft=null;loanEditId='';closeModal();return;
  case 'loan-prev':if(loanStep>0){loanStep--;loanModal()}return;
  case 'loan-next':if(readLoanFields()&&loanStep<2){loanStep++;loanModal()}return;
  case 'loan-save':if(loanStep===2)return saveLoan();return;
 }
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-v19-action]');if(button){event.preventDefault();performAction(button.dataset.v19Action,button.dataset.id||'');return}
 const open=event.target.closest('[data-v19-open]');if(open){event.preventDefault();openCycle(open.dataset.v19Open);return}
 const step=event.target.closest('[data-v19-step]');if(step&&openedPeriod){const p=getPlan(openedPeriod);const index=Number(step.dataset.v19Step);if(p.status==='draft'&&index<=3){if(index<=cycleStep||(index===cycleStep+1&&canNext(p))){cycleStep=index;saveEdits();cycleShell()}}}
});
document.addEventListener('input',event=>{if(event.target.matches('#v19FinanceFee'))v18UpdateOfferPreview()});
document.addEventListener('change',event=>{
 if(!openedPeriod)return;
 const plan=getPlan(openedPeriod,false);if(!plan||plan.status!=='draft')return;
 const input=event.target,field=input.dataset.v19Field,id=input.dataset.id;
 if(field&&id){const row=plan.categories.find(c=>c.categoryId===id);if(!row)return;
 if(field==='cover'){const v=cents(input.value);if(v<0||v>Math.max(0,row.balance)){alert('مبلغ التغطية يتجاوز الفائض.');input.value=(row.cover/100).toFixed(2);return}row.cover=v}
 else if(field==='feeRate'){const v=Number(input.value);if(!Number.isFinite(v)||v<0||v>100){alert('رسوم غير صالحة');return}row.feeRate=v}
 else if(field==='destination'||field==='targetId')row[field]=input.value;
 saveEdits();if(field!=='feeRate')cycleShell();return;
 }
 const obId=input.dataset.v19Ob;if(obId){const ob=plan.obligations.find(x=>x.id===obId);if(!ob||ob.locked)return;const selected=input.checked;if(!selected){const reason=prompt('سبب إلغاء/تأجيل استحقاق هذا الشهر (يُحفظ في سجل المراجعة):','فاتورة أُلغيت');if(!reason?.trim()){input.checked=true;return}ob.skippedReason=reason.trim()}else ob.skippedReason='';ob.included=selected;persist('تعديل استحقاق في دورة',ob.name);cycleShell();return}
 const catId=input.dataset.v19Allocation;if(catId){const v=cents(input.value);if(!Number.isFinite(v)||v<0){alert('مخصص غير صالح');return}plan.allocations[catId]=v;saveEdits();cycleShell()}
});
setInterval(()=>{const clock=document.getElementById('v19Clock');if(clock)clock.textContent=personTime()},30000);
// Preserve existing brand; styles live in the companion CSS file.
render();
})();