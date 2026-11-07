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
  transfers,requestTransfer,executeTransfer,matchTransfer,cancelTransfer,transitBalance});
});
