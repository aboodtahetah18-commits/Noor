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
 function assess(db,period,overrides){
  const reference=periodRegex.test(String(period))?period:new Date().toISOString().slice(0,7);
  const policy=monthsPolicy(db);
  const opts=overrides||{};
  const extraLoan=money(opts.loanAmount),extraInstallment=money(opts.loanInstallment);
  const estimate=expenseEstimate(db,reference);
  const outstanding=sum(debtList(db),d=>money(d.principal)-money(d.paid))+extraLoan;
  const debtMonthly=service(db)+extraInstallment;
  const commitments=debtMonthly+Math.round(annualizedFee(db)/12);
  // Simulated debt service is an incremental prospective obligation.
  const baseNeed=Math.max(estimate.actual,estimate.planned+commitments);
  const riskBuffer=Math.min(Math.round(outstanding*0.08),baseNeed*2);
  const salary=money(db?.salary);
  const debtRatio=salary?debtMonthly/salary:null;
  const debtToYearIncome=salary?outstanding/(salary*12):outstanding?Infinity:0;
  const costToIncome=salary?baseNeed/salary:baseNeed?Infinity:0;
  // Consider a large outstanding loan even if its current installment is small.
  const severe=(debtRatio!==null&&debtRatio>=0.5)||debtToYearIncome>=2.5||costToIncome>1;
  const warning=severe||(debtRatio!==null&&debtRatio>=0.35)||debtToYearIncome>=1.25||costToIncome>=0.9;
  const dynamicTarget=(months,weight)=>
   Math.max(0,Math.round(baseNeed*months+riskBuffer*weight));
  const saved=savingsSummary(db),capital=invested(db);
  const hilalTarget=dynamicTarget(policy.hilal,0.4);
  const malaaTarget=dynamicTarget(policy.malaa,1);
  const assetsTarget=dynamicTarget(policy.assets,0.5);
  const held=heldHilal(db);
  const protectionRequired=hilalTarget+malaaTarget;
  const gapToProtection=Math.max(0,protectionRequired-saved.soonFree);
  const observedMonths=estimate.monthsUsed;
  const salaryHistory=Array.isArray(db?.salaryMonths)?db.salaryMonths:[];
  const incomeRecorded=salaryHistory.some(p=>p===reference||p===offset(reference,-1)||p===offset(reference,-2));
  // Only surplus AFTER both banks' liquidity protection can be considered.
  // 12-day savings and market holdings are never treated as emergency cash.
  const eligibleCash=Math.max(0,saved.soonFree-protectionRequired);
  const investmentCandidate=(severe||warning||observedMonths<2||!incomeRecorded)?0:eligibleCash;
  const pressure=severe?'حرج':warning?'مرتفع':
   saved.nowFree<baseNeed||gapToProtection>0?'بحاجة إلى تعزيز السيولة':'تحت المتابعة';
  return {
   period:reference,policy,monthlyNeed:baseNeed,
   estimate:{...estimate,commitments,loanMonthly:debtMonthly,monthlyFees:Math.round(annualizedFee(db)/12)},
   riskBuffer,outstanding,debtMonthly,debtRatio,debtToYearIncome,costToIncome,
   pressure,critical:severe,warning,protectionRequired,gapToProtection,
   incomeRecorded,observedMonths,eligibleCash,
   savings:saved,investment:capital,investmentCandidate,
   banks:{
    hilal:{target:hilalTarget,recorded:held,coverage:hilalTarget?held/hilalTarget:1,
      gap:Math.max(0,hilalTarget-held),kind:'تخصيص داخلي',confirmedLiquid:false},
    malaa:{target:malaaTarget,recorded:saved.soonFree,instant:saved.nowFree,
      coverage:malaaTarget?saved.soonFree/malaaTarget:1,
      gap:Math.max(0,malaaTarget-saved.soonFree),kind:'سيولة مسجلة خلال ثلاثة أيام',confirmedLiquid:false},
    assets:{target:investmentCandidate,recorded:null,coverage:null,gap:null,kind:'استثمار الفائض بعد تغطية الحماية',
      confirmedLiquid:false,market:capital.market}
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
  debtList,assess,installment,scenario});
});
