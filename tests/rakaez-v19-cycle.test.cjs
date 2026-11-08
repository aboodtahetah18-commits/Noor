'use strict';
/* Run: node --test tests/rakaez-v19-cycle.test.cjs
   Uses in-memory fixtures; never reads browser localStorage.
   The legacy V19 browser IIFE is inspected at its named financial function boundaries.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const app=readFileSync(path.join(__dirname,'..','public','rakaez','upgrade-v19.js'),'utf8');
function section(start,end){
 const a=app.indexOf(start),b=app.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'Financial function missing: '+start);
 return app.slice(a,b);
}
const periodShift=(p,delta)=>{
 const [year,month]=p.split('-').map(Number);
 const date=new Date(Date.UTC(year,month-1+delta,1));
 return date.toISOString().slice(0,7);
};
const formatDay=p=>{
 const [year,month]=p.split('-').map(Number);
 return p+'-'+String(Math.min(27,new Date(Date.UTC(year,month,0)).getUTCDate())).padStart(2,'0');
};
const {feeAmount,cycleFeeDue}=new Function('formatDay','periodShift',
 section('function feeAmount(f){','function scheduledEstimate(x){')+
 'return {feeAmount,cycleFeeDue};')(formatDay,periodShift);

test('monthly, quarterly, annual and one-time fees respect payday windows',()=>{
 assert.equal(cycleFeeDue({period:'monthly',date:'2026-12-31'},'2027-02').date,'2027-02-28');
 assert.equal(cycleFeeDue({period:'quarterly',date:'2026-12-10'},'2027-02').date,'2027-03-10');
 assert.equal(cycleFeeDue({period:'annual',date:'2026-03-10'},'2027-02').date,'2027-03-10');
 assert.equal(cycleFeeDue({period:'once',date:'2027-03-10'},'2027-02').date,'2027-03-10');
 assert.equal(cycleFeeDue({period:'once',date:'2027-03-10'},'2027-03'),null);
});
test('unknown nonmonthly due dates cannot be treated as confirmed due amounts',()=>{
 assert.equal(cycleFeeDue({period:'annual',amount:200000,date:''},'2027-02'),null);
 const monthly=cycleFeeDue({period:'monthly',amount:20000,date:''},'2027-02');
 assert.equal(monthly.unverifiedDue,true);
 assert.equal(monthly.date,'2027-02-27');
});
test('confirmed due fees are reserved, savings schedules remain optional',()=>{
 const db={hilalPayments:[],hilalFinancings:[],hilalRequests:[],debts:[],
  goals:[{id:'g',name:'هدف',monthly:10000}],
  fees:[{id:'annual',name:'قسط التأمين',amount:70000,period:'annual',date:'2026-03-10',status:'active'},
   {id:'paused',name:'رسوم متوقفة',amount:20000,period:'monthly',status:'paused'}],
  scheduledOps:[{id:'saving',name:'ادخار مخطط',status:'planned',kind:'allocation',
   amount:15000,start:'2027-01-05'}],rkSavingsFeesV19:[]};
 const make=new Function('db','v18Ensure','feeAmount','cycleFeeDue','scheduledEstimate','formatDay',
  section('function makeObligations(period){','function refreshObligations(plan){')+
  'return makeObligations;')(db,()=>{},feeAmount,cycleFeeDue,x=>x.amount,formatDay);
 const rows=make('2027-02'),fee=rows.find(x=>x.id==='fee:annual');
 assert.equal(fee.dueDate,'2027-03-10');
 assert.equal(fee.locked,true);
 assert.ok(!rows.some(x=>x.id==='fee:paused'));
 assert.equal(rows.find(x=>x.id==='goal:g').included,false);
 assert.equal(rows.find(x=>x.id==='scheduled:saving').included,false);
});
test('largest-remainder halala allocation cannot create a negative bank or a cent',()=>{
 const bankSplit=new Function('totalO','db',
  section('function bankSplit(plan){','function deficit(plan){')+
  'return bankSplit;')(()=>0,{ratios:{hilal:60,malaa:25,assets:15}});
 for(const total of [0,1,2,3,5,10001]){
  const result=bankSplit({salary:total,ratios:{hilal:60,malaa:25,assets:15}});
  assert.equal(result.hilal+result.malaa+result.assets,total);
  assert.ok([result.hilal,result.malaa,result.assets].every(x=>Number.isSafeInteger(x)&&x>=0));
 }
 assert.equal(bankSplit({salary:1000,ratios:{hilal:70,malaa:70,assets:0}}).invalidRatios,true);
 assert.equal(bankSplit({salary:-5,ratios:{hilal:60,malaa:25,assets:15}}).invalidAmount,true);
});
test('changed historical expense refreshes only the draft and invalidates approval',()=>{
 const changes=[],sync=new Function('categorySnapshot','persist',
  section('function syncCycleDraft(plan){','function feeAmount(f){')+
  'return syncCycleDraft;')(()=>[{categoryId:'a',name:'غذاء',limit:10000,
   spent:8500,balance:1500}],(...args)=>changes.push(args));
 const plan={status:'draft',closePeriod:'2027-01',categories:[{categoryId:'a',name:'غذاء',limit:10000,
  spent:4000,balance:6000,cover:0,destination:'none'}],analysisReviewedAt:'2027-02-01',analysisSignature:'approved'};
 assert.equal(sync(plan),true);
 assert.equal(plan.categories[0].spent,8500);
 assert.equal(plan.analysisReviewedAt,null);
 assert.equal(changes.length,1);
 plan.status='tracking';
 assert.equal(sync(plan),false);
});
test('task confirmation documents follow-up without fabricating money or repaying debts',()=>{
 const db={salaryMonths:[],savings:[{id:'s',balance:10000}],
  goals:[{id:'goal',saved:5000}],debts:[{id:'debt',principal:100000,paid:10000}],ledgerEntries:[]};
 const plan={period:'2027-02',receivedAt:null,tasks:[
  {id:'receipt',kind:'receipt',amount:900000,done:false},
  {id:'goal-task',kind:'surplus',amount:30000,done:false},
  {id:'debt-task',kind:'obligation',sourceId:'debt:debt',amount:20000,done:false}],
  obligations:[{id:'debt:debt',amount:20000}],status:'tracking'};
 const handler=new Function('db','getPlan','openedPeriod','confirm','cash','persist','cycleShell','toast',
  section('function confirmTask(id){','function legacySummary(){')+'return confirmTask;')(
  db,()=>plan,plan.period,()=>true,n=>String(n),()=>{},()=>{},()=>{});
 const balances=JSON.stringify({savings:db.savings,goals:db.goals,debts:db.debts,ledger:db.ledgerEntries});
 handler('receipt');handler('goal-task');handler('debt-task');
 assert.equal(JSON.stringify({savings:db.savings,goals:db.goals,debts:db.debts,ledger:db.ledgerEntries}),balances);
 assert.deepEqual(db.salaryMonths,['2027-02']);
 assert.equal(plan.status,'awaiting-match');
 assert.ok(plan.tasks.slice(1).every(x=>x.pendingReconciliation===true));
});
