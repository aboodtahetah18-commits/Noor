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
