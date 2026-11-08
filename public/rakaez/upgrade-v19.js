/* Rakaez v19 — Salary cycle workspace, consolidation and mobile ergonomics.
   No external transfers are initiated; all monetary amounts are integer halalas. */
(function(){
'use strict';
if(typeof db==='undefined'||typeof v18Ensure!=='function')return;
const bankNames={hilal:'بنك الهلال',malaa:'بنك ملاءة',assets:'بنك الأصول'};
const cycleSteps=['تسوية البنود','الالتزامات','التوزيع الجديد','المراجعة','المتابعة'];
let openedPeriod='',cycleStep=0,loanDraft=null,loanStep=0,loanEditId='';
const nowISO=()=>{
 const d=new Date();
 return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
};
const periodShift=(p,n)=>v18PeriodAdd(p,n);
const cycleSalaryDay=()=>{
 const wizard=window.RakaezAdaptiveCore?.wizardState(db);
 const value=wizard?.completed?Number(wizard.record.salaryDay):Number(db.cycleDay||25);
 return Number.isInteger(value)&&value>=1&&value<=31?value:25;
};
const upcomingPeriod=()=>{
 const d=new Date(),p=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
 const proposed=d.getDate()<=cycleSalaryDay()?p:periodShift(p,1);
 const wizard=window.RakaezAdaptiveCore?.wizardState(db);
 return wizard?.completed&&proposed<wizard.record.startMonth?wizard.record.startMonth:proposed;
};
const cents=v=>Math.round(Number(v||0)*100);
const cash=v=>money(Number(v||0));
const field=(id,label,value='',type='text',extra='')=>`<div class="v19-field"><label for="${id}">${esc(label)}</label><input type="${type}" id="${id}" value="${esc(value)}" ${extra}></div>`;
const option=(value,label,current)=>`<option value="${esc(value)}" ${String(value)===String(current)?'selected':''}>${esc(label)}</option>`;
const formatDay=period=>{
 const [year,month]=period.split('-').map(Number);
 const validDay=Math.min(cycleSalaryDay(),new Date(year,month,0).getDate());
 return period+'-'+String(validDay).padStart(2,'0');
};
const personTime=()=>new Intl.DateTimeFormat('ar-SA-u-nu-latn',{weekday:'long',hour:'2-digit',minute:'2-digit',hour12:true}).format(new Date());
const note=(s)=>`<p class="v19-help">${s}</p>`;
const persist=(msg,detail)=>{if(msg)audit(msg,detail||openedPeriod);save()};
function ensure(){v18Ensure();if(!Array.isArray(db.rkCyclesV19))db.rkCyclesV19=[];if(!Array.isArray(db.rkSavingsFeesV19))db.rkSavingsFeesV19=[];}
function categorySnapshot(period){
 const old=db.salaryCycles?.find(c=>c.period===period),rows=v18ActiveCategories();
 const core=window.RakaezAdaptiveCore;
 const start=core?.wizardDateBound?core.wizardDateBound(period,cycleSalaryDay()):formatDay(period);
 const nextPeriod=periodShift(period,1);
 const end=core?.wizardDateBound?core.wizardDateBound(nextPeriod,cycleSalaryDay()):formatDay(nextPeriod);
 // A salary cycle is payday-to-payday, never the calendar month.
 // Expenses on the following payday belong to the following cycle.
 return rows.map(cat=>{
  const limit=Number(old?.amounts?.[cat.id]??Math.round(Number(cat.limit||0)*100));
  const spent=(Array.isArray(db.transactions)?db.transactions:[]).filter(t=>t.type==='expense'&&t.category===cat.id&&
   String(t.date||'')>=start&&String(t.date||'')<end).reduce((sum,t)=>sum+Number(t.amount||0),0);
  return {categoryId:cat.id,name:cat.name,limit,spent,balance:limit-spent,cover:0,destination:'none',targetId:'',feeRate:0,deficitChoice:'next'};
 });
}
function buildPlan(period){ensure();const previous=periodShift(period,-1);return {
 id:rid(),period,day:cycleSalaryDay(),salary:Number(db.salary||0),status:'draft',step:0,createdAt:new Date().toISOString(),closePeriod:previous,
 categories:categorySnapshot(previous),obligations:null,allocations:Object.fromEntries(v18ActiveCategories().map(c=>[c.id,Math.round(Number(c.limit||0)*100)])),
 approvedAt:null,receivedAt:null,tasks:[],ratios:{...db.ratios}
};}
function findPlan(period){ensure();return db.rkCyclesV19.find(c=>c.period===period)}
function getPlan(period,create=true){let p=findPlan(period);if(!p&&create){p=buildPlan(period);db.rkCyclesV19.push(p);persist('إنشاء مسودة دورة راتب',period)}return p}

function syncCycleDraft(plan){
 if(!plan||plan.status!=='draft')return false;
 const current=categorySnapshot(plan.closePeriod);
 const oldById=new Map(plan.categories.map(c=>[c.categoryId,c]));
 let changed=current.length!==plan.categories.length;
 const updated=current.map(row=>{
  const old=oldById.get(row.categoryId);
  if(!old){changed=true;return row}
  if(old.limit!==row.limit||old.spent!==row.spent||old.name!==row.name)changed=true;
  return {...old,name:row.name,limit:row.limit,spent:row.spent,balance:row.balance};
 });
 if(!changed)return false;
 plan.categories=updated;
 plan.sourceRevision=(plan.sourceRevision||0)+1;
 plan.analysisReviewedAt=null;plan.analysisSignature=null;
 persist('تحديث فروق الدورة الماضية من العمليات الفعلية',plan.closePeriod);
 return true;
}

function feeAmount(f){return Number(f?.amount)||0}
function cycleFeeDue(f,period){
 const units={monthly:1,month:1,'شهري':1,quarterly:3,semiannual:6,annual:12,once:0};
 const interval=units[String(f?.period||'monthly')];
 if(interval===undefined)return null;
 const start=formatDay(period),end=formatDay(periodShift(period,1));
 const due=String(f?.date||'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(due)){
  // Without a confirmed due date, only monthly recurring fees are reserved.
  return interval===1?{date:start,unverifiedDue:true}:null;
 }
 const y=Number(due.slice(0,4)),m=Number(due.slice(5,7)),day=Number(due.slice(8,10));
 if(m<1||m>12||day<1||day>new Date(Date.UTC(y,m,0)).getUTCDate())return null;
 if(interval===0)return due>=start&&due<end?{date:due,unverifiedDue:false}:null;
 if(due>=end)return null;
 const byMonth=(year,month)=>year*12+month;
 const delta=byMonth(Number(start.slice(0,4)),Number(start.slice(5,7)))-
  byMonth(y,m);
 const earliest=Math.max(0,Math.floor(delta/interval)-1);
 for(let k=earliest;k<=earliest+3;k++){
  const first=new Date(Date.UTC(y,m-1+k*interval,1));
  const last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
  const date=first.getUTCFullYear()+'-'+String(first.getUTCMonth()+1).padStart(2,'0')+'-'+String(Math.min(day,last)).padStart(2,'0');
  if(date>=start&&date<end)return {date,unverifiedDue:false};
 }
 return null;
}
function scheduledEstimate(x){try{return typeof rkScheduledEstimated==='function'?Number(rkScheduledEstimated(x)||0):Number(x.amount||0)}catch{return Number(x.amount||0)}}
function makeObligations(period){v18Ensure();const rows=[];
 (db.hilalPayments||[]).filter(p=>p.period===period&&p.status!=='paid'&&db.hilalFinancings.some(f=>f.id===p.financingId&&f.status==='active')).forEach(p=>{
  const f=db.hilalFinancings.find(f=>f.id===p.financingId),r=db.hilalRequests.find(r=>r.id===f?.requestId);
  rows.push({id:'hilal:'+p.id,reference:p.id,source:'hilal',bank:'hilal',name:`قسط ${r?.title||'تمويل الهلال'}`,categoryId:p.categoryId||r?.categoryId||'',amount:p.amount,kind:'due',included:true,locked:true,dueDate:p.dueDate||formatDay(period)});
 });
 (db.debts||[]).filter(d=>Number(d.principal||0)>Number(d.paid||0)&&Number(d.installment||0)>0).forEach(d=>{
  rows.push({id:'debt:'+d.id,reference:d.id,source:'debt',bank:'hilal',name:`قسط ${d.name}`,categoryId:d.categoryId||'',amount:Math.min(d.installment,d.principal-d.paid),kind:'debt',included:true,locked:true,dueDate:d.date||formatDay(period)});
 });
 (db.goals||[]).filter(g=>Number(g.monthly||0)>0).forEach(g=>rows.push({id:'goal:'+g.id,reference:g.id,source:'goal',bank:'assets',name:'مساهمة هدف '+g.name,amount:Number(g.monthly),kind:'goal',included:false,locked:false,dueDate:formatDay(period)}));
 (db.fees||[]).filter(f=>feeAmount(f)>0&&!['paused','stopped','cancelled','canceled','suspended'].includes(f.status)).forEach(f=>{
  const due=cycleFeeDue(f,period);if(!due)return;
  rows.push({id:'fee:'+f.id,reference:f.id,source:'fee',
   bank:f.bank==='assets'?'assets':f.bank==='malaa'?'malaa':'hilal',
   name:f.name,categoryId:f.categoryId||'',amount:feeAmount(f),kind:'fee',
   included:true,locked:true,dueDate:due.date,unverifiedDue:due.unverifiedDue});
 });
 (db.scheduledOps||[]).filter(x=>x.status==='planned'&&scheduledEstimate(x)>0&&(!x.start||String(x.start).slice(0,7)<=period)).forEach(op=>{
  const bank=op.bank==='malaa'?'malaa':op.bank==='assets'?'assets':'hilal';
  const optional=['allocation','saving','savings','investment','transfer'].includes(op.kind);
  rows.push({id:'scheduled:'+op.id,reference:op.id,source:'scheduled',bank,name:op.name,categoryId:op.categoryId||'',amount:scheduledEstimate(op),kind:optional?'optional':'bill',included:!optional,locked:false,dueDate:op.start||formatDay(period)});
 });
 (db.rkSavingsFeesV19||[]).filter(x=>x.active&&x.startPeriod<=period).forEach(f=>{
   rows.push({id:'savingsfee:'+f.id,reference:f.id,source:'savingsfee',bank:'malaa',name:`رسوم ادخار ${f.name}`,categoryId:f.categoryId||'',amount:f.monthly,kind:'fee',included:true,locked:true,dueDate:formatDay(period)});
 });
 return rows;
}
function refreshObligations(plan){if(!plan.obligations){plan.obligations=makeObligations(plan.period);return}
 const incoming=makeObligations(plan.period);const old=new Map(plan.obligations.map(x=>[x.id,x]));plan.obligations=incoming.map(x=>{let prev=old.get(x.id);return prev?{...x,included:x.locked?true:prev.included,skippedReason:prev.skippedReason||'',done:prev.done||false}:x});
}
function totalO(plan){refreshObligations(plan);return plan.obligations.filter(x=>x.included).reduce((a,x)=>a+x.amount,0)}
function bankSplit(plan){
 const due=totalO(plan),salary=Number(plan.salary);
 const ratios=plan.ratios||db.ratios||{};
 const shares=['hilal','malaa','assets'].map(key=>Number(ratios[key]));
 const invalidRatios=shares.some(n=>!Number.isFinite(n)||n<0||n>100)||
  Math.abs(shares.reduce((a,b)=>a+b,0)-100)>0.000001;
 const invalidAmount=!Number.isSafeInteger(salary)||salary<0||
  !Number.isSafeInteger(due)||due<0;
 const net=invalidAmount?0:Math.max(0,salary-due);
 if(invalidRatios||invalidAmount)return {net,hilal:0,malaa:0,assets:0,
  invalidRatios,invalidAmount};
 // Largest-remainder rounding: allocations in halalas always add up to net
 // without creating negative bank allocations on 1- or 2-halala boundaries.
 const raw=shares.map(v=>net*v/100),alloc=raw.map(v=>Math.floor(v));
 let remain=net-alloc.reduce((a,b)=>a+b,0);
 const order=[0,1,2].sort((a,b)=>(raw[b]-alloc[b])-(raw[a]-alloc[a])||a-b);
 for(let n=0;n<remain;n++)alloc[order[n%order.length]]++;
 return {net,hilal:alloc[0],malaa:alloc[1],assets:alloc[2],
  invalidRatios:false,invalidAmount:false};
}
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
function statusText(p){return p?.status==='completed'?'مكتملة':p?.status==='approved'?'بانتظار تنفيذ التحويلات':p?.status==='tracking'?'قيد المتابعة':p?.status==='awaiting-match'?'بانتظار مطابقة العمليات':p?.status==='draft'?'مسودة':p?.status==='legacy'?(p.approved?'معتمدة من إصدار سابق':'مسودة سابقة'):'لم تبدأ'}
function pageList(){ensure();const current=upcomingPeriod(),plans=db.rkCyclesV19.slice();(db.salaryCycles||[]).filter(c=>!plans.some(p=>p.period===c.period)).forEach(c=>plans.push({period:c.period,day:c.day||db.cycleDay||25,salary:c.salary??null,status:'legacy',approved:!!c.approved}));if(!plans.some(p=>p.period===current)){plans.push({period:current,day:cycleSalaryDay(),salary:db.salary,status:'new'})}plans.sort((a,b)=>b.period.localeCompare(a.period));
 return `<section class="v19-cycle-page"><header class="v19-section-title"><h2>دورة الراتب</h2><button class="btn primary" data-v19-action="new-cycle">${ico('plus')} دورة جديدة</button></header>
 <div class="v19-cycle-list">${plans.map(p=>`<button class="v19-cycle-list-item" type="button" ${p.status==='legacy'?`data-v19-legacy="${esc(p.period)}"`:`data-v19-open="${esc(p.period)}"`}><span><small>تاريخ الدورة</small><strong>${esc(p.period)}-${String(p.day||25).padStart(2,'0')}</strong></span><span><small>الراتب</small><strong>${p.salary==null?'غير محفوظ':cash(p.salary)}</strong></span><span><small>حالة الدورة</small><strong>${statusText(p)}</strong></span></button>`).join('')}</div>
 ${note('اضغط على الدورة لفتح مساحة العمل الكاملة. تأكيد السداد والتحويلات يدوي، وليس تنفيذًا مصرفيًا تلقائيًا.')}</section>`;
}
function renderCyclePage(){if(page!=='cycles')return;const view=document.getElementById('view');if(view)view.innerHTML=pageList();}
function drawStep1(plan){const deficits=shortagePlan(plan),availableCoverage=covered(plan),remainder=deficitRemaining(plan);
 return `<div class="v19-step-intro"><h2>مراجعة المتبقي من البنود السابقة</h2><p>مراجعة إقفال ${esc(plan.closePeriod)} قبل إنشاء مخصصات الشهر الجديد. لا يتغير الإنفاق التاريخي.</p></div>
 <div class="v19-section-title"><button class="btn" data-v19-action="combine-surpluses" type="button">${ico('trend')} تجميع فوائض البنود للاستثمار</button></div><div class="v19-fact-grid">${summaryBox('مجموع تجاوز البنود',cash(deficit(plan)))}${summaryBox('تغطية تخطيطية بين البنود',cash(availableCoverage))}${summaryBox('تجاوز المخصص غير المسوى',cash(remainder))}</div>
 <div class="v19-record-grid">${plan.categories.map(c=>{
  const surplus=c.balance>0,negative=c.balance<0,remaining=c.balance-Number(c.cover||0);return `<article class="v19-record ${negative?'is-negative':surplus?'is-surplus':''}">
  <header><h3>${esc(c.name)}</h3><span class="v19-status ${negative?'is-negative':surplus?'is-positive':''}">${negative?'عجز':surplus?'فائض':'متوازن'}</span></header>
  <div class="v19-mini-grid">${summaryBox('المخصص السابق',cash(c.limit))}${summaryBox('المصروف',cash(c.spent))}${summaryBox('الرصيد',cash(c.balance))}</div>
  ${surplus?`<div class="v19-fields"><div class="v19-field"><label>تغطية عجز بنود أخرى (ر.س)</label><input type="number" min="0" max="${(c.balance/100).toFixed(2)}" step="0.01" value="${(c.cover/100).toFixed(2)}" data-v19-field="cover" data-id="${esc(c.categoryId)}"></div>
  <div class="v19-field"><label>وجهة الفائض المتبقي (${cash(Math.max(0,remaining))})</label><select data-v19-field="destination" data-id="${esc(c.categoryId)}">${[['none','لا ترحيل — إبقاؤه ضمن السيولة'],['malaa','ادخار مرتبط بالبند في بنك ملاءة'],['goal','تغذية هدف مالي في بنك الأصول'],['assets','استثمار مستقل في بنك الأصول']].map(([a,b])=>option(a,b,c.destination)).join('')}</select></div>
  ${c.destination==='goal'?`<div class="v19-field"><label>الهدف المالي</label><select data-v19-field="targetId" data-id="${esc(c.categoryId)}">${option('','اختر الهدف',c.targetId)}${(db.goals||[]).map(g=>option(g.id,g.name,c.targetId)).join('')}</select></div>`:''}
  ${c.destination==='malaa'?`<div class="v19-field"><label>رسوم الاستثمار الشهرية في ملاءة (%) — حسب اتفاقك</label><input type="number" min="0" max="100" step="0.01" data-v19-field="feeRate" data-id="${esc(c.categoryId)}" value="${c.feeRate||0}"></div>`:''}</div>`:negative?`<p class="v19-help">يمكن تغطية العجز من فوائض البنود الأخرى. أي عجز متبقٍ يحتاج إلى اختيار تسوية موثقة أو تخفيض مخصصات الإنفاق القادم.</p><button class="btn" type="button" data-v19-action="reduce-deficit" data-id="${esc(c.categoryId)}">${ico('chart')} خفض مخصص الشهر القادم</button> <button class="btn" type="button" data-v19-action="loan-deficit" data-id="${esc(c.categoryId)}">${ico('fund')} مراجعة السيولة قبل طلب التمويل</button>`:note('البند متوازن ولا يتطلب إجراءً.')}
 </article>`}).join('')}</div>
 <div class="v19-note">فائض البند قيمة حسابية لا تُثبت وحدها وجود نقد في الحساب. لا تؤكد الترحيل إلا بعد التحقق من الرصيد الفعلي. ${remainder>0?`يوجد عجز غير مغطى بمبلغ ${cash(remainder)}. يجوز إعداد الدورة كمسودة، لكن لا تُعتمد التسوية نهائيًا حتى تتم تغطيته أو تسجيله صراحةً كعجز مرحّل.`:'تمت تغطية كل العجز حسابيًا من الفوائض. فوائض البنود الأخرى لا تُخصم من مخصصات الشهر الجديد إلا بعد اعتماد التوزيع.'}</div>`;
}
function drawStep2(plan){refreshObligations(plan);const due=totalO(plan),analysis=cycleAnalysis(plan);
 return `<div class="v19-step-intro"><h2>مراجعة الالتزامات عبر البنوك الثلاثة</h2><p>الأقساط والرسوم والفواتير ذات العلاقة تُراجع قبل توزيع الراتب. يمكنك إيقاف فاتورة ملغاة مع توثيق السبب، ولا يمكن إسقاط قسط قائم دون تسويته.</p></div>
 <div class="v19-fact-grid">${summaryBox('الراتب المخطط',cash(plan.salary))}${summaryBox('الالتزامات المستحقة',cash(due))}${summaryBox('المتاح بعد الالتزامات',cash(plan.salary-due))}</div>
 ${['hilal','malaa','assets'].map(bank=>`<section class="v19-ob-group"><h3>${bankNames[bank]}</h3>${plan.obligations.filter(x=>x.bank===bank).map(x=>`<div class="v19-ob-row"><div><strong>${esc(x.name)}</strong><small>${esc(x.dueDate||'')} · ${x.unverifiedDue?'موعد يحتاج تأكيد · ':''}${esc(x.kind==='bill'?'فاتورة/عملية مجدولة':x.kind==='fee'?'رسوم': 'قسط أو التزام')}</small></div><b>${cash(x.amount)}</b>${x.locked?`<span class="v19-status">التزام قائم</span>`:`<label class="v19-toggle"><input type="checkbox" data-v19-ob="${esc(x.id)}" ${x.included?'checked':''}> مستحق</label>`}</div>`).join('')||'<p class="v19-muted">لا توجد التزامات مسجلة لهذا البنك.</p>'}</section>`).join('')}
 ${note('إلغاء احتساب فاتورة من هذه الدورة لا يحذف سجلها الأصلي، ولا يمثل إثبات سداد. تحتاج الالتزامات القائمة إلى تسوية منفصلة.')}`;
}

function cycleAnalysis(plan){
 const core=window.RakaezAdaptiveCore;
 if(!core||typeof core.cycleCategoryAnalysis!=='function')
  return {ready:false,canApply:false,reason:'محرك تحليل البنود غير متاح؛ لا تعتمد التوزيع التلقائي.'};
 try{return core.cycleCategoryAnalysis(db,plan.period,{
  income:Math.round(Number(plan.salary)||0),available:bankSplit(plan).hilal,
  upcomingObligations:plan.obligations||[],planSplit:bankSplit(plan)
 })}catch(error){return {ready:false,canApply:false,reason:'تعذّر فحص السجل المالي: '+String(error.message||'يرجى مراجعة البيانات.')}}
}
function cycleSignature(report){
 return JSON.stringify({periods:report.reviewedPeriods||[],available:report.available,
  income:report.income,stale:report.changedSnapshots||[],legacy:report.legacySnapshots||[],
  invalid:report.invalidTransactions||0,duplicates:report.duplicateTransactionIds||0,
  unknownFees:(report.unconfirmedFutureFees||[]).map(x=>[x.id,x.amount,x.period]),
  uncategorized:report.uncategorizedTransactions||0,incomplete:report.incompleteDetails||0,
  obligations:(report.obligations||[]).map(o=>[o.id,o.source,o.reference,o.amount,o.dueDate,o.locked,o.categoryId]),
  items:(report.items||[]).map(r=>[r.id,r.previous,r.suggested,r.confidence,
   r.history.map(h=>[h.period,h.actual,h.exceptional,h.count,h.allocated])])});
}
function cycleCanAutoApply(report){
 return report.ready&&report.canApply&&!report.overAvailable&&!report.planSplit?.invalidRatios&&!report.planSplit?.invalidAmount;
}
function cycleReportIntro(report,plan){
 if(!report.ready)return '<p class="v19-warning">'+esc(report.reason)+
  ' القيم الظاهرة أدناه مخصصات حالية وليست توصيات مبنية على بيانات مكتملة.</p>';
 const warnings=[];
 if(report.reviewedCount===1)warnings.push('هذه ثاني دورة بعد مراجعة الأولى؛ الزيادة حذرة، والتخفيض يحتاج أدلة متكررة.');
 if(report.changedSnapshots.length)warnings.push('تغيّرت معاملات دورة سبق اعتماد مراجعتها: '+report.changedSnapshots.join('، '));
 if(report.legacySnapshots?.length)warnings.push('مراجعات قديمة دون بصمة عمليات تفصيلية؛ لا تُطبق توصياتها آليًا.');
 if(report.invalidTransactions||report.duplicateTransactionIds)warnings.push('يوجد خلل في بيانات المعاملات أو معرفات مكررة.');
 if(report.addedObligations?.length)warnings.push('ظهرت استحقاقات جديدة: '+report.addedObligations.map(o=>o.name+' ('+cash(o.amount)+')').join('، ')+'.');
 if(report.newlyReportedFlexibleDebt?.length)warnings.push('ديون مرنة جديدة تستلزم مراجعة القدرة على السداد، دون اعتبارها قسطًا تلقائيًا: '+report.newlyReportedFlexibleDebt.map(d=>d.name+' ('+cash(d.remaining)+')').join('، ')+'.');
 if(report.incomeChange!==null&&report.incomeChange<0)warnings.push('انخفض الدخل المتوقع عن بيانات البداية بمقدار '+cash(-report.incomeChange)+'؛ أعد ترتيب الضروريات والاستحقاقات قبل أي استثمار.');
 if(report.totalDebtRemaining>0)warnings.push('إجمالي الديون المتبقية المسجلة: '+cash(report.totalDebtRemaining)+'؛ ليس مبلغًا مستحق السداد كاملًا هذا الشهر.');
 if(report.uncategorizedTransactions)warnings.push('يوجد '+report.uncategorizedTransactions+' مصروف غير مصنف؛ راجع التصنيف.');
 if(report.incompleteDetails)warnings.push('يوجد '+report.incompleteDetails+' مصروف غير منتظم لم يحدد تقديره.');
 if(report.unconfirmedFutureFees?.length)warnings.push('توجد رسوم دورية غير شهرية دون تاريخ استحقاق، ولا تُحتسب التزامات مؤكدة لهذا الشهر: '+report.unconfirmedFutureFees.map(x=>x.name).join('، ')+'.');
 if(report.incomeShock)warnings.push('حدث تغير جذري في الدخل المتوقع؛ يجب مراجعة الأولويات والأقساط وملاءمة المخصصات يدويًا.');
 if(report.overAvailable)warnings.push('مجموع الاقتراحات يتجاوز نصيب الهلال؛ يجب تعديل المبالغ قبل التطبيق.');
 const canApply=cycleCanAutoApply(report);
 return '<div class="v19-fact-grid">'+
  summaryBox('دورات راتب تمت مراجعتها',String(report.reviewedCount))+
  summaryBox('استحقاقات مخططة',cash(report.obligationsSum||0))+
  summaryBox('ديون قائمة — أرصدة لا أقساط',cash(report.totalDebtRemaining||0))+
  summaryBox('إجمالي المقترح للميزانية',cash(report.suggestedTotal))+
  summaryBox('المتاح لبنود الهلال بعد الاستحقاقات',cash(report.available||0))+'</div>'+
  '<p class="v19-help">مصادر التحليل: '+esc(report.reviewedPeriods.join('، '))+
  '. لم تؤكد مطابقة هذه البيانات مع كشوف البنوك، ولا يُنفذ أي تحويل أو استثمار تلقائي.</p>'+
  warnings.map(x=>'<p class="v19-warning">'+esc(x)+'</p>').join('')+
  '<div class="v19-review-actions">'+
  (canApply?'<button type="button" class="btn" data-v19-action="apply-analysis">تطبيق الاقتراحات بعد المراجعة</button>':'')+
  '<button type="button" class="btn primary" data-v19-action="confirm-analysis">'+
  (plan.analysisReviewedAt?'تمت مراجعة التقرير — إعادة التأكيد':'راجعت تقرير البنود')+
  '</button></div>';
}
function cycleAllocationField(category,plan,report){
 const row=report.ready?report.items.find(x=>x.id===String(category.id)):null;
 const id=String(category.id),chosen=Number(plan.allocations[id]||0);
 const explain=row?
  '<details><summary>شرح المقترح والمخاطر</summary>'+
  '<p class="v19-help">المخصص السابق: '+cash(row.previous)+
  ' · صرف آخر دورة: '+cash(row.lastActual)+
  ' · المتبقي التخطيطي عن آخر دورة: '+(row.lastRemaining===null?'غير محسوب':cash(row.lastRemaining))+
  ' · المتوسط على الدورات المراجعة: '+cash(row.observedMean)+
  ' · متوسط العملية: '+(row.averageTransaction===null?'غير متاح':cash(row.averageTransaction))+
  ' · مرات تجاوز المخصص الموثقة: '+row.overspendCount+
  ' · التغير عن الدورة السابقة: '+(row.trend===null?'غير متاح':cash(row.trend))+
  ' · مصروفات استثنائية مستبعدة: '+cash(row.history.reduce((n,h)=>n+h.exceptional,0))+
  '.</p><p class="v19-help">'+esc(row.reason)+'</p>'+
  (row.warnings.length?'<p class="v19-warning">'+esc(row.warnings.join(' | '))+'</p>':'')+
  '<p class="v19-help">'+esc(row.source)+'</p></details>':'<small>لم تتوفر دورات مراجعة كافية؛ الإدخال اليدوي فقط.</small>';
 const inputId='v19-allocation-'+id;
 return '<div class="v19-field"><label for="'+esc(inputId)+'">'+esc(category.name)+'</label>'+
  '<input id="'+esc(inputId)+'" type="number" inputmode="decimal" data-v19-allocation="'+esc(id)+
  '" min="0" step="0.01" value="'+(chosen/100).toFixed(2)+'">'+
  (row?'<small>'+esc(({increase:'زيادة',decrease:'تخفيض',keep:'إبقاء',review:'مراجعة'})[row.recommendation]||'اقتراح')+': '+cash(row.suggested)+' · الثقة: '+esc(row.confidence)+'</small>':'')+
  (plan.manualReasons?.[id]?'<small>سبب التعديل اليدوي: '+esc(plan.manualReasons[id])+'</small>':'')+
  explain+'</div>';
}

function drawStep3(plan){const split=bankSplit(plan),total=allocationSum(plan),analysis=cycleAnalysis(plan);
 return `<div class="v19-step-intro"><h2>التحليل والتوزيع الجديد</h2><p>تُراجع مصروفات الدورات المكتملة قبل تعديل المخصصات. القيم المحفوظة أوليًا ليست اقتراحات آلية، ومخصصات الهلال لا تمثل تحويلًا بنكيًا.</p></div>
 <div class="v19-fact-grid">${summaryBox('الراتب',cash(plan.salary))}${summaryBox('الالتزامات المحجوزة',cash(totalO(plan)))}${summaryBox('الصافي للتوزيع',cash(split.net))}</div>
 ${cycleReportIntro(analysis,plan)}<section class="v19-ob-group"><h3>التوزيع بين البنوك</h3><div class="v19-three-banks">${Object.keys(bankNames).map(bank=>`<div>${ico(bank==='hilal'?'moon':bank==='malaa'?'shield':'trend')}<span>${bankNames[bank]} (${Number(plan.ratios?.[bank]||0)}%)</span><strong>${cash(split[bank])}</strong></div>`).join('')}</div></section>
 <section class="v19-ob-group"><div class="v19-section-title"><h3>تقارير ومخصصات بنود الهلال</h3></div>
 <div class="v19-alloc-grid">${v18ActiveCategories().map(c=>cycleAllocationField(c,plan,analysis)).join('')}</div>
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
 <div class="v19-task-list">${plan.tasks.map((t,i)=>`<div class="v19-task ${t.done?'is-done':''}"><span class="v19-task-no">${String(i+1).padStart(2,'0')}</span><div><strong>${esc(t.name)}</strong><small>${bankNames[t.bank]||'المتابعة'} · ${cash(t.amount)}</small></div><button type="button" class="btn ${t.done?'':'primary'}" data-v19-action="confirm-task" data-id="${esc(t.id)}" ${t.done?'disabled':''}>${t.done?'تم التأكيد':'توثيق المتابعة'}</button></div>`).join('')}</div>
 ${note('لا تُرسل المنصة تحويلات بنكية، ولا تخصم الحسابات تلقائيًا. التأكيد يوثق أن الإجراء تم خارج المنصة.')}`;
}
function cycleShell(){const plan=getPlan(openedPeriod);if(!plan)return;
 syncCycleDraft(plan);
 const ready=plan.status!=='draft',idx=ready?4:cycleStep;
 const content=[drawStep1,drawStep2,drawStep3,drawStep4,drawStep5][idx](plan);
 document.getElementById('modalRoot').innerHTML=`<div class="v19-workspace-bg" role="presentation"><section class="v19-workspace" role="dialog" aria-modal="true" aria-label="دورة الراتب"><header class="v19-workspace-header"><button type="button" data-v19-action="previous" class="v19-close" aria-label="السابق" ${idx===0||ready?'disabled':''}>${ico('back')}</button><div style="flex:1;text-align:center"><h1>دورة الراتب ${esc(plan.period)}</h1><p>التاريخ ${esc(formatDay(plan.period))} · ${statusText(plan)}</p></div><button type="button" data-v19-action="close-cycle" class="v19-close" aria-label="إغلاق">${ico('close')}</button></header>
 <nav class="v19-progress">${cycleSteps.map((s,i)=>`<button type="button" class="${i===idx?'active':''} ${i<idx?'done':''}" data-v19-step="${i}" ${ready&&i!==4?'disabled':''}>${i+1}. ${s}</button>`).join('')}</nav><main class="v19-workspace-main">${content}</main>
 <footer class="v19-workspace-footer"><button type="button" class="btn primary" data-v19-action="next" ${idx===3||ready?'disabled':''}>التالي ${ico('forward')}</button><button type="button" class="btn v19-save" data-v19-action="save-cycle">${ico('check')} حفظ المسودة</button></footer></section></div>`;
 const scroller=document.querySelector('.v19-workspace-main');if(scroller)scroller.scrollTop=0;
}
function openLegacy(period){
 const c=(db.salaryCycles||[]).find(x=>x.period===period);if(!c)return;
 const summary=Object.entries(c.amounts||{}).map(([id,value])=>{const category=db.categories.find(x=>x.id===id);return '<div><span>'+esc(category?.name||id)+'</span><strong>'+cash(value)+'</strong></div>'}).join('');
 openedPeriod='';document.getElementById('modalRoot').innerHTML='<div class="v19-workspace-bg"><section class="v19-workspace" role="dialog" aria-modal="true"><header class="v19-workspace-header"><button class="v19-close" type="button" data-v19-action="close-cycle" aria-label="إغلاق">'+ico('close')+'</button><div><h1>دورة الراتب '+esc(period)+'</h1><p>سجل محفوظ من الإصدار السابق · '+(c.approved?'معتمد':'مسودة')+'</p></div></header><main class="v19-workspace-main"><div class="v19-step-intro"><h2>المخصصات المسجلة</h2><p>هذه مراجعة تاريخية. لا يجوز تعديل دورة سبق اعتمادها؛ ويظهر الراتب فقط إن كان محفوظًا في سجل الدورة القديمة.</p></div><section class="v19-review"><div><span>تاريخ الدورة</span><strong>'+esc(period)+'-'+String(c.day||db.cycleDay||25).padStart(2,'0')+'</strong></div><div><span>الراتب</span><strong>'+(c.salary!=null?cash(c.salary):'غير محفوظ')+'</strong></div>'+summary+'</section></main><footer class="v19-workspace-footer v19-loan-final"><button class="btn primary" data-v19-action="close-cycle" type="button">إغلاق المراجعة</button></footer></section></div>';
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
 }else if(cycleStep===2){const split=bankSplit(plan);if(split.invalidRatios||split.invalidAmount)return alert('يوجد خلل في نسب البنوك أو البيانات المالية.');if(allocationSum(plan)>split.hilal){alert('مجموع مخصصات البنود يتجاوز نصيب الهلال بعد الالتزامات.');return false}}
 return true;
}
function approveCycle(){const plan=getPlan(openedPeriod);if(!plan||plan.status!=='draft')return;
 syncCycleDraft(plan);
 if(nowISO()<formatDay(plan.period))
  return alert('لا يمكن إغلاق ميزانية الدورة السابقة واعتماد التوزيع الجديد قبل حلول يوم الراتب. احتفظ بالمسودة حتى اكتمال المصروفات والاستحقاقات.');

 const report=cycleAnalysis(plan);
 if(report.changedSnapshots?.length||report.invalidTransactions||report.duplicateTransactionIds)
  return alert('تغير تاريخ العمليات أو توجد معاملات غير سليمة؛ راجعها قبل الاعتماد.');
 if(report.ready&&(!plan.analysisReviewedAt||plan.analysisSignature!==cycleSignature(report)))
  return alert('راجع تقرير البنود الحالي وأكد المراجعة بعد آخر تغيير في المصروفات.');

 if(bankSplit(plan).invalidRatios||bankSplit(plan).invalidAmount)
  return alert('الراتب أو الالتزامات أو نسب التوزيع غير صالحة؛ راجع البيانات قبل اعتماد الخطة.');
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
function confirmTask(id){
 const plan=getPlan(openedPeriod),task=plan?.tasks.find(x=>x.id===id);
 if(!task||task.done)return;
 if(id!=='receipt'&&!plan.receivedAt)return alert('أكد نزول الراتب فعليًا قبل متابعة التوزيع.');
 const message=task.kind==='receipt'?
  'هل وصل الراتب فعلًا إلى حسابك الخارجي؟ هذا لا يُنشئ رصيدًا افتراضيًا.':
  'هل تابعت الإجراء خارج المنصة؟ ستُسجل المتابعة فقط؛ إثبات السداد أو التحويل يحتاج مطابقة مستقلة.';
 if(!confirm(message+' المبلغ: '+cash(task.amount)))return;
 if(task.kind==='receipt'){
  plan.receivedAt=new Date().toISOString();
  if(!Array.isArray(db.salaryMonths))db.salaryMonths=[];
  if(!db.salaryMonths.includes(plan.period))db.salaryMonths.push(plan.period);
 }else{
  // No debt principal, savings, goal balance or ledger changes from a workflow button.
  task.pendingReconciliation=true;
  task.reconciliationNote='انتظار مطابقة العملية مع سجل الدفع أو التحويل الحقيقي';
  const ob=plan.obligations?.find(x=>x.id===task.sourceId);
  if(ob)ob.followUpConfirmedAt=new Date().toISOString();
 }
 task.done=true;task.confirmedAt=new Date().toISOString();
 plan.status=plan.tasks.every(x=>x.done)?
  (plan.tasks.some(x=>x.pendingReconciliation)?'awaiting-match':'completed'):'tracking';
 persist('متابعة مهمة دورة دون قيد مالي',plan.period+': '+task.name);
 cycleShell();toast('سُجلت المتابعة؛ لم يُنشأ نقد أو يُخصم رصيد دون مطابقة مستقلة');
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
 document.getElementById('modalRoot').innerHTML=`<div class="v19-workspace-bg" role="presentation"><section class="v19-workspace v19-loan-workspace" role="dialog" aria-modal="true" aria-label="طلب قرض"><header class="v19-workspace-header"><button class="v19-close" type="button" data-v19-action="close-loan" aria-label="إغلاق">${ico('close')}</button><div><h1>${loanEditId?'تعديل طلب القرض':'طلب قرض جديد'}</h1><p>الممول: بنك الهلال · ${loanStep+1} من 3</p></div></header><nav class="v19-progress">${['سبب القرض والبند','التكلفة والأقساط','المعاينة'].map((x,i)=>`<span class="${loanStep===i?'active':''}">${i+1}. ${x}</span>`).join('')}</nav><main class="v19-workspace-main">${body}</main><footer class="v19-workspace-footer ${loanStep===2?'v19-loan-final':''}">${loanStep===2?`<button class="btn primary v19-wide" type="button" data-v19-action="loan-save">${ico('check')} حفظ الطلب بعد المراجعة</button>`:`<button class="btn primary" type="button" data-v19-action="loan-next">التالي ${ico('forward')}</button><button class="btn v19-save" type="button" disabled>حفظ</button><button class="btn" type="button" data-v19-action="loan-prev" ${loanStep===0?'disabled':''}>${ico('back')} السابق</button>`}</footer></section></div>`;
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
  case 'combine-surpluses':if(!plan||plan.status!=='draft')return;
 if(!confirm('تجميع فروق البنود للتخطيط فقط دون الاستثمار أو تحويل أموال؟'))return;
 plan.combineSurplus=true;persist('تجميع فروق البنود للتخطيط');cycleShell();return;
  case 'confirm-analysis':{
  if(!plan||plan.status!=='draft')return;
  const report=cycleAnalysis(plan);
  if(report.changedSnapshots?.length||report.invalidTransactions||report.duplicateTransactionIds)
   return alert('تغيرت عمليات بعد مراجعتها أو يوجد مبلغ غير سليم أو تكرار؛ أصلح السجل أولًا.');
  if(report.ready&&report.blocked&&!confirm('توجد بيانات ناقصة أو غير مصنفة. هل أكملت المراجعة اليدوية لهذه الملاحظات؟'))return;
  plan.analysisReviewedAt=new Date().toISOString();
  plan.analysisSignature=cycleSignature(report);
  plan.analysisEvidence={periods:report.reviewedPeriods||[],dataQuality:report.blocked?'requires-confirmation':'reviewed',source:'rk44-adaptive-core'};
  persist('إقرار مراجعة تحليل بنود الدورة',plan.period);
  cycleShell();toast('حُفظ إقرار مراجعة البنود دون تغيير المخصصات');return;
 }
 case 'apply-analysis':{
  if(!plan||plan.status!=='draft')return;
  const report=cycleAnalysis(plan);
  if(!cycleCanAutoApply(report))return alert('لا يجوز تطبيق اقتراحات تلقائية قبل اكتمال مراجعة الدورات والمطابقة وتغطية الاستحقاقات.');
  if(report.suggestedTotal>bankSplit(plan).hilal)return alert('تتجاوز الاقتراحات نصيب الهلال المتاح بعد الاستحقاقات.');
  if(!confirm('تطبيق المخصصات المقترحة استنادًا إلى الدورات المراجعة؟ لا ينفذ هذا أي تحويل أو خصم بنكي.'))return;
  plan.allocations=Object.fromEntries(report.items.map(x=>[x.id,x.suggested]));
  plan.manualReasons={};
  plan.analysisReviewedAt=new Date().toISOString();
  plan.analysisSignature=cycleSignature(report);
  plan.analysisEvidence={periods:report.reviewedPeriods,dataQuality:'reviewed',source:'rk44-adaptive-core',
   suggestions:report.items.map(x=>({id:x.id,value:x.suggested,reason:x.reason,confidence:x.confidence}))};
  persist('تطبيق مقترحات بنود مستندة إلى مراجعة الدورات',plan.period);
  cycleShell();toast('تم تطبيق الاقتراحات على المسودة فقط');return;
 }
  case 'approve':return approveCycle();
  case 'confirm-task':return confirmTask(id);
  case 'reduce-deficit':{if(!plan||plan.status!=='draft')return;const row=plan.categories.find(x=>x.categoryId===id);if(!row)return;const old=Number(plan.allocations[id]||0)/100;const raw=prompt('أدخل مخصص الشهر القادم بعد خفض الإنفاق (ر.س):',String(old));if(raw===null)return;const value=Number(raw);if(!Number.isFinite(value)||value<0||value>100000000)return alert('مخصص غير صالح.');plan.allocations[id]=cents(value);persist('خفض مخصص بند في الدورة القادمة',row.name);cycleShell();toast('تم تعديل مخصص الشهر القادم فقط؛ العجز السابق لا يُعد مسددًا.');return;}
  case 'loan-deficit':{if(!plan)return;closeModal();navigate('reserves');toast('تجاوز ميزانية بند لا يثبت وجود نقص نقدي. راجع السيولة قبل أي تمويل.');return}
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
 const legacy=event.target.closest('[data-v19-legacy]');if(legacy){event.preventDefault();openLegacy(legacy.dataset.v19Legacy);return}
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
 const catId=input.dataset.v19Allocation;if(catId){
  const v=cents(input.value),before=Number(plan.allocations[catId]||0);
  if(!Number.isFinite(v)||v<0||v>100000000000){alert('مخصص غير صالح');input.value=(before/100).toFixed(2);return}
  if(v===before)return;
  const explanation=prompt('اكتب سبب تعديل مخصص هذا البند (يلزم حفظ سبب القرار):','');
  if(!explanation?.trim()){input.value=(before/100).toFixed(2);return}
  if(!plan.manualReasons)plan.manualReasons={};
  plan.manualReasons[catId]=explanation.trim().slice(0,500);
  plan.allocations[catId]=v;
  const prevScroll=document.querySelector('.v19-workspace-main')?.scrollTop||0;
  audit('تعديل مخصص بعد تقرير الدورة',catId+' — '+before+' إلى '+v+' هللة؛ '+plan.manualReasons[catId]);
  saveEdits();cycleShell();
  const scroller=document.querySelector('.v19-workspace-main');if(scroller)scroller.scrollTop=prevScroll;
 }
});
setInterval(()=>{const clock=document.getElementById('v19Clock');if(clock)clock.textContent=personTime()},30000);
// Preserve existing brand; styles live in the companion CSS file.
render();
})();