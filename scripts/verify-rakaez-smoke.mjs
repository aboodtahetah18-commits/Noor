import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../public/rakaez/index.html',import.meta.url),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(source,'Rakaez application script must be present');
assert.ok(html.includes('rakaez-nav-flat'),'Direct flat navigation must be present');
assert.ok(html.includes('rakaez-bell'),'Shared notification bell must be present');
assert.ok(html.includes('rakaez-mode-panel'),'Separated demo workspace must be present');
assert.ok(html.includes('border:2px solid'),'Visible modal/field borders must be present');
new Function(source);

const storage=new Map();
let sequence=0;
const localStorage={
  getItem:key=>storage.get(key)??null,
  setItem:(key,value)=>storage.set(key,String(value)),
  removeItem:key=>storage.delete(key)
};
class Element {
  constructor(name=''){this.id=name;this.dataset={};this.style={};this.attributes={};this.children=[];this.textContent='';this.innerHTML='';this.hidden=false;this.value='';this.classList={add(){},remove(){},toggle(){},contains(){return false}}}
  appendChild(el){this.children.push(el);return el}
  append(el){this.appendChild(el)}
  prepend(el){this.children.unshift(el)}
  insertBefore(el){return this.appendChild(el)}
  remove(){}
  querySelectorAll(){return []}
  querySelector(){return null}
  setAttribute(name,value){this.attributes[name]=value}
  getAttribute(name){return this.attributes[name]}
  addEventListener(){}
  contains(){return false}
  focus(){}
}
const elements=new Map();
const document={
  body:new Element('body'),head:new Element('head'),
  getElementById(id){if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id)},
  querySelector(selector){return this.getElementById(selector.replace(/^#/,''))},
  querySelectorAll(){return []},
  createElement(tag){return new Element(tag)},
  addEventListener(){}
};
class MutationObserver{observe(){} disconnect(){}}
const app= new Function('document','localStorage','MutationObserver','window','alert','confirm','crypto',
  source+"\nreturn {N,navigate,rkWorkspaces,rkOpenContext,rkActionOpen,rkActionFromSMS,rkActionCommit,rkActionPreview,rkActionExpected,rkActionPeriodSpend,rkMerchantEnglishFromText,parseSMS,rkMerchantMonitored,rkMerchantCreateCase,rkMerchantCaseSave,merchantSnapshot:()=>rkMerchantSnapshot,merchantCases:()=>db.merchantFollowups,pushMerchantTx:t=>{db.transactions.push(t);save()},openModal,formV3,interbankForm,ledgerOpen,ledgerReconcile,researchForm,v14CycleForm,v11ToggleSamples,rakaezDataCheck,rkOpen,rkSave,edit:d=>Object.assign(rkDraft,d),step:n=>{rkStep=n},state:()=>({demo:v11ExamplesMode,transactions:db.transactions.length,receivables:db.receivables?.length||0,collections:db.receivableCollections?.length||0,scheduled:db.scheduledOps?.length||0})};"
)(document,localStorage,MutationObserver,{},()=>{},()=>true,{randomUUID:()=>String(++sequence)});



assert.equal(app.rkWorkspaces.length,5,'Exactly five real functional workspaces must exist');
assert.deepEqual(app.rkWorkspaces.map(x=>x.id),['insights','hilal','assets','spending','settings']);
let rendered=0;
for(const workspace of app.rkWorkspaces){
 app.navigate(workspace.id);
 const nav=document.getElementById('nav').innerHTML;
 const html=document.getElementById('view').innerHTML;
 assert.equal((nav.match(/rakaez-nav-link /g)||[]).length,5,'Only five actual workspaces are navigable');
 assert.equal((nav.match(/aria-current="page"/g)||[]).length,1,'Exactly one active workspace');
 assert.ok(html.length>140,'Workspace must contain useful controls');
 assert.ok(!html.includes('rk-module-tabs'),'Legacy nested page tabs must not appear');
 rendered++;
}
for(const [id] of app.N){
 if(app.rkWorkspaces.some(x=>x.id===id))continue;
 app.navigate(id);
 assert.ok(document.getElementById('modalRoot').innerHTML.includes('rk-work-context'),'Legacy detail is a contextual tool: '+id);
}
app.navigate('hilal');
assert.ok(document.getElementById('view').innerHTML.includes('تسجيل مصروف أو دخل'));
app.navigate('assets');
assert.ok(document.getElementById('view').innerHTML.includes('إضافة أصل / استثمار'));
app.navigate('spending');
assert.ok(document.getElementById('view').innerHTML.includes('قرارات وإجراءات تحتاج متابعة'));

const kinds=['transaction','funding','deposit','withdraw','asset','portfolioUpdate','dividend','price','repay'];
let modalCount=0;
for(const type of kinds){
  app.openModal(type);
  assert.ok(document.getElementById('modalRoot').innerHTML.length>100,'Modal not generated '+type);
  modalCount++;
}
for(const type of ['goals','debts','fees','reserves']){
  app.formV3(type,type==='reserves'?'hilal':'');
  assert.ok(document.getElementById('modalRoot').innerHTML.length>100,'Management modal not generated '+type);
  modalCount++;
}
for(const name of ['interbankForm','ledgerOpen','ledgerReconcile','researchForm','v14CycleForm']){
  app[name]();
  assert.ok(document.getElementById('modalRoot').innerHTML.length>100,'Modal not generated '+name);
  modalCount++;
}
app.rkOpen('receivable');app.edit({name:'فحص مستحق',party:'شخص افتراضي',principal:5000,due:'2026-12-01'});app.step(4);await app.rkSave();
assert.equal(app.state().receivables,1);
const outstanding=JSON.parse(storage.get('rakaez-v1')).receivables[0].id;
app.rkOpen('collection',outstanding);app.edit({amount:700,date:'2026-11-02',account:'حساب مستلم للاختبار'});app.step(2);await app.rkSave();
assert.equal(app.state().collections,1);
app.rkOpen('scheduled');app.edit({name:'ادخار تجريبي',method:'percentage',rate:20,base:'salary',start:'2026-12-01'});app.step(4);await app.rkSave();
assert.equal(app.state().scheduled,1);
assert.deepEqual(app.rakaezDataCheck(),[]);


const sms=app.parseSMS('عملية شراء بقيمة 45.00 SAR لدى STARBUCKS عبر بطاقة 1234');
assert.equal(sms.merchantEnglish,'STARBUCKS','Source merchant English name from bank text');
assert.equal(app.rkMerchantEnglishFromText('تم شراء 20 ريال لدى مطعم محلي'),null,'Never fabricate an English merchant identity');
app.rkActionOpen('expense');
assert.ok(document.getElementById('modalRoot').innerHTML.includes('إجراء مالي متكامل'));
document.getElementById('rkASms').value='عملية شراء بقيمة 45.00 SAR لدى STARBUCKS عبر بطاقة 1234';
app.rkActionFromSMS();
assert.equal(document.getElementById('rkAMerchant').value,'STARBUCKS');
assert.equal(document.getElementById('rkAAmount').value,'45.00');
assert.ok(!String(storage.get('rakaez-v1')||'').includes('بطاقة 1234'),'The raw bank message must not be saved');

app.rkActionOpen('expense');
document.getElementById('rkAType').value='expense';
document.getElementById('rkADate').value=new Date().toISOString().slice(0,10);
document.getElementById('rkADesc').value='ضيافة لدى STARBUCKS';
document.getElementById('rkAAmount').value='650.00';
document.getElementById('rkACategory').value='food';
document.getElementById('rkAMerchant').value='STARBUCKS';
app.rkActionPreview();
assert.ok(document.getElementById('rkAPreview').innerHTML.includes('اقتراب من حد الموازنة'));
const previousTransactions=app.state().transactions,previousCases=app.merchantCases().length;
app.rkActionCommit();
assert.equal(app.state().transactions,previousTransactions+1,'One action records one transaction');
assert.equal(app.merchantCases().length,previousCases+1,'Budget pressure opens one linked follow-up');
const stateAfter=JSON.parse(storage.get('rakaez-v1'));
const tx=stateAfter.transactions.at(-1),followup=stateAfter.merchantFollowups.at(-1);
assert.equal(tx.amount,65000);
assert.equal(tx.category,'food');
assert.equal(tx.merchantEnglish,'STARBUCKS');
assert.equal(tx.workflowSource,'ONE_ACTION_LOCAL');
assert.equal(followup.originTransactionId,tx.id,'Follow-up links to the transaction');
assert.ok(followup.relatedTransactionIds.includes(tx.id));
assert.ok(document.getElementById('modalRoot').innerHTML.includes('نتيجة الإجراء المترابط'),'Consolidated receipt must appear');
assert.equal(app.rkActionPeriodSpend('food',tx.date.slice(0,7)),65000,'Budget uses the one transaction with no duplicate posting');
app.navigate('spending');
assert.ok(document.getElementById('view').innerHTML.includes('STARBUCKS'));
assert.ok(document.getElementById('view').innerHTML.includes('متابعة الخطة'));

app.rkActionOpen('expense');
document.getElementById('rkADate').value=tx.date;
document.getElementById('rkADesc').value=tx.description;
document.getElementById('rkAAmount').value='650.00';
document.getElementById('rkACategory').value='food';
document.getElementById('rkAMerchant').value='STARBUCKS';
app.rkActionCommit();
assert.equal(app.state().transactions,previousTransactions+1,'Duplicate expense must be blocked');
assert.equal(app.merchantCases().length,previousCases+1,'Duplicate expense must not create another follow-up');

app.navigate('spending');
const merchantIndex=app.merchantSnapshot().findIndex(m=>m.name==='STARBUCKS');
assert.ok(merchantIndex>=0);
app.rkMerchantCreateCase(merchantIndex);
assert.equal(app.merchantCases().length,previousCases+1,'Open follow-up must be reused, not duplicated');
const merchantCase=app.merchantCases().at(-1);
document.getElementById('rkMCStatus').value='IN_PROGRESS';
document.getElementById('rkMCOwner').value='المسؤول المالي';
document.getElementById('rkMCTarget').value='20';
document.getElementById('rkMCReview').value=merchantCase.nextReview;
document.getElementById('rkMCAction').value='مقارنة الموردين وتخفيض التكرار';
document.getElementById('rkMCNote').value='تم تكليف المسؤول';
app.rkMerchantCaseSave(merchantCase.id);
assert.equal(app.merchantCases().at(-1).status,'IN_PROGRESS','Follow-up continues after expense');
assert.equal(JSON.parse(storage.get('rakaez-v1')).merchantFollowups.length,previousCases+1);

const real=storage.get('rakaez-v1');
app.v11ToggleSamples();
assert.equal(app.state().demo,true);
assert.equal(app.state().transactions,420);
assert.ok(app.state().receivables>0);
assert.deepEqual(app.rakaezDataCheck(),[]);
app.v11ToggleSamples();
assert.equal(app.state().demo,false);
assert.equal(storage.get('rakaez-v1'),real,'Demo mode must preserve personal data');
console.log('Rakaez smoke PASS: '+rendered+' real workspaces, '+modalCount+' dialogs, one-action financial impact, isolated demo data.');
