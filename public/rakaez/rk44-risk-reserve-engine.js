/* ركائز 44 — سياسة احتياطي مالية ديناميكية.
   الحسابات تقديرية من السجلات المحلية ولا تنفذ استثمارات أو تحويلات مصرفية. */
(function(root,factory){
 const engine=factory();
 if(typeof module==='object'&&module.exports)module.exports=engine;
 if(root)root.RakaezReserveEngine=engine;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Math.max(min,Math.min(max,n));
 const numeric=v=>Number.isFinite(Number(v))?Number(v):0;
 const cents=v=>clamp(Math.round(numeric(v)));
 const safeArray=v=>Array.isArray(v)?v:[];
 const validPeriod=p=>typeof p==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(p);
 function monthOffset(period,delta){
  const [y,m]=period.split('-').map(Number);
  const d=new Date(Date.UTC(y,m-1+delta,1));
  return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0');
 }
 function datePeriod(value){
  if(validPeriod(value))return value;
  const dt=new Date();
  return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0');
 }
 function recurringMonthly(fees){
  const factors={monthly:1,quarterly:1/3,semiannual:1/6,annual:1/12,once:0};
  return cents(safeArray(fees).reduce((a,f)=>{
   const factor=Object.prototype.hasOwnProperty.call(factors,f?.period)?factors[f.period]:1;
   return a+cents(f?.amount)*factor;
  },0));
 }
 function debtStats(debts){
  return safeArray(debts).reduce((acc,d)=>{
   const remaining=Math.max(0,cents(d?.principal)-cents(d?.paid));
   if(!remaining)return acc;
   acc.outstanding+=remaining;
   acc.monthly+=Math.min(remaining,cents(d?.installment));
   acc.count++;
   return acc;
  },{outstanding:0,monthly:0,count:0});
 }
 function recordedExpenses(db,period){
  return cents(safeArray(db?.transactions).reduce((total,t)=>{
   if(t?.type!=='expense'||String(t.date||'').slice(0,7)!==period)return total;
   return total+cents(t.amount);
  },0));
 }
 function spendingPattern(db,period){
  let known=0,total=0,max=0;
  const history=[];
  for(let i=1;i<=6;i++){
   const p=monthOffset(period,-i);
   const value=recordedExpenses(db,p);
   const hasEntries=safeArray(db?.transactions).some(t=>t?.type==='expense'&&String(t.date||'').slice(0,7)===p);
   history.push({period:p,amount:value,hasEntries});
   if(hasEntries){known++;total+=value;max=Math.max(max,value);}
  }
  const planned=cents(safeArray(db?.categories).filter(c=>!c?.archived).reduce(
   (sum,c)=>sum+clamp(numeric(c?.limit))*100,0
  ));
  const salary=cents(db?.salary);
  const share=clamp(numeric(db?.ratios?.hilal),0,100)/100;
  const fallback=Math.round(salary*share);
  const actualAverage=known?cents(total/known):0;
  const current=recordedExpenses(db,period);
  // Conservative baseline; avoids treating missing history as proof of no expenses.
  const baseline=Math.max(planned,actualAverage,current,planned===0?fallback:0);
  return {baseline,planned,actualAverage,current,history,historyMonths:known};
 }
 function earmarkedHilal(db){
  const entries=safeArray(db?.rk39?.events);
  return Math.max(0,entries.reduce((a,e)=>{
   if(!e||e.status!=='posted')return a;
   if(e.kind==='reserve-add'||e.kind==='reserve-opening')return a+cents(e.amount);
   if(e.kind==='reserve-release')return a-cents(e.amount);
   return a;
  },0));
 }
 function verifiedSalary(db,period){
  const m=safeArray(db?.salaryMonths);
  return m.includes(period)||m.includes(monthOffset(period,-1))||m.includes(monthOffset(period,-2));
 }
 function holdingValue(h){
  if(h?.kind==='محفظة استثمارية'){
   return h?.marketValue===null||h?.marketValue===undefined?0:cents(h.marketValue);
  }
  if(h?.price===null||h?.price===undefined)return 0;
  return cents(numeric(h.quantity)*numeric(h.price));
 }
 function calculate(db,asOf){
  if(!db||typeof db!=='object')throw new Error('لا توجد بيانات مالية صالحة.');
  const period=datePeriod(asOf);
  const spending=spendingPattern(db,period);
  const debt=debtStats(db.debts);
  const fees=recurringMonthly(db.fees);
  const income=cents(db.salary);
  const debtServiceRatio=income>0?debt.monthly/income:(debt.monthly>0?Infinity:0);
  const debtToAnnualIncome=income>0?debt.outstanding/(income*12):(debt.outstanding>0?Infinity:0);
  const recurringPressure=spending.baseline+debt.monthly+fees;
  const spendingToIncome=income>0?recurringPressure/income:(recurringPressure>0?Infinity:0);
  const pressureReasons=[];
  if(debtServiceRatio>=0.5)pressureReasons.push('القسط الشهري يستهلك نصف الدخل المخطط أو أكثر');
  else if(debtServiceRatio>=0.35)pressureReasons.push('الأقساط الشهرية مرتفعة قياسًا بالدخل');
  if(debtToAnnualIncome>=2.5)pressureReasons.push('أصل الديون المتبقية مرتفع مقارنة بالدخل السنوي');
  else if(debtToAnnualIncome>=1.25)pressureReasons.push('الديون المتبقية تحتاج إلى احتياطي أعلى');
  if(spendingToIncome>1)pressureReasons.push('الأعباء الشهرية المتوقعة تتجاوز الدخل المخطط');
  else if(spendingToIncome>=0.9)pressureReasons.push('الهامش المتاح بعد الالتزامات ضيق');
  let risk='stable';
  if(debtServiceRatio>=0.5||debtToAnnualIncome>=2.5||spendingToIncome>1)risk='critical';
  else if(debtServiceRatio>=0.35||debtToAnnualIncome>=1.25||spendingToIncome>=0.9)risk='watch';
  const months=risk==='critical'?6:risk==='watch'?4:3;
  const hilalMonths=risk==='critical'?2:1;
  const floor=db.reserves||{};
  const targetHilal=Math.max(cents(floor.hilal),recurringPressure*hilalMonths);
  const targetMalaa=Math.max(cents(floor.malaa),recurringPressure*(months-hilalMonths));
  const totalRequired=targetHilal+targetMalaa;
  const savings=safeArray(db.savings);
  const byBucket=id=>savings.filter(x=>x?.id===id).reduce((sum,x)=>sum+cents(x.balance),0);
  const instant=byBucket('instant');
  const threeDay=byBucket('three');
  const twelveDay=byBucket('twelve');
  const nearLiquid=instant+threeDay; // user entered values; no live verification
  const hilalEarmarked=earmarkedHilal(db); // administrative; not bank-cash
  const liquidityShortfall=Math.max(0,totalRequired-nearLiquid);
  const unmetHilal=Math.max(0,targetHilal-hilalEarmarked);
  const missingCoverage=Math.max(0,targetMalaa-nearLiquid);
  const eligibleBeforePolicy=Math.max(0,nearLiquid-totalRequired);
  const eligibleToConsider=risk==='stable'&&spending.historyMonths>=2&&verifiedSalary(db,period)
   ?eligibleBeforePolicy:0;
  const assetsValue=safeArray(db.holdings).reduce((sum,h)=>sum+holdingValue(h),0);
  const assetsUnpriced=safeArray(db.holdings).filter(h=>h?.kind==='محفظة استثمارية'?
    h.marketValue==null:h.price==null).length;
  const confidence=(verifiedSalary(db,period)&&spending.historyMonths>=2)?'better':'limited';
  return Object.freeze({
   period,spending,debt,fees,income,verifiedIncome:verifiedSalary(db,period),
   recurringPressure,debtServiceRatio,debtToAnnualIncome,spendingToIncome,
   risk,months,pressureReasons,confidence,
   banks:Object.freeze({
    hilal:{target:targetHilal,earmarked:hilalEarmarked,gap:unmetHilal,months:hilalMonths,type:'تشغيلي'},
    malaa:{target:targetMalaa,nearLiquid,instant,threeDay,twelveDay,gap:missingCoverage,type:'سيولة قريبة'},
    assets:{target:eligibleToConsider,invested:assetsValue,unpriced:assetsUnpriced,
     type:'فائض قابل للدراسة الاستثمارية'}
   }),
   totalRequired,nearLiquid,liquidityShortfall,
   eligibleBeforePolicy,eligibleToConsider,
   investmentPaused:risk!=='stable'||eligibleToConsider===0,
   isCashVerified:false // this app has local records, not bank-account reconciliation
  });
 }
 return Object.freeze({calculate,monthOffset,recurringMonthly,debtStats,recordedExpenses,spendingPattern});
});
