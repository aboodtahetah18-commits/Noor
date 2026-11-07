/* ركائز 44 — محرك مركز مالي متغير لبنوك المنصة.
 * قيم مالية: هللات؛ حسابات قراءة فقط بدون تحويل أو شراء تلقائي.
 * تمثل المدخرات أرصدة مسجلة محليًا وليست أرصدة مصرفية تم التحقق منها.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.RakaezAdaptiveCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const periodRegex=/^20\d{2}-(0[1-9]|1[0-2])$/;
 const defaults=Object.freeze({hilal:2,malaa:3,assets:1});
 function money(n){return Number.isFinite(Number(n))?Math.max(0,Math.round(Number(n))):0;}
 function nonNegative(n){return Number.isFinite(Number(n))?Math.max(0,Number(n)):0;}
 function monthsPolicy(db){
  const raw=db?.rk44Policy||{};
  return Object.fromEntries(Object.entries(defaults).map(([k,v])=>[k,Number.isInteger(Number(raw[k]))&&Number(raw[k])>=1&&Number(raw[k])<=6?Number(raw[k]):v]));
 }
 function offset(period,change){
  if(!periodRegex.test(period))throw new Error('الشهر غير صحيح');
  const [year,month]=period.split('-').map(Number);
  const d=new Date(Date.UTC(year,month-1+change,1));
  return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0');
 }
 const sum=(items,selector)=>items.reduce((v,item)=>v+money(selector(item)),0);
 function debtList(db){
  return (Array.isArray(db?.debts)?db.debts:[]).filter(d=>money(d.principal)>money(d.paid));
 }
 function service(db){
  return sum(debtList(db),d=>d.installment);
 }
 function annualizedFee(db){
  return (Array.isArray(db?.fees)?db.fees:[]).reduce((n,f)=>{
   const factor=({monthly:12,quarterly:4,semiannual:2,annual:1,once:0})[f.period||'monthly']??12;
   return n+money(f.amount)*factor;
  },0);
 }
 function expenseEstimate(db,period){
  const raw=Array.isArray(db?.transactions)?db.transactions:[];
  const last6=Array.from({length:6},(_,i)=>offset(period,-i));
  const months=last6.map(p=>({
   period:p,
   total:sum(raw.filter(t=>t?.type==='expense'&&String(t.date||'').slice(0,7)===p),t=>t.amount)
  }));
  const withExpenses=months.filter(x=>x.total>0).slice(0,3);
  const actual=withExpenses.length?Math.round(sum(withExpenses,x=>x.total)/withExpenses.length):0;
  const monthlyBudget=sum((Array.isArray(db?.categories)?db.categories:[]).filter(c=>!c.archived),c=>Math.round(nonNegative(c.limit)*100));
  const salaryPlan=Math.round(money(db?.salary)*nonNegative(db?.ratios?.hilal)/100);
  // A second estimate includes commitments if not already present in transactions.
  // Taking the maximum (rather than adding to transactions) prevents counting
  // a paid installment or fee twice when it has its own expense transaction.
  const commitments=service(db)+Math.round(annualizedFee(db)/12);
  const plannedBase=monthlyBudget>0?monthlyBudget:salaryPlan;
  const need=Math.max(actual,plannedBase+commitments);
  return {actual,planned:plannedBase,commitments,need,
   monthsUsed:withExpenses.length,source:withExpenses.length?'مصروفات مسجلة ومخصصات مخططة':'مخصصات وتكاليف متوقعة',
   entries:withExpenses.map(x=>x.period)};
 }
 function savingsSummary(db){
  const slices=Array.isArray(db?.savings)?db.savings:[];
  const total=sum(slices,s=>s.balance);
  const instant=sum(slices.filter(s=>Number(s.days)===0),s=>s.balance);
  const soon=sum(slices.filter(s=>Number(s.days)>=0&&Number(s.days)<=3),s=>s.balance);
  let pending=0;
  for(const w of (Array.isArray(db?.withdrawals)?db.withdrawals:[])){
   const status=String(w.status||'').toLowerCase();
   if(['completed','paid','executed','fulfilled','cancelled','rejected','مكتمل','منفذ','ملغي','مرفوض'].includes(status))continue;
   pending+=money(w.amount);
  }
  return {total,instant,soon,pending,nowFree:Math.max(0,instant-pending),
   soonFree:Math.max(0,soon-pending)};
 }
 function heldHilal(db){
  const e=Array.isArray(db?.rk39?.events)?db.rk39.events:[];
  let held=0;
  for(const x of e){
   if(x.status!=='posted')continue;
   if(x.kind==='reserve-add'||x.kind==='reserve-opening')held+=money(x.amount);
   if(x.kind==='reserve-release')held-=money(x.amount);
  }
  return Math.max(0,held);
 }
 function invested(db){
  const list=Array.isArray(db?.holdings)?db.holdings:[];
  return {count:list.length,market:sum(list,h=>{
   if(h.kind==='محفظة استثمارية')return h.marketValue;
   return nonNegative(h.quantity)*nonNegative(h.price);
  })};
 }

 const bankNames=Object.freeze({hilal:'بنك الهلال',malaa:'بنك ملاءة',assets:'بنك الأصول'});
 const assert=(condition,message)=>{if(!condition)throw new Error(message);};
 const validAmount=n=>Number.isSafeInteger(n)&&n>0;
 const journalEntries=db=>Array.isArray(db?.ledgerEntries)?db.ledgerEntries:[];
 const transfers=db=>Array.isArray(db?.rk44Transfers)?db.rk44Transfers:[];
 function cashBalance(db,bank){
  assert(Object.prototype.hasOwnProperty.call(bankNames,bank),'البنك غير معروف.');
  const initial=Number(db?.ledgerOpening?.[bank]||0);
  let balance=Number.isSafeInteger(initial)?initial:0;
  for(const entry of journalEntries(db)){
   for(const line of (Array.isArray(entry.lines)?entry.lines:[])){
    if(line.account!==bank)continue;
    balance+=Number(line.debit||0)-Number(line.credit||0);
   }
  }
  return Number.isSafeInteger(balance)?balance:0;
 }
 function pendingLegacyHilal(db){
  return sum((Array.isArray(db?.rk39?.events)?db.rk39.events:[])
   .filter(e=>e.kind==='bank-transfer'&&['pending','confirmed'].includes(e.status)),e=>e.amount);
 }
 function availableBankCash(db,bank,excludeId){
  const committed=sum(transfers(db).filter(e=>e.from===bank&&e.status==='pending'&&e.id!==excludeId),e=>e.amount);
  const otherHolds=bank==='malaa'?savingsSummary(db).pending:bank==='hilal'?pendingLegacyHilal(db):0;
  return Math.max(0,cashBalance(db,bank)-committed-otherHolds);
 }
 function ensureOperations(db){
  assert(db&&typeof db==='object','قاعدة البيانات غير متاحة.');
  if(!Object.prototype.hasOwnProperty.call(db,'rk44Transfers'))db.rk44Transfers=[];
  assert(Array.isArray(db.rk44Transfers),'سجل تحويلات الحماية غير صالح.');
  assert(Array.isArray(db.ledgerEntries),'دفتر الأستاذ غير متاح؛ افتح الدفتر وسجّل رصيدًا موثقًا.');
  return db.rk44Transfers;
 }
 function operationId(){
  return 'rk44-'+(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():
   Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
 }
 function requestTransfer(db,input){
  assert(input&&Object.prototype.hasOwnProperty.call(bankNames,input.from)&&
   Object.prototype.hasOwnProperty.call(bankNames,input.to)&&input.from!==input.to,'اختر بنكين مختلفين.');
  assert(validAmount(input.amount),'أدخل مبلغًا صحيحًا بالهللة أكبر من صفر.');
  assert(availableBankCash(db,input.from)>=input.amount,'النقد المثبت في دفتر المصدر بعد الحجوزات لا يكفي لهذا الطلب.');
  const rows=ensureOperations(db);
  const op={id:operationId(),from:input.from,to:input.to,amount:input.amount,status:'pending',
   note:String(input.note||'').trim().slice(0,180),createdAt:new Date().toISOString(),
   executionReference:null,destinationReference:null,executedAt:null,matchedAt:null};
  rows.push(op);return op;
 }
 function findTransfer(db,id){
  const op=transfers(db).find(e=>e.id===id);
  assert(op,'تعذر العثور على طلب التحويل.');return op;
 }
 function reference(ref){
  const value=String(ref||'').trim();
  assert(value.length>=5&&value.length<=100,'أدخل مرجعًا موثقًا من 5 إلى 100 حرف.');
  return value;
 }
 function postTransferJournal(db,op,stage){
  const isOutgoing=stage==='out';
  const id='rk44-ledger-'+op.id+'-'+stage;
  assert(!journalEntries(db).some(e=>e.id===id),'سبق تسجيل قيد هذه المرحلة.');
  const lines=isOutgoing?
   [{account:'transit',debit:op.amount,credit:0},{account:op.from,debit:0,credit:op.amount}]:
   [{account:op.to,debit:op.amount,credit:0},{account:'transit',debit:0,credit:op.amount}];
  assert(lines.reduce((v,l)=>v+l.debit,0)===lines.reduce((v,l)=>v+l.credit,0),
   'القيد المحاسبي غير متوازن.');
  const entry={id,date:new Date().toISOString().slice(0,10),kind:'rk44-transfer',
   description:(isOutgoing?'تحويل قيد التنفيذ: ':'مطابقة وصول تحويل: ')+bankNames[op.from]+' ← '+bankNames[op.to],
   rk44TransferId:op.id,rk44Stage:stage,lines,createdAt:new Date().toISOString()};
  db.ledgerEntries.push(entry);
  return entry;
 }
 function executeTransfer(db,id,externalRef){
  ensureOperations(db);const op=findTransfer(db,id);
  assert(op.status==='pending','لا يمكن إثبات عملية ليست في مرحلة الطلب.');
  const ref=reference(externalRef);
  assert(!transfers(db).some(e=>e.id!==id&&e.executionReference===ref),'مرجع التنفيذ مستخدم سابقًا.');
  assert(availableBankCash(db,op.from,id)>=op.amount,'الرصيد المتاح لا يغطي التنفيذ؛ لم يتغير الدفتر.');
  const entry=postTransferJournal(db,op,'out');
  op.status='executed';op.executionReference=ref;op.executedAt=new Date().toISOString();
  return {operation:op,entry};
 }
 function transitBalance(db){
  return journalEntries(db).reduce((total,e)=>total+(Array.isArray(e.lines)?e.lines:[])
   .filter(l=>l.account==='transit').reduce((v,l)=>v+Number(l.debit||0)-Number(l.credit||0),0),0);
 }
 function matchTransfer(db,id,arrivalRef){
  ensureOperations(db);const op=findTransfer(db,id);
  assert(op.status==='executed','لا يمكن المطابقة قبل إثبات التنفيذ.');
  const ref=reference(arrivalRef);
  assert(!transfers(db).some(e=>e.id!==id&&e.destinationReference===ref),'مرجع الوصول مستخدم سابقًا.');
  assert(journalEntries(db).some(e=>e.rk44TransferId===op.id&&e.rk44Stage==='out'),
   'قيد خروج المبلغ غير موجود؛ لا يمكن مطابقة الوصول.');
  assert(transitBalance(db)>=op.amount,'حساب المبالغ قيد التحويل لا يغطي المطابقة.');
  const entry=postTransferJournal(db,op,'in');
  op.status='matched';op.destinationReference=ref;op.matchedAt=new Date().toISOString();
  return {operation:op,entry};
 }
 function cancelTransfer(db,id){
  ensureOperations(db);const op=findTransfer(db,id);
  assert(op.status==='pending','لا يمكن إلغاء تحويل خرج فعليًا دون إجراء تصحيح مستقل.');
  op.status='cancelled';op.cancelledAt=new Date().toISOString();return op;
 }


 /* سياسة الانطلاقة: مبالغ مخططة فقط. لا تصنع نقدًا ولا تعدّل البيانات التاريخية. */

 /* بيانات الانطلاقة الموثقة منفصلة تمامًا عن بيانات العرض التجريبية القديمة.
  * كل مبلغ بالهللة. لا تتأثر القيود والأرصدة عند حفظ إعدادات البدء.
  */
 const onboardingFields=['income','essentials','obligations','recurring'];
 const startBanks=['hilal','malaa','assets'];
 function onboardingState(db,period){
  const month=periodRegex.test(String(period))?period:new Date().toISOString().slice(0,7);
  const saved=db?.rk44VerifiedStart;
  if(!saved||saved.version!==1||!saved.approvedAt)return {
   phase:'unverified',period:month,startMonth:periodRegex.test(db?.rk44StartSchedule?.startMonth||'')?db.rk44StartSchedule.startMonth:null,verified:false,missing:
   ['الراتب الفعلي','المصروفات الأساسية','الأقساط','الرسوم والالتزامات الأخرى','أرصدة افتتاح البنوك']
  };
  const ready=onboardingFields.every(key=>Number.isSafeInteger(saved[key])&&saved[key]>=0)
   &&startBanks.every(k=>Number.isSafeInteger(saved.opening?.[k])&&saved.opening[k]>=0)
   &&periodRegex.test(saved.startMonth);
  if(!ready)return {phase:'unverified',period:month,startMonth:null,verified:false,missing:['إعادة مراجعة بيانات البداية']};
  return {phase:month<saved.startMonth?'scheduled':'active',period:month,startMonth:saved.startMonth,
   verified:true,missing:[],source:'بيانات أدخلها المستخدم واعتمدها',values:saved};
 }

 function scheduleNextMonth(db,baseMonth){
  assert(db&&typeof db==='object','بيانات المنصة غير متاحة.');
  const now=periodRegex.test(String(baseMonth))?baseMonth:new Date().toISOString().slice(0,7);
  const old=db.rk44StartSchedule;
  if(old?.approvedAt)return old;
  assert(!Array.isArray(db.rk44VerifiedMonths)||db.rk44VerifiedMonths.length===0,
   'لا يجوز إعادة جدولة بداية مالية بدأت فعليًا.');
  const record={version:1,startMonth:offset(now,1),approvedAt:new Date().toISOString(),
   reason:'بدء دورة كاملة من الشهر القادم دون مطالبة بعمليات الشهر الجزئي'};
  db.rk44StartSchedule=record;return record;
 }

 function confirmFinancialStart(db,input,baseMonth){
  assert(db&&typeof db==='object'&&input,'بيانات البداية غير متاحة.');
  const now=periodRegex.test(String(baseMonth))?baseMonth:new Date().toISOString().slice(0,7);
  const received={};
  for(const k of onboardingFields){
   assert(typeof input[k]==='number'&&Number.isSafeInteger(input[k])&&input[k]>=0&&input[k]<=100000000000,
    'الراتب والمصروفات والأقساط والرسوم يجب أن تكون مبالغ مؤكدة بالهللة؛ الصفر مسموح.');
   received[k]=input[k];
  }
  // صفر الدخل مقبول إذا أكده المستخدم صراحة؛ لا يُفسر الحقل الفارغ كصفر.
  const opening={};
  for(const k of startBanks){
   const v=input.opening?.[k];
   assert(typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=100000000000,
    'أدخل الرصيد الافتتاحي المؤكد لكل بنك، أو صفرًا إن لم يكن فيه رصيد.');
   opening[k]=v;
  }
  const startMonth=periodRegex.test(db?.rk44StartSchedule?.startMonth||'')?
   db.rk44StartSchedule.startMonth:periodRegex.test(db?.rk44VerifiedStart?.startMonth||'')?
   db.rk44VerifiedStart.startMonth:offset(now,1);
  const original=db.rk44VerifiedStart;
  if(original?.startMonth&&original.startMonth<=now &&
     (Array.isArray(db.rk44VerifiedMonths)&&db.rk44VerifiedMonths.length)){
   throw new Error('بدأت دورة موثقة بالفعل؛ لا يجوز تغيير أساس الأشهر السابقة. استخدم تحديثًا مؤرخًا للدورة التالية.');
  }
  const entry={version:1,...received,opening,startMonth,
   approvedAt:new Date().toISOString(),beginMode:'next-full-month',
   priorDataPreserved:true};
  db.rk44VerifiedStart=entry;
  return entry;
 }
 function verifiedStarterPlan(db,period,limit){
  const status=onboardingState(db,period);
  if(!status.verified)return {ready:false,phase:status.phase,startMonth:status.startMonth,missing:status.missing};
  const p=status.values;
  const baselineCosts=p.essentials+p.obligations+p.recurring;
  // Use whichever is greater: approved full-month cost estimate or actual posted expenses.
  // Do not add transactions to the baseline or an installment may be counted twice.
  const recordedExpenses=sum((Array.isArray(db?.transactions)?db.transactions:[])
   .filter(t=>t?.type==='expense'&&String(t.date||'').slice(0,7)===period),t=>t.amount);
  const costs=Math.max(baselineCosts,recordedExpenses);
  const rawSurplus=p.income-costs;
  const affordable=Math.max(0,rawSurplus);
  const amount=limit===undefined?affordable:limit;
  assert(Number.isSafeInteger(amount)&&amount>=0&&amount<=affordable,
   'الفائض المعتمد لا يمكن أن يتجاوز المتبقي بعد جميع الالتزامات.');
  // المرحلة الأولى: التزامات الهلال القريبة، ثم ضروريات ملاءة؛
  // لا يوجد هدف استثماري مفترض، ولا يُجمع المبلغ نفسه مرتين.
  const stageTargets={hilal:p.obligations+p.recurring,malaa:p.essentials,assets:null};
  const hilalGap=Math.max(0,stageTargets.hilal-p.opening.hilal);
  const malaaGap=Math.max(0,stageTargets.malaa-p.opening.malaa);
  const hilal=Math.min(amount,hilalGap);
  const malaaEmergency=Math.min(amount-hilal,malaaGap);
  const malaaSavings=Math.max(0,amount-hilal-malaaEmergency);
  const allocation={hilal,malaaEmergency,malaaSavings,assets:0};
  assert(Object.values(allocation).reduce((sum,x)=>sum+x,0)===amount,'لا تتوازن خطة الشهر.');
  return {ready:true,phase:status.phase,startMonth:status.startMonth,period,
   income:p.income,essentials:p.essentials,obligations:p.obligations,recurring:p.recurring,
   baselineCosts,recordedExpenses,costs,rawSurplus,affordable,amount,opening:{...p.opening},
   stageTargets,stageGaps:{hilal:hilalGap,malaa:malaaGap},
   allocation,investedAvailable:false,assetsGoal:null,
   note:'مرحلة حماية أولية مشتقة من البيانات المؤكدة. لا تُرحّل أي أموال أو استثمارات.',
   monthlyHistory:(Array.isArray(db?.rk44VerifiedMonths)?db.rk44VerifiedMonths:[]).filter(e=>e.period===period)};
 }
 function approveVerifiedMonth(db,period,amount){
  const plan=verifiedStarterPlan(db,period,amount);
  assert(plan.ready&&plan.phase==='active','الشهر القادم هو بداية الدورة الكاملة؛ لا تطالب الأشهر السابقة بالتخصيص.');
  assert(plan.income===0||(Array.isArray(db.salaryMonths)&&db.salaryMonths.includes(period)),
   'سجّل استلام راتب هذا الشهر قبل اعتماد الفائض، دون تسجيل أشهر فاتت.');
  assert(!plan.monthlyHistory.length,'اعتمدت خطة هذا الشهر مسبقًا، ولن تتكرر.');
  const entry={id:operationId(),period,kind:'verified-month-plan',amount:plan.amount,
   allocation:{...plan.allocation},source:'confirmed-onboarding',status:'planned',
   approvedAt:new Date().toISOString(),description:'توزيع تخطيطي دون إضافة نقد أو تغيير أرصدة البنوك'};
  if(!Array.isArray(db.rk44VerifiedMonths))db.rk44VerifiedMonths=[];
  db.rk44VerifiedMonths.push(entry);return entry;
 }

 const starterDefaults=Object.freeze({
  monthlySurplus:0,
  milestones:Object.freeze({hilal:0,malaa:0,assets:0}),
  shares:Object.freeze({hilal:0,malaaEmergency:0,malaaSavings:0,assets:0}),
  yieldShares:Object.freeze({malaa:0,assets:0})
 });
 const starterKeys=Object.keys(starterDefaults.shares);
 function safeCents(value,limit=100000000000){
  assert(Number.isSafeInteger(value)&&value>=0&&value<=limit,'أدخل مبلغًا صحيحًا بالهللة ضمن الحد المسموح.');
  return value;
 }
 function validShares(shares,keys){
  assert(shares&&typeof shares==='object','النسب غير متاحة.');
  let total=0;
  for(const k of keys){
   const part=Number(shares[k]);
   assert(Number.isInteger(part)&&part>=0&&part<=10000,'نسبة التوزيع غير صالحة.');
   total+=part;
  }
  assert(total===10000,'يجب أن يساوي مجموع النسب 100%.');
  return Object.fromEntries(keys.map(k=>[k,Number(shares[k])]));
 }
 function starterPolicy(db){
  const raw=db?.rk44StarterPolicy;
  if(!raw)return {
   monthlySurplus:starterDefaults.monthlySurplus,
   milestones:{...starterDefaults.milestones},
   shares:{...starterDefaults.shares},
   yieldShares:{...starterDefaults.yieldShares},
   configured:false
  };
  try{
   const monthlySurplus=safeCents(Number(raw.monthlySurplus),50000000);
   const milestones=Object.fromEntries(Object.keys(starterDefaults.milestones).map(k=>
    [k,safeCents(Number(raw.milestones?.[k]),100000000000)]));
   return {monthlySurplus,milestones,
    shares:validShares(raw.shares,starterKeys),
    yieldShares:validShares(raw.yieldShares,['malaa','assets']),
    configured:raw.version>=2&&onboardingState(db,new Date().toISOString().slice(0,7)).verified};
  }catch(e){
   // Fail safe: no invalid policy is ever interpreted as authority to spend.
   return {...starterPolicy({}),invalid:true};
  }
 }
 function splitAmounts(amount,shares,keys){
  safeCents(amount);
  const ratios=validShares(shares,keys);
  const values={};let allocated=0;
  keys.forEach((key,i)=>{
   const value=i===keys.length-1?amount-allocated:Math.floor(amount*ratios[key]/10000);
   values[key]=value;allocated+=value;
  });
  return values;
 }
 function starterProjection(db,period,customSurplus){
  assert(periodRegex.test(period),'الشهر غير صالح.');
  const policy=starterPolicy(db);
  if(!policy.configured)return {ready:false,period,amount:null,allocation:null,policy,protection:null,
   investedAvailable:false,monthlyHistory:[],reason:'لا توجد سياسة موثقة قابلة للتنفيذ'};
  const amount=customSurplus===undefined?policy.monthlySurplus:safeCents(customSurplus,50000000);
  const allocation=splitAmounts(amount,policy.shares,starterKeys);
  const protection=assess(db,period);
  const investedAvailable=allocation.assets>0 &&
   protection.investmentCandidate>=allocation.assets && !policy.invalid;
  const total=Object.values(allocation).reduce((a,b)=>a+b,0);
  assert(total===amount,'فشل توازن توزيع الفائض.');
  return {period,amount,allocation,policy,protection,investedAvailable,
   salaryRegistered:Array.isArray(db?.salaryMonths)&&db.salaryMonths.includes(period),
   monthlyHistory:(Array.isArray(db?.rk44StarterMonths)?db.rk44StarterMonths:[])
    .filter(r=>r.period===period)};
 }
 function saveStarterPolicy(db,input){
  assert(db&&typeof db==='object','بيانات المنصة غير متاحة.');
  const monthlySurplus=safeCents(input?.monthlySurplus,50000000);
  const milestones={};
  for(const k of Object.keys(starterDefaults.milestones)){
   milestones[k]=safeCents(input?.milestones?.[k],100000000000);
  }
  const shares=validShares(input?.shares,starterKeys);
  const yieldShares=validShares(input?.yieldShares,['malaa','assets']);
  assert(onboardingState(db,new Date().toISOString().slice(0,7)).verified,
   'لا يمكن اعتماد توزيع مالي قبل تأكيد بيانات البداية.');
  const next={version:2,monthlySurplus,milestones,shares,yieldShares,
   approvedAt:new Date().toISOString()};
  db.rk44StarterPolicy=next;
  return next;
 }
 function approveStarterMonth(db,period,amount){
  assert(periodRegex.test(period),'الشهر غير صالح.');
  assert(starterPolicy(db).configured&&!starterPolicy(db).invalid,'اعتمد إعدادات الانطلاقة أولًا.');
  assert(Array.isArray(db?.salaryMonths)&&db.salaryMonths.includes(period),
   'سجّل استلام راتب الشهر في دورة الراتب قبل اعتماد خطة توزيع فائضه.');
  const existing=Array.isArray(db.rk44StarterMonths)?db.rk44StarterMonths:[];
  assert(!existing.some(r=>r.period===period),'سبق اعتماد خطة لهذا الشهر، لا يجوز تكرارها.');
  const projection=starterProjection(db,period,amount);
  assert(projection.amount<=money(db?.salary),'الفائض المدخل يتجاوز الراتب المسجل؛ راجع القيمة.');
  const record={id:operationId(),period,kind:'starter-plan',amount:projection.amount,
   allocation:{...projection.allocation},
   milestones:{...projection.policy.milestones},
   shares:{...projection.policy.shares},
   status:'planned',approvedAt:new Date().toISOString(),
   description:'توزيع تخطيطي بعد الالتزامات — لا ينشئ نقدًا ولا يحوّل بين البنوك'};
  if(!Array.isArray(db.rk44StarterMonths))db.rk44StarterMonths=[];
  db.rk44StarterMonths.push(record);
  return record;
 }
 function yieldRecords(db){return Array.isArray(db?.rk44Yields)?db.rk44Yields:[];}
 function recordRealizedYield(db,input){
  assert(db&&Array.isArray(db.ledgerEntries),'يجب تفعيل دفتر الأستاذ قبل تسجيل العائد.');
  const amount=safeCents(input?.amount);
  assert(amount>0,'مبلغ العائد يجب أن يكون أكبر من صفر.');
  const ref=reference(input?.reference);
  const date=String(input?.date||'');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(date)&&
   new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date,'تاريخ العائد غير صحيح.');
  assert(!yieldRecords(db).some(r=>r.reference===ref),'مرجع هذا العائد مسجل مسبقًا.');
  assert(starterPolicy(db).configured,'لا يمكن افتراض نسب توزيع العوائد. راجع بياناتك ونسب التوزيع واعتمدها أولًا.');
  const ratios=starterPolicy(db).yieldShares;
  const splits=splitAmounts(amount,ratios,['malaa','assets']);
  const id=operationId();
  const journal={id:'rk44-yield-entry-'+id,date,kind:'rk44-yield',
   description:'إثبات عائد مالي محصل لبنك الهلال — '+ref,
   rk44YieldId:id,lines:[
    {account:'hilal',debit:amount,credit:0},
    {account:'yieldIncome',debit:0,credit:amount}
   ],createdAt:new Date().toISOString()};
  assert(!journalEntries(db).some(e=>e.id===journal.id),'قيد العائد مكرر.');
  const row={id,kind:'realized-yield',sourceBank:'hilal',amount,reference:ref,
   date,note:String(input.note||'').trim().slice(0,180),status:'recorded',
   ratios:{...ratios},splitAmounts:splits,
   transferIds:{malaa:null,assets:null},journalId:journal.id,
   recordedAt:new Date().toISOString()};
  db.ledgerEntries.push(journal);
  if(!Array.isArray(db.rk44Yields))db.rk44Yields=[];
  db.rk44Yields.push(row);
  return row;
 }
 function requestYieldSplit(db,yieldId,targetBank){
  assert(['malaa','assets'].includes(targetBank),'جهة توزيع العائد غير صحيحة.');
  const row=yieldRecords(db).find(y=>y.id===yieldId);
  assert(row&&row.status==='recorded','العائد غير موجود أو تم عكسه.');
  const priorId=row.transferIds[targetBank];
  const prior=priorId?transfers(db).find(x=>x.id===priorId):null;
  assert(!priorId||(prior&&prior.status==='cancelled'),'سبق تسجيل طلب تحويل قائم أو منفذ لهذا الجزء من العائد.');
  const amount=row.splitAmounts[targetBank];
  assert(validAmount(amount),'لا يوجد مبلغ قابل للتحويل.');
  if(targetBank==='assets'){
   const assessment=assess(db,row.date.slice(0,7));
   assert(!assessment.warning && assessment.investmentCandidate>=amount,
    'توزيع الاستثمار مؤجل حتى استكمال السيولة الوقائية وتوفر فائض نقدي فعلي.');
  }
  const request=requestTransfer(db,{from:'hilal',to:targetBank,amount,
   note:'توزيع العائد المحصل '+row.reference});
  request.sourceYieldId=yieldId;
  row.transferIds[targetBank]=request.id;
  return request;
 }
 function reverseYield(db,id,reason){
  const row=yieldRecords(db).find(y=>y.id===id);
  assert(row&&row.status==='recorded','العائد غير قابل للعكس.');
  assert(!Object.values(row.transferIds).some(tid=>{
   if(!tid)return false;
   const op=transfers(db).find(t=>t.id===tid);
   return !op||op.status!=='cancelled';
  }),'لا يمكن عكس العائد ما دامت له تحويلات قائمة أو منفذة؛ ألغ الطلبات المعلقة أولًا.');
  const why=String(reason||'').trim();
  assert(why.length>=5,'اكتب سبب تصحيح العائد (خمسة أحرف على الأقل).');
  const original=journalEntries(db).find(e=>e.id===row.journalId);
  assert(original,'قيد العائد الأصلي غير موجود.');
  assert(availableBankCash(db,'hilal')>=row.amount,'النقد الحالي لا يكفي لعكس العائد.');
  const reverseId='rk44-yield-reversal-'+id;
  assert(!journalEntries(db).some(e=>e.id===reverseId),'سبق عكس العائد.');
  db.ledgerEntries.push({id:reverseId,kind:'rk44-yield-reversal',
   date:new Date().toISOString().slice(0,10),description:'تصحيح العائد '+row.reference,
   reversalOf:row.journalId,rk44YieldId:id,
   lines:original.lines.map(l=>({account:l.account,debit:l.credit,credit:l.debit})),
   createdAt:new Date().toISOString()});
  row.status='reversed';row.reversedAt=new Date().toISOString();row.reversalReason=why;
  return row;
 }


 /* استكمال التأسيس: تصنيف قابل للتصحيح، إعالة بدوريات مختلفة، وديون مرنة في السجل الأصلي. */
 const categoryRules=[
  ['التزامات',/(?:قسط|قرض|دين|تمويل|سلفة|سداد)/],
  ['تعليم',/(?:مدرس|رسوم دراس|جامع|تعليم|دروس)/],
  ['صحة',/(?:علاج|طبيب|دواء|مستشفى|أسنان|صحة)/],
  ['أسرة وإعالة',/(?:نفقة|والد|والدة|أبناء|طفل|أطفال|عائلة|أسرة|معال)/],
  ['سكن وفواتير',/(?:إيجار|سكن|كهرباء|ماء|انترنت|إنترنت|اتصالات|جوال)/],
  ['معيشة',/(?:مقاضي|بقالة|غذاء|طعام|خبز|سوبر|تموين)/],
  ['تنقل',/(?:وقود|بنزين|سيارة|مواصلات|نقل|صيانة مركبة)/],
  ['ترفيه وكماليات',/(?:مطعم|كافيه|قهوة|ترفيه|تسوق|كماليات|ألعاب)/],
  ['أهداف مستقبلية',/(?:سفر|منزل جديد|زواج|هدف|ادخار|استثمار)/]
 ];
 const categoryLabels=Object.freeze(['التزامات','تعليم','صحة','أسرة وإعالة',
  'سكن وفواتير','معيشة','تنقل','ترفيه وكماليات','أهداف مستقبلية','أخرى']);
 function categorySuggestion(name){
  const text=String(name||'').trim();
  if(!text)return {category:null,confidence:'غير محدد',reason:'اكتب اسم البند أولاً'};
  for(const [category,pattern] of categoryRules){
   if(pattern.test(text))return {category,confidence:'اقتراح قابل للتعديل',
    reason:'تصنيف مبدئي بناءً على كلمات اسم البند، وليس حكمًا ملزمًا على ضرورته'};
  }
  return {category:null,confidence:'بحاجة لمراجعة المستخدم',
   reason:'الاسم غير واضح؛ لن يُفرض تصنيف تلقائي'};
 }
 function monthlyEquivalent(amount,frequency){
  assert(Number.isSafeInteger(amount)&&amount>=0,'المبلغ الدوري يجب أن يكون بالهللة وغير سالب.');
  const ratios={daily:[365,12],weekly:[52,12],monthly:[1,1],yearly:[1,12],none:[0,1]};
  if(frequency==='asNeeded')return null;
  assert(Object.hasOwn(ratios,frequency),'دورية المصروف غير معروفة.');
  const [n,d]=ratios[frequency];
  return Math.round(amount*n/d);
 }
 function userDetails(db){
  const source=db?.rk44UserDetails;
  return source&&Array.isArray(source.items)&&Array.isArray(source.dependents)?
   source:{items:[],dependents:[],updatedAt:null};
 }
 function userDetailsSummary(db){
  const source=userDetails(db);
  const items=source.items.map(i=>({...i,monthly:monthlyEquivalent(i.amount,i.frequency)}));
  const dependents=source.dependents.map(d=>({...d,
   monthly:d.includedInItems?0:monthlyEquivalent(d.amount,d.frequency)}));
  const known=[...items,...dependents].filter(x=>x.monthly!==null);
  return {items,dependents,monthlyKnown:known.reduce((a,b)=>a+b.monthly,0),
   incomplete:[...items,...dependents].filter(x=>x.monthly===null).length,
   // This is a parallel estimate, NEVER added to aggregate costs unless explicitly reconciled.
   reconciledIntoBudget:false};
 }
 function saveUserDetails(db,input){
  assert(db&&typeof db==='object','البيانات غير متاحة.');
  assert(Array.isArray(input?.items)&&Array.isArray(input?.dependents) &&
   input.items.length<=100&&input.dependents.length<=40,'عدد الإدخالات غير صالح.');
  const make=(record,type,index)=>{
   const name=String(record?.name||'').trim();
   assert(name.length>=2&&name.length<=100,'أدخل اسمًا واضحًا لا يتجاوز مئة حرف.');
   const amount=record?.amount;
   safeCents(amount,100000000000);
   const frequency=String(record?.frequency||'');
   monthlyEquivalent(amount,frequency);
   const id=String(record?.id||operationId()).slice(0,80);
   if(type==='item'){
    const picked=String(record?.category||'');
    assert(categoryLabels.includes(picked),'اختر تصنيفًا معتمدًا، أو اختر أخرى.');
    return {id,name,amount,frequency,category:picked,categorySource:
     record.categorySource==='manual'?'manual':'suggestion'};
   }
   return {id,name,amount,frequency,relation:String(record.relation||'غير محدد').slice(0,60),
    includedInItems:record.includedInItems===true};
  };
  const items=input.items.map((v,i)=>make(v,'item',i));
  const dependents=input.dependents.map((v,i)=>make(v,'dependent',i));
  const ids=[...items,...dependents].map(x=>x.id);
  assert(ids.length===new Set(ids).size,'هناك معرفات متكررة.');
  const prior=userDetails(db);
  const next={items,dependents,updatedAt:new Date().toISOString(),
   version:1,forecastMode:'separate-until-reconciled'};
  if(!Array.isArray(db.rk44UserDetailsHistory))db.rk44UserDetailsHistory=[];
  if(prior.updatedAt)db.rk44UserDetailsHistory.push({...prior});
  db.rk44UserDetails=next;
  return next;
 }
 function saveFlexibleDebt(db,input){
  assert(db&&typeof db==='object','البيانات غير متاحة.');
  const name=String(input?.name||'').trim();
  assert(name.length>=2&&name.length<=100,'اكتب اسم الدين أو الجهة.');
  const amount=safeCents(input?.amount,100000000000);
  assert(amount>0,'أدخل مبلغًا متبقيًا أكبر من صفر.');
  if(!Array.isArray(db.debts))db.debts=[];
  const row={id:operationId(),name,principal:amount,paid:0,installment:0,date:'',
   rate:0,notes:'التزام مرن بلا موعد إلزامي، يتحدد السداد بعد حماية الاحتياجات وبموافقة المستخدم',
   repaymentMode:'capacity',createdAt:new Date().toISOString()};
  db.debts.push(row);
  return row;
 }
 function flexibleRepaymentPreview(db,opts){
  const before=opts?.previousIncome,now=opts?.currentIncome,protectedAmount=opts?.protectedAmount;
  if(![before,now,protectedAmount].every(x=>Number.isSafeInteger(x)&&x>=0)){
   return {ready:false,reason:'يلزم الدخل السابق والحالي ومبلغ حماية الالتزامات والمصروفات قبل اقتراح دفعة.'};
  }
  const verified=onboardingState(db,opts.period);
  if(!verified.verified)return {ready:false,reason:'لم تعتمد بيانات المصروفات والالتزامات؛ لا يمكن ترشيح سداد.'};
  const p=verifiedStarterPlan(db,opts.period);
  const costs=p.costs;
  const newFree=Math.max(0,now-costs-protectedAmount);
  const oldFree=Math.max(0,before-costs-protectedAmount);
  const extraFree=Math.max(0,newFree-oldFree);
  const growth=before>0?(now-before)/before:null;
  const debts=(Array.isArray(db.debts)?db.debts:[]).filter(d=>d.repaymentMode==='capacity')
   .map(d=>({...d,remaining:Math.max(0,Number(d.principal||0)-Number(d.paid||0))}))
   .filter(d=>d.remaining>0);
  return {ready:true,previousIncome:before,currentIncome:now,growth,
   costs,protectedAmount,newFree,oldFree,extraFree,debts,
   // No automatic collection. This ceiling is never a required or approved payment.
   ceiling:Math.min(extraFree,debts.reduce((a,b)=>a+b.remaining,0)),
   warning:now<before||now<costs+protectedAmount||p.rawSurplus<0,
   requiresApproval:true};
 }

 function assess(db,period,overrides){
  const reference=periodRegex.test(String(period))?period:new Date().toISOString().slice(0,7);
  const policy=monthsPolicy(db);
  const opts=overrides||{};
  const extraLoan=money(opts.loanAmount),extraInstallment=money(opts.loanInstallment);
  const expenseShock=money(opts.extraMonthlyExpense),liquidityShock=money(opts.liquidityReduction);
  const estimate=expenseEstimate(db,reference);
  const outstanding=sum(debtList(db),d=>money(d.principal)-money(d.paid))+extraLoan;
  const debtMonthly=service(db)+extraInstallment;
  const commitments=debtMonthly+Math.round(annualizedFee(db)/12);
  // Simulated debt service is an incremental prospective obligation.
  const baseNeed=Math.max(estimate.actual+expenseShock,estimate.planned+commitments+expenseShock);
  const riskBuffer=Math.round(outstanding*0.05);
  const salary=opts.salaryOverride===undefined?money(db?.salary):money(opts.salaryOverride);
  const debtRatio=salary?debtMonthly/salary:null;
  const debtToYearIncome=salary?outstanding/(salary*12):outstanding?Infinity:0;
  const costToIncome=salary?baseNeed/salary:baseNeed?Infinity:0;
  // Consider a large outstanding loan even if its current installment is small.
  const severe=(debtRatio!==null&&debtRatio>=0.5)||debtToYearIncome>=2.5||costToIncome>1;
  const warning=severe||(debtRatio!==null&&debtRatio>=0.35)||debtToYearIncome>=1.25||costToIncome>=0.9;
  const dynamicTarget=(months,weight)=>
   Math.max(0,Math.round(baseNeed*months+riskBuffer*weight));
  const saved=savingsSummary(db),capital=invested(db);
  if(liquidityShock){saved.nowFree=Math.max(0,saved.nowFree-liquidityShock);saved.soonFree=Math.max(0,saved.soonFree-liquidityShock);}
  const hilalTarget=dynamicTarget(policy.hilal,0.4);
  const malaaTarget=dynamicTarget(policy.malaa,1);
  // Additional liquid cushion that remains untouched before any new investment.
  // The assets-bank protection-month control must affect the eligibility rule.
  const investmentSafetyBuffer=dynamicTarget(policy.assets,0.5);
  const held=heldHilal(db);
  const protectionRequired=hilalTarget+malaaTarget;
  const recordedGapToProtection=Math.max(0,protectionRequired-saved.soonFree);
  const observedMonths=estimate.monthsUsed;
  const salaryHistory=Array.isArray(db?.salaryMonths)?db.salaryMonths:[];
  const incomeRecorded=salaryHistory.some(p=>p===reference||p===offset(reference,-1)||p===offset(reference,-2));
  // Only surplus AFTER both banks' liquidity protection can be considered.
  // 12-day savings and market holdings are never treated as emergency cash.
  const ledgerCash=availableBankCash(db,'malaa');
  const reconciledCash=Math.min(saved.soonFree,ledgerCash);
  const gapToProtection=Math.max(0,protectionRequired-reconciledCash);
  const eligibleCash=Math.max(0,reconciledCash-protectionRequired-investmentSafetyBuffer);
  const investmentCandidate=(severe||warning||observedMonths<2||!incomeRecorded)?0:eligibleCash;
  const pressure=severe?'حرج':warning?'مرتفع':
   saved.nowFree<baseNeed||gapToProtection>0?'بحاجة إلى تعزيز السيولة':'تحت المتابعة';
  return {
   period:reference,policy,monthlyNeed:baseNeed,
   estimate:{...estimate,commitments,loanMonthly:debtMonthly,monthlyFees:Math.round(annualizedFee(db)/12)},
   riskBuffer,outstanding,debtMonthly,debtRatio,debtToYearIncome,costToIncome,
   pressure,critical:severe,warning,protectionRequired,gapToProtection,recordedGapToProtection,
   liquidityPlan:{immediateRequired:Math.max(commitments,Math.round(baseNeed*0.5)),
    upcomingCommitments:commitments,liquidRecorded:saved.soonFree,
    reconciledCash,investmentBuffer:investmentSafetyBuffer,investable:investmentCandidate,
    ledgerBalances:Object.fromEntries(Object.keys(bankNames).map(k=>[k,cashBalance(db,k)])),
    transit:transitBalance(db)},
   stress:{extraMonthlyExpense:expenseShock,liquidityReduction:liquidityShock,salary},
   incomeRecorded,observedMonths,eligibleCash,investmentSafetyBuffer,
   savings:saved,investment:capital,investmentCandidate,
   banks:{
    hilal:{target:hilalTarget,recorded:held,coverage:hilalTarget?held/hilalTarget:1,
      gap:Math.max(0,hilalTarget-held),kind:'تخصيص داخلي',confirmedLiquid:false},
    malaa:{target:malaaTarget,recorded:saved.soonFree,instant:saved.nowFree,
      confirmedCash:reconciledCash,coverage:malaaTarget?reconciledCash/malaaTarget:1,
      gap:Math.max(0,malaaTarget-reconciledCash),kind:'سيولة مسجلة خلال ثلاثة أيام — التغطية بحسب النقد المطابق',confirmedLiquid:false},
    assets:{target:investmentCandidate,recorded:null,coverage:null,gap:null,kind:'استثمار الفائض بعد تغطية الحماية',
      safetyBuffer:investmentSafetyBuffer,confirmedLiquid:false,market:capital.market}
   }
  };
 }
 function installment(amount,months,annualPercent){
  const principal=money(amount),term=Number(months),rate=Number(annualPercent);
  if(!Number.isInteger(term)||term<1||term>600)throw new Error('مدة القرض يجب أن تكون بين شهر و600 شهر.');
  if(!Number.isFinite(rate)||rate<0||rate>100)throw new Error('المعدل السنوي غير صحيح.');
  if(principal<1)throw new Error('أدخل مبلغ قرض أكبر من صفر.');
  const r=rate/1200;
  return Math.round(r===0?principal/term:principal*r/(1-Math.pow(1+r,-term)));
 }
 function scenario(db,period,loanRiyals,term,annualPercent){
  const cents=money(Number(loanRiyals)*100);
  const monthly=installment(cents,term,annualPercent);
  const before=assess(db,period);
  const after=assess(db,period,{loanAmount:cents,loanInstallment:monthly});
  return {before,after,monthly,loanAmount:cents,
   increase:after.banks.malaa.target-before.banks.malaa.target,
   debtRatio:after.debtRatio};
 }
 return Object.freeze({defaults,monthsPolicy,offset,expenseEstimate,savingsSummary,
  debtList,assess,installment,scenario,bankNames,cashBalance,availableBankCash,
  transfers,requestTransfer,executeTransfer,matchTransfer,cancelTransfer,transitBalance,
  starterDefaults,starterPolicy,starterProjection,saveStarterPolicy,approveStarterMonth,
  splitAmounts,yieldRecords,recordRealizedYield,requestYieldSplit,reverseYield,
  onboardingState,scheduleNextMonth,confirmFinancialStart,verifiedStarterPlan,approveVerifiedMonth,
  categorySuggestion,categoryLabels,monthlyEquivalent,userDetails,userDetailsSummary,
  saveUserDetails,saveFlexibleDebt,flexibleRepaymentPreview});
});
