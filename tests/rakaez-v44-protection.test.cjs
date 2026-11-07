'use strict';
/* Run: node --test tests/rakaez-v44-protection.test.cjs
   All fixtures are in-memory. Never read or overwrite browser localStorage.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const core=require('../public/rakaez/rk44-adaptive-core.js');

function fixture(){
 return {
  salary:900000,ratios:{hilal:60,malaa:25,assets:15},
  categories:[{id:'general',limit:1000}],fees:[],debts:[],
  transactions:[
   {type:'expense',date:'2026-10-12',amount:50000},
   {type:'expense',date:'2026-09-10',amount:60000}
  ],salaryMonths:['2026-09','2026-10'],holdings:[],
  savings:[{id:'instant',days:0,balance:9000000},{id:'slow',days:12,balance:900000}],
  withdrawals:[],ledgerOpening:{hilal:400000,malaa:9000000,assets:300000},
  ledgerEntries:[],audit:[],rk44Transfers:[]
 };
}
const bankTotal=db=>Object.keys(core.bankNames).reduce((v,id)=>v+core.cashBalance(db,id),0);

test('longer protection duration increases the Hilal target and gap by one monthly need per month',()=>{
 const db=fixture();
 db.rk44Policy={hilal:1,malaa:3,assets:1};
 const first=core.assess(db,'2026-10');
 assert.ok(first.monthlyNeed>0);
 const oneTarget=first.banks.hilal.target;
 const oneGap=first.banks.hilal.gap;
 db.rk44Policy.hilal=2;
 const second=core.assess(db,'2026-10');
 assert.equal(second.banks.hilal.target-oneTarget,first.monthlyNeed);
 assert.equal(second.banks.hilal.gap-oneGap,first.monthlyNeed);
 assert.equal(second.banks.hilal.recorded,first.banks.hilal.recorded);
 db.rk44Policy.hilal=3;
 const third=core.assess(db,'2026-10');
 assert.equal(third.banks.hilal.target-second.banks.hilal.target,first.monthlyNeed);
});
test('increasing assets protection duration cannot increase eligible investment surplus',()=>{
 const db=fixture(); db.rk44Policy={hilal:1,malaa:1,assets:1};
 const short=core.assess(db,'2026-10');
 db.rk44Policy.assets=6;
 const long=core.assess(db,'2026-10');
 assert.ok(long.investmentSafetyBuffer>short.investmentSafetyBuffer);
 assert.ok(long.investmentCandidate<=short.investmentCandidate);
});
test('read-only protection assessment does not alter stored transactions or ledgers',()=>{
 const db=fixture(),original=JSON.stringify(db);
 const result=core.assess(db,'2026-10');
 assert.ok(result.monthlyNeed>0);
 assert.equal(JSON.stringify(db),original);
 assert.ok(result.investmentCandidate>0);
 assert.ok(result.liquidityPlan.immediateRequired>0);
});
test('savings without V5 cash ledger are not cleared for a new investment',()=>{
 const db=fixture();db.ledgerOpening.malaa=0;
 const result=core.assess(db,'2026-10');
 assert.equal(result.investmentCandidate,0);
 assert.ok(result.savings.total>0);
 assert.equal(result.liquidityPlan.reconciledCash,0);
});
test('illiquid investments and twelve-day savings cannot fund immediate transfer',()=>{
 const db=fixture();db.ledgerOpening.malaa=0;db.ledgerOpening.hilal=0;db.ledgerOpening.assets=0;
 db.holdings=[{kind:'محفظة استثمارية',marketValue:150000000}];
 assert.throws(()=>core.requestTransfer(db,{from:'assets',to:'hilal',amount:10000}));
 assert.equal(core.assess(db,'2026-10').investmentCandidate,0);
});
test('pending transfer reserves source funds but adds no cash to recipient',()=>{
 const db=fixture(),before=bankTotal(db),recipient=core.cashBalance(db,'hilal');
 const op=core.requestTransfer(db,{from:'malaa',to:'hilal',amount:150000,note:'اختبار'});
 assert.equal(op.status,'pending');
 assert.equal(db.ledgerEntries.length,0);
 assert.equal(bankTotal(db),before);
 assert.equal(core.cashBalance(db,'hilal'),recipient);
 assert.equal(core.availableBankCash(db,'malaa'),8850000);
 assert.throws(()=>core.requestTransfer(db,{from:'malaa',to:'assets',amount:8850001}));
});
test('executed transfer moves funds to transit only; arrival later balances banks',()=>{
 const db=fixture(),before=bankTotal(db);
 const op=core.requestTransfer(db,{from:'assets',to:'hilal',amount:100000});
 core.executeTransfer(db,op.id,'OUT-001');
 assert.equal(core.cashBalance(db,'assets'),200000);
 assert.equal(core.cashBalance(db,'hilal'),400000);
 assert.equal(core.transitBalance(db),100000);
 assert.equal(bankTotal(db),before-100000);
 assert.throws(()=>core.executeTransfer(db,op.id,'OUT-AGAIN'));
 const out=db.ledgerEntries[0];
 assert.equal(out.lines.reduce((n,l)=>n+l.debit,0),out.lines.reduce((n,l)=>n+l.credit,0));
 core.matchTransfer(db,op.id,'ARRIVE-001');
 assert.equal(core.cashBalance(db,'hilal'),500000);
 assert.equal(core.transitBalance(db),0);
 assert.equal(bankTotal(db),before);
 assert.equal(db.ledgerEntries.length,2);
 assert.ok(db.ledgerEntries.every(e=>e.rk44TransferId===op.id));
 assert.throws(()=>core.matchTransfer(db,op.id,'ARRIVE-AGAIN'));
 assert.throws(()=>core.cancelTransfer(db,op.id));
});
test('a pending request may be cancelled only before execution',()=>{
 const db=fixture(),op=core.requestTransfer(db,{from:'malaa',to:'assets',amount:25000});
 core.cancelTransfer(db,op.id);
 assert.equal(db.ledgerEntries.length,0);
 assert.equal(core.availableBankCash(db,'malaa'),9000000);
 assert.throws(()=>core.executeTransfer(db,op.id,'OUT-001'));
});
test('cash kept for withdrawals or pending Hilal transfers is not double-committed',()=>{
 const db=fixture();
 db.withdrawals=[{amount:200000,status:'pending'}];
 db.rk39={events:[{kind:'bank-transfer',status:'pending',amount:100000}]};
 assert.equal(core.availableBankCash(db,'malaa'),8800000);
 assert.equal(core.availableBankCash(db,'hilal'),300000);
 assert.throws(()=>core.requestTransfer(db,{from:'hilal',to:'assets',amount:300001}));
});
test('reusing an execution reference across different transfers is blocked',()=>{
 const db=fixture(),a=core.requestTransfer(db,{from:'malaa',to:'hilal',amount:10000});
 const b=core.requestTransfer(db,{from:'assets',to:'hilal',amount:10000});
 core.executeTransfer(db,a.id,'REFERENCE-UNIQUE');
 assert.throws(()=>core.executeTransfer(db,b.id,'REFERENCE-UNIQUE'));
 assert.equal(core.cashBalance(db,'assets'),300000);
 assert.equal(core.transfers(db).find(x=>x.id===b.id).status,'pending');
});
test('large loan and income/expense/liquidity shocks change risk without changing history',()=>{
 const db=fixture(),before=JSON.stringify(db);
 const base=core.assess(db,'2026-10');
 const credit=core.scenario(db,'2026-10',600000,48,6);
 assert.ok(credit.monthly>0);
 assert.ok(credit.after.outstanding>credit.before.outstanding);
 assert.ok(credit.after.banks.malaa.target>=credit.before.banks.malaa.target);
 const stress=core.assess(db,'2026-10',{salaryOverride:100000,extraMonthlyExpense:500000,liquidityReduction:8900000});
 assert.ok(stress.monthlyNeed>base.monthlyNeed);
 assert.ok(stress.costToIncome>base.costToIncome);
 assert.equal(stress.investmentCandidate,0);
 assert.equal(JSON.stringify(db),before);
});


const confirmed=(db,month='2026-10')=>core.confirmFinancialStart(db,{
 income:575700,essentials:250000,obligations:120000,recurring:30000,
 opening:{hilal:0,malaa:0,assets:0}
},month);
const confirmedRatios=db=>core.saveStarterPolicy(db,{
 monthlySurplus:80000,milestones:{hilal:600000,malaa:1000000,assets:2500000},
 shares:{hilal:3750,malaaEmergency:3750,malaaSavings:1250,assets:1250},
 yieldShares:{malaa:6000,assets:4000}
});

test('legacy examples and local fake salary must never activate an unverified plan',()=>{
 const db=fixture();
 db.salary=575700;
 db.rk44StarterPolicy={version:1,monthlySurplus:80000,
  milestones:{hilal:600000,malaa:1000000,assets:2500000},
  shares:{hilal:3750,malaaEmergency:3750,malaaSavings:1250,assets:1250},
  yieldShares:{malaa:6000,assets:4000}};
 const snapshot=JSON.stringify(db);
 assert.equal(core.onboardingState(db,'2026-11').verified,false);
 const plan=core.verifiedStarterPlan(db,'2026-11');
 assert.equal(plan.ready,false);
 assert.equal(core.starterProjection(db,'2026-11').amount,null);
 assert.equal(core.starterDefaults.monthlySurplus,0);
 assert.equal(JSON.stringify(db),snapshot);
 assert.throws(()=>core.recordRealizedYield(db,{amount:10000,date:'2026-11-07',reference:'RND-001'}));
});
test('partial month scheduling needs no salary, past transactions or opening balance',()=>{
 const db=fixture(),data=JSON.stringify(db);
 const schedule=core.scheduleNextMonth(db,'2026-11');
 assert.equal(schedule.startMonth,'2026-12');
 assert.equal(core.onboardingState(db,'2026-11').verified,false);
 assert.equal(core.onboardingState(db,'2026-11').startMonth,'2026-12');
 assert.equal(core.scheduleNextMonth(db,'2026-11').startMonth,'2026-12');
 assert.equal(db.ledgerEntries.length,0);
 assert.equal(db.transactions.length,JSON.parse(data).transactions.length);
});
test('verified zero opening balances do not fabricate bank cash or start before next full month',()=>{
 const db=fixture();db.ledgerEntries=[];
 db.rk44StarterPolicy={version:1,monthlySurplus:80000,milestones:{hilal:600000,malaa:1000000,assets:2500000},
  shares:{hilal:3750,malaaEmergency:3750,malaaSavings:1250,assets:1250},
  yieldShares:{malaa:6000,assets:4000}};
 core.scheduleNextMonth(db,'2026-11');
 confirmed(db,'2026-11');
 const scheduled=core.onboardingState(db,'2026-11');
 assert.equal(scheduled.phase,'scheduled');
 assert.equal(scheduled.startMonth,'2026-12');
 assert.equal(core.onboardingState(db,'2026-12').phase,'active');
 const p=core.verifiedStarterPlan(db,'2026-12');
 assert.equal(p.amount,175700);
 assert.equal(p.allocation.hilal,150000);
 assert.equal(p.allocation.malaaEmergency,25700);
 assert.equal(p.allocation.malaaSavings,0);
 assert.equal(p.allocation.assets,0);
 assert.equal(p.stageTargets.assets,null);
 assert.equal(db.ledgerEntries.length,0);
 assert.throws(()=>core.approveVerifiedMonth(db,'2026-11',175700));
});
test('no disposable surplus generates no investment and no false optimistic target',()=>{
 const db=fixture();
 core.confirmFinancialStart(db,{income:100000,essentials:170000,obligations:50000,recurring:10000,
  opening:{hilal:0,malaa:0,assets:0}},'2026-11');
 const p=core.verifiedStarterPlan(db,'2026-12');
 assert.equal(p.rawSurplus,-130000);
 assert.equal(p.amount,0);
 assert.equal(p.allocation.assets,0);
 assert.equal(Object.values(p.allocation).reduce((a,b)=>a+b,0),0);
 assert.throws(()=>core.approveVerifiedMonth(db,'2026-12',100));
});
test('verified monthly plan requires salary receipt, cannot backfill or double-post cash',()=>{
 const db=fixture();db.ledgerEntries=[];db.salaryMonths=[];
 confirmed(db,'2026-11');
 assert.throws(()=>core.approveVerifiedMonth(db,'2026-12',100000));
 db.salaryMonths.push('2026-12');
 assert.throws(()=>core.approveVerifiedMonth(db,'2026-12',175701));
 const oldCash=bankTotal(db),oldJournal=JSON.stringify(db.ledgerEntries);
 const result=core.approveVerifiedMonth(db,'2026-12',100000);
 assert.equal(result.kind,'verified-month-plan');
 assert.equal(result.status,'planned');
 assert.equal(Object.values(result.allocation).reduce((a,b)=>a+b,0),100000);
 assert.equal(bankTotal(db),oldCash);
 assert.equal(JSON.stringify(db.ledgerEntries),oldJournal);
 assert.throws(()=>core.approveVerifiedMonth(db,'2026-12',100000));
});
test('confirmed yield split ratios may be used only after explicit financial verification',()=>{
 const db=fixture();db.ledgerOpening.hilal=0;db.ledgerOpening.malaa=0;db.savings=[];
 assert.throws(()=>confirmedRatios(db));
 confirmed(db);
 confirmedRatios(db);
 const oldCash=bankTotal(db);
 const y=core.recordRealizedYield(db,{amount:10000,date:'2026-10-15',reference:'YLD-PREVIEW-001'});
 assert.equal(bankTotal(db),oldCash+10000);
 assert.equal(y.splitAmounts.malaa,6000);
 assert.equal(y.splitAmounts.assets,4000);
 assert.equal(db.ledgerEntries.at(-1).lines.reduce((a,l)=>a+l.debit,0),10000);
 const t=core.requestYieldSplit(db,y.id,'malaa');
 assert.equal(t.status,'pending');
 assert.equal(core.availableBankCash(db,'hilal'),4000);
 assert.throws(()=>core.requestYieldSplit(db,y.id,'assets'));
 assert.throws(()=>core.recordRealizedYield(db,{amount:10000,date:'2026-10-15',reference:'YLD-PREVIEW-001'}));
 core.cancelTransfer(db,t.id);
 const again=core.requestYieldSplit(db,y.id,'malaa');
 assert.ok(again.id!==t.id);
 core.cancelTransfer(db,again.id);
 core.reverseYield(db,y.id,'تصحيح العائد');
 assert.equal(core.cashBalance(db,'hilal'),0);
});


test('a confirmed zero salary is not inferred from missing data and creates no forced savings',()=>{
 const db=fixture();
 const inputs={income:0,essentials:10000,obligations:0,recurring:0,opening:{hilal:0,malaa:0,assets:0}};
 core.confirmFinancialStart(db,inputs,'2026-11');
 assert.equal(core.onboardingState(db,'2026-12').verified,true);
 const plan=core.verifiedStarterPlan(db,'2026-12');
 assert.equal(plan.rawSurplus,-10000);
 assert.equal(plan.amount,0);
 assert.equal(plan.allocation.assets,0);
 const record=core.approveVerifiedMonth(db,'2026-12',0);
 assert.equal(record.amount,0);
});
test('new spending above the approved budget reduces surplus without double counting',()=>{
 const db=fixture();
 db.transactions=[];
 core.confirmFinancialStart(db,{income:100000,essentials:20000,obligations:10000,recurring:5000,
  opening:{hilal:0,malaa:0,assets:0}},'2026-11');
 const before=core.verifiedStarterPlan(db,'2026-12');
 assert.equal(before.amount,65000);
 db.transactions.push({id:'actual-1',type:'expense',date:'2026-12-12',amount:90000});
 const after=core.verifiedStarterPlan(db,'2026-12');
 assert.equal(after.recordedExpenses,90000);
 assert.equal(after.costs,90000);
 assert.equal(after.amount,10000);
 assert.equal(after.allocation.assets,0);
});
test('subsequent review must not silently move the scheduled month after a monthly plan was recorded',()=>{
 const db=fixture();
 const args={income:100000,essentials:10000,obligations:10000,recurring:0,
  opening:{hilal:0,malaa:0,assets:0}};
 core.scheduleNextMonth(db,'2026-11');
 core.confirmFinancialStart(db,args,'2026-11');
 db.salaryMonths.push('2026-12');
 core.approveVerifiedMonth(db,'2026-12',50000);
 const snapshot=JSON.stringify(db.rk44VerifiedStart);
 assert.throws(()=>core.confirmFinancialStart(db,{...args,income:200000},'2026-12'));
 assert.equal(JSON.stringify(db.rk44VerifiedStart),snapshot);
 assert.equal(db.rk44StartSchedule.startMonth,'2026-12');
});


test('category suggestion is editable, ambiguous labels remain unclassified',()=>{
 assert.equal(core.categorySuggestion('بنزين السيارة').category,'تنقل');
 assert.equal(core.categorySuggestion('رسوم المدرسة').category,'تعليم');
 assert.equal(core.categorySuggestion('قسط تمويل').category,'التزامات');
 assert.equal(core.categorySuggestion('شيء خاص').category,null);
 assert.equal(core.categorySuggestion('').category,null);
});
test('dependents have daily yearly irregular and zero expense options',()=>{
 assert.equal(core.monthlyEquivalent(120000,'yearly'),10000);
 assert.equal(core.monthlyEquivalent(1200,'daily'),36500);
 assert.equal(core.monthlyEquivalent(0,'none'),0);
 assert.equal(core.monthlyEquivalent(50000,'asNeeded'),null);
 assert.throws(()=>core.monthlyEquivalent(1000,'invalid'));
});
test('user details never double count an already linked dependent',()=>{
 const db=fixture();const cash=bankTotal(db),before=JSON.stringify(db.ledgerEntries);
 core.saveUserDetails(db,{items:[{id:'food',name:'مقاضي العائلة',amount:100000,frequency:'monthly',category:'معيشة'}],
  dependents:[{id:'dad',name:'والدي',relation:'أب',amount:20000,frequency:'monthly',includedInItems:true},
   {id:'sister',name:'أختي',relation:'أخت',amount:120000,frequency:'yearly',includedInItems:false},
   {id:'other',name:'معال دون مصروف',relation:'قريب',amount:0,frequency:'none',includedInItems:false}]});
 const s=core.userDetailsSummary(db);
 assert.equal(s.monthlyKnown,110000);
 assert.equal(s.incomplete,0);
 assert.equal(bankTotal(db),cash);
 assert.equal(JSON.stringify(db.ledgerEntries),before);
});
test('confirmed detailed essentials replace the former aggregate; debt line never double counts',()=>{
 const db=fixture();db.transactions=[];db.salaryMonths=[];
 core.confirmFinancialStart(db,{income:500000,essentials:200000,obligations:50000,recurring:10000,
  opening:{hilal:0,malaa:0,assets:0}},'2026-11');
 const old=core.verifiedStarterPlan(db,'2026-12');
 assert.equal(old.costs,260000);
 core.saveUserDetails(db,{useAsEssentials:true,
  items:[{id:'a',name:'مقاضي',amount:100000,frequency:'monthly',category:'معيشة'},
   {id:'b',name:'قسط',amount:50000,frequency:'monthly',category:'التزامات'},
   {id:'c',name:'سفر',amount:90000,frequency:'monthly',category:'أهداف مستقبلية'}],
  dependents:[{id:'p',name:'والد',relation:'أب',amount:120000,frequency:'yearly',includedInItems:false}]});
 const plan=core.verifiedStarterPlan(db,'2026-12');
 assert.equal(plan.essentials,110000);
 assert.equal(plan.costs,170000);
 assert.equal(plan.expenseSource,'تفصيل مصروفات معتمد');
});
test('flexible debt stays inside existing debt list without installment or synthetic cash',()=>{
 const db=fixture(),balance=bankTotal(db),size=db.debts.length;
 const debt=core.saveFlexibleDebt(db,{name:'دين لأحد الأقارب',amount:150000});
 assert.equal(db.debts.length,size+1);
 assert.equal(debt.repaymentMode,'capacity');
 assert.equal(debt.installment,0);
 assert.equal(debt.date,'');
 assert.equal(bankTotal(db),balance);
 assert.throws(()=>core.saveFlexibleDebt(db,{name:'سداد',amount:0}));
});
test('income-change repayment recommendation is proportional, protected, and requires verification',()=>{
 const db=fixture();db.transactions=[];db.salaryMonths=[];db.debts=[];
 core.saveFlexibleDebt(db,{name:'دين بلا تاريخ',amount:500000});
 const unverified=core.flexibleRepaymentPreview(db,{previousIncome:500000,currentIncome:700000,
  protectedAmount:100000,period:'2026-12'});
 assert.equal(unverified.ready,false);
 core.confirmFinancialStart(db,{income:500000,essentials:200000,obligations:50000,recurring:10000,
  opening:{hilal:0,malaa:0,assets:0}},'2026-11');
 const preview=core.flexibleRepaymentPreview(db,{previousIncome:500000,currentIncome:700000,
  protectedAmount:100000,period:'2026-12'});
 assert.equal(preview.ready,true);
 assert.equal(preview.growth,0.4);
 assert.equal(preview.newFree,340000);
 assert.equal(preview.oldFree,140000);
 assert.equal(preview.ceiling,200000);
 assert.equal(preview.requiresApproval,true);
 const fall=core.flexibleRepaymentPreview(db,{previousIncome:700000,currentIncome:500000,
  protectedAmount:100000,period:'2026-12'});
 assert.equal(fall.warning,true);
 assert.equal(fall.ceiling,0);
 const shortage=core.flexibleRepaymentPreview(db,{previousIncome:500000,currentIncome:520000,
  protectedAmount:300000,period:'2026-12'});
 assert.equal(shortage.warning,true);
 assert.equal(shortage.ceiling,0);
});


test('category allocation and remaining are distinct from cash and confirmed expenses',()=>{
 const db=fixture(),originalEntries=JSON.stringify(db.ledgerEntries);
 core.saveUserDetails(db,{items:[{id:'grocery',name:'مقاضي تفصيلية',category:'معيشة',frequency:'monthly',
  amount:60000,remaining:15000}],dependents:[]});
 const row=core.userDetails(db).items[0];
 assert.equal(row.amount,60000);
 assert.equal(row.remaining,15000);
 assert.equal(core.userDetailsSummary(db).monthlyBudget,60000);
 assert.equal(JSON.stringify(db.ledgerEntries),originalEntries);
 const revision=core.saveUserDetails(db,{items:[{...row,remaining:-2500}],dependents:[]});
 assert.equal(revision.items[0].remaining,-2500);
 assert.equal(db.rk44UserDetailsHistory.length,1);
});


test('wizard confirmation is explicit and does not create money in any virtual bank',()=>{
 const db=fixture();
 const beforeJournal=JSON.stringify(db.ledgerEntries);
 const beforeTransactions=JSON.stringify(db.transactions);
 const beforeCash=bankTotal(db);
 const data={salary:575700,otherIncome:null,externalBank:'بنك حقيقي مستقل',salaryDay:27,
  family:{marital:'married',children:2,supported:1},
  details:{items:[{id:'i1',name:'مقاضي المنزل',category:'معيشة',categorySource:'suggestion',amount:110000,remaining:null,frequency:'monthly'}],
   dependents:[{id:'d1',name:'والدي',relation:'أب',amount:120000,frequency:'yearly',includedInItems:false}]},
  obligations:[{name:'التزام مرن لم يسبق تسجيله',remaining:300000,mode:'capacity'}],
  goals:[{name:'ادخار لشراء منزل',target:18000000,date:'2032-01-01'}]};
 const result=core.confirmWizard(db,data,'2026-11');
 assert.equal(core.wizardState(db).completed,true);
 assert.equal(core.wizardPhase(db).level,1);
 assert.equal(result.wizard.estimatedExpenses,120000);
 assert.equal(db.salary,575700);
 assert.equal(db.rk44VerifiedStart.startMonth,'2026-12');
 assert.equal(db.rk44UserDetails.items.length,1);
 assert.equal(db.debts.at(-1).repaymentMode,'capacity');
 assert.equal(db.goals.at(-1).name,'ادخار لشراء منزل');
 assert.equal(JSON.stringify(db.transactions),beforeTransactions);
 assert.equal(JSON.stringify(db.ledgerEntries),beforeJournal);
 assert.equal(bankTotal(db),beforeCash);
 assert.throws(()=>core.confirmWizard(db,data,'2026-11'));
});
test('wizard rejects duplicate debts and invalid salary without changing original records',()=>{
 const db=fixture();
 const before=JSON.stringify(db);
 const data={salary:null,salaryDay:27,family:{marital:'single'},
  details:{items:[],dependents:[]},obligations:[],goals:[]};
 assert.throws(()=>core.confirmWizard(db,data,'2026-11'));
 assert.equal(JSON.stringify(db),before);
 const data2={...data,salary:500000,obligations:[{name:db.debts[0]?.name||'قرض قائم',
  remaining:100000,mode:'capacity'}]};
 if(db.debts.length>0){
  assert.throws(()=>core.confirmWizard(db,data2,'2026-11'));
  assert.equal(JSON.stringify(db),before);
 }
});
test('payday-to-payday cycle review requires actual salary and closed period',()=>{
 const db=fixture();db.salaryMonths=[];
 const data={salary:500000,salaryDay:27,externalBank:'بنك خارجي',family:{marital:'single'},
  details:{items:[{id:'a',name:'الغذاء',amount:100000,remaining:null,category:'معيشة',frequency:'monthly'}],
   dependents:[]},obligations:[],goals:[]};
 core.confirmWizard(db,data,'2026-11');
 assert.equal(core.wizardDateBound('2027-02',31),'2027-02-28');
 assert.throws(()=>core.reviewWizardCycle(db,'2026-12','2026-12-28'));
 db.salaryMonths.push('2026-12');
 db.transactions.push({id:'rev-exp',type:'expense',date:'2027-01-02',amount:10000});
 const a=core.reviewWizardCycle(db,'2026-12','2027-02-01');
 assert.equal(a.record.start,'2026-12-27');
 assert.equal(a.record.end,'2027-01-27');
 assert.equal(a.record.expenses,10000);
 assert.equal(core.wizardPhase(db).level,2);
 assert.throws(()=>core.reviewWizardCycle(db,'2026-12','2027-02-01'));
 db.salaryMonths.push('2027-01');
 const b=core.reviewWizardCycle(db,'2027-01','2027-03-01');
 assert.equal(b.record.start,'2027-01-27');
 assert.equal(core.wizardPhase(db).level,3);
});


test('forecast learning progresses after reviewed cycles without changing approved monthly budgets',()=>{
 const db=fixture();
 db.transactions=[];db.salaryMonths=[];
 core.confirmWizard(db,{salary:500000,salaryDay:27,family:{marital:'single'},
  details:{items:[{id:'i1',name:'المقاضي',amount:200000,frequency:'monthly',category:'معيشة'}],
   dependents:[]},obligations:[],goals:[]},'2026-11');
 const savedDetails=JSON.stringify(db.rk44UserDetails);
 const base=core.wizardLearning(db,'2026-12');
 assert.equal(base.ready,true);assert.equal(base.level,1);assert.equal(base.forecast,200000);
 db.salaryMonths.push('2026-12','2027-01');
 db.transactions.push({id:'one',date:'2026-12-28',type:'expense',amount:250000},
  {id:'two',date:'2027-01-28',type:'expense',amount:180000});
 core.reviewWizardCycle(db,'2026-12','2027-02-01');
 const second=core.wizardLearning(db,'2027-01');
 assert.equal(second.level,2);
 assert.equal(second.forecast,216667);
 core.reviewWizardCycle(db,'2027-01','2027-03-01');
 const third=core.wizardLearning(db,'2027-02');
 assert.equal(third.level,3);
 assert.equal(third.forecast,206000);
 assert.equal(third.requiresApprovalToChangeBudget,true);
 assert.equal(JSON.stringify(db.rk44UserDetails),savedDetails);
});
test('no expense detail leaves predictions unavailable even when a salary is provided',()=>{
 const db=fixture();db.transactions=[];db.salaryMonths=[];
 core.confirmWizard(db,{salary:575700,salaryDay:27,family:{marital:'single'},
  details:{items:[],dependents:[]},obligations:[],goals:[]},'2026-11');
 assert.equal(core.wizardState(db).completed,true);
 assert.equal(core.wizardLearning(db,'2026-12').ready,false);
 assert.equal(db.rk44Wizard.expensesProvided,false);
 assert.equal(db.ledgerEntries.length,0);
});
