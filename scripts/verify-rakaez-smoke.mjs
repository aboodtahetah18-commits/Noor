import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../public/rakaez/index.html',import.meta.url),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(source,'Rakaez application script must be present');
assert.ok(html.includes('rakaez-nav-flat'),'Direct flat navigation must be present');
assert.ok(html.includes('rakaez-bell'),'Shared notification bell must be present');
assert.ok(html.includes('rakaez-mode-panel'),'Separated demo workspace must be present');
assert.ok(html.includes('border:2px solid'),'Visible modal/field borders must be present');
assert.ok(html.includes('V19 — modal content safety inset'),'Modal spacing regression rules must be loaded');
assert.ok(html.includes('#modalRoot .modal > form > .formgrid'),'Direct form grids must be inset from modal edges');
assert.ok(html.includes('padding:14px 22px!important'),'Modal form fields must have a desktop safety inset');
assert.ok(html.includes('padding:13px 16px!important'),'Modal form fields must have a mobile safety inset');
assert.ok(html.includes('box-sizing:border-box!important'),'Form padding must not cause horizontal overflow');
assert.ok(html.includes('#modalRoot .modal > .rk-budget-detail-actions'),'Modal action bars must also have safe horizontal padding');

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
  source+"\nreturn {N,navigate,rkSplitKpiPanels,rkSplitTitledIndicators,rkHomeKpiCenter,rkActionOpen,rkActionChooser,rkActionFromSMS,rkActionCommit,rkActionPreview,rkActionCents,rkActionExpected,rkActionPeriodSpend,rkMerchantEnglishFromText,parseSMS,rkMerchantMonitored,rkMerchantCreateCase,rkMerchantCaseSave,rkSaveTransactionEdit,rkRemoveTransaction,rkOperationCaseDialog,rkOperationCaseSave,submitModal,operationCases:()=>db.operationFollowups||[],assetHoldings:()=>db.holdings,updateTestSavings:(n)=>{db.savings[0].balance=n;save()},merchantSnapshot:()=>rkMerchantSnapshot,merchantCases:()=>db.merchantFollowups,pushMerchantTx:t=>{db.transactions.push(t);save()},openModal,formV3,interbankForm,ledgerOpen,ledgerReconcile,researchForm,v14CycleForm,v11ToggleSamples,rakaezDataCheck,rkOpen,rkSave,edit:d=>Object.assign(rkDraft,d),step:n=>{rkStep=n},state:()=>({demo:v11ExamplesMode,transactions:db.transactions.length,receivables:db.receivables?.length||0,collections:db.receivableCollections?.length||0,scheduled:db.scheduledOps?.length||0})};"
)(document,localStorage,MutationObserver,{},()=>{},()=>true,{randomUUID:()=>String(++sequence)});



const modalInsetStylesheet=document.head.children.find(el=>el.getAttribute('data-rk-layout')==='edge-safe-v19');
assert.ok(modalInsetStylesheet,'Modal edge spacing rules must be installed');
assert.ok(modalInsetStylesheet.textContent.includes('padding-inline:var(--rk-field-edge)!important'),
 'All modal content must have horizontal internal padding');
assert.ok(modalInsetStylesheet.textContent.includes('#modalRoot .modal>.rk-budget-detail-actions'),
 'Record and case dialog footer buttons must be inset from the edges');
assert.ok(modalInsetStylesheet.textContent.includes('max-width:100%!important'),
 'Forms must stay within the dialog width on mobile');
assert.ok(modalInsetStylesheet.textContent.includes('@media(max-width:680px)'),
 'Mobile layout must define independent horizontal spacing');


let rendered=0;
for(const [id] of app.N){
 app.navigate(id);
 const view=document.getElementById('view').innerHTML;
 assert.ok(view.length>70,'Restored page must render '+id);
 if(id==='insights'){
  assert.ok(view.includes('مركز الإحصاءات الموحد'),'Statistics must appear on home');
  assert.ok(view.includes('rk-stat-home-group'),'KPI sections must be available on home');
  assert.ok(view.includes('أرصدة ملاءة المسجلة'),'Home must include former financial-center KPIs');
  assert.ok(view.includes('إجمالي الاستثمار'),'Home must include investment KPIs');
  assert.ok(view.includes('التزامات غير نقدية ومؤشرات تخطيطية'),'Home includes planning indicators formerly on financial center');
  assert.ok(view.includes('<h2>المؤشرات</h2>'),'Home includes former financial intelligence indicator section');
 }else{
  assert.equal(app.rkSplitKpiPanels(view).blocks.length,0,'Statistics blocks must be absent outside home: '+id);
  assert.equal(app.rkSplitTitledIndicators(view).blocks.length,0,'Analytical indicator sections must also leave operational pages: '+id);
 }
 if(id==='spending'||id==='spending-followups')assert.ok(view.includes('aria-label="صفحات كفاءة الإنفاق"'),'Dedicated spending subpage selector must be restored');
 rendered++;
}
app.navigate('hilal');
const sidebar=document.getElementById('nav').innerHTML;
assert.ok(sidebar.includes('بنوك المنصة'),'Original bank section must return');
assert.ok(sidebar.includes('الإدارة والمتابعة'),'Original management section must return');
assert.ok(sidebar.includes('المعاملات المالية'),'Original transaction link must return');
assert.ok((sidebar.match(/rakaez-nav-link /g)||[]).length>=20,'Individual pages must be visible rather than bundled into five centers');
assert.ok(!sidebar.includes('الحسابات والعمليات'),'Five-workspace navigation must be absent');
assert.ok(app.rkSplitKpiPanels('<section class="rk-assets-summary"><div>قيمة <strong>10</strong></div></section><section class="card">صفحة تشغيلية</section>').remaining.includes('صفحة تشغيلية'),'Removing KPIs preserves operations');
assert.equal(app.rkSplitKpiPanels('<div class="grid stats"><div class="card stat">عدد</div></div>').blocks.length,1,'Nested cards extracted as a single KPI group');
app.navigate('spending');
assert.ok(document.getElementById('view').innerHTML.includes('مؤشرات الإنفاق'),'Supplier page remains dedicated');
app.navigate('spending-followups');
assert.ok(document.getElementById('view').innerHTML.includes('سجل المتابعة'),'Follow-ups remain dedicated');

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
assert.ok(document.getElementById('view').innerHTML.includes('معالجة ومتابعة'));
assert.ok(!document.getElementById('view').innerHTML.includes('سجل المتابعة'),'Supplier monitoring and follow-ups stay separate');

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

app.navigate('insights');
app.rkActionChooser();
assert.ok(document.getElementById('modalRoot').innerHTML.includes('ما الإجراء الذي تريد إنجازه؟'),'Linked action chooser remains available');
assert.ok(document.getElementById('modalRoot').innerHTML.includes('تسجيل استثمار'),'Launcher must include investing intent');
const beforeAssets=app.assetHoldings().length,beforeOperations=app.operationCases().length;
app.openModal('asset');
for(const [k,v] of Object.entries({fName:'استثمار تجريبي متابع',fKind:'سهم',fQty:'2',fCost:'100',fPrice:'115',fRisk:'متوسطة',fAssetAccount:''})){
 document.getElementById(k).value=v;
}
app.submitModal('asset','');
assert.equal(app.assetHoldings().length,beforeAssets+1,'Investment must be recorded once');
assert.equal(app.operationCases().length,beforeOperations+1,'An investment follow-up must be created automatically');
const investment=app.assetHoldings().at(-1),investmentCase=app.operationCases().at(-1);
assert.equal(investmentCase.relatedId,investment.id);
assert.equal(investmentCase.kind,'INVESTMENT');
app.navigate('spending-followups');
assert.ok(document.getElementById('view').innerHTML.includes('استثمار تجريبي متابع'),'Restored follow-ups page includes investment monitoring');
app.rkOperationCaseDialog(investmentCase.id);
assert.ok(document.getElementById('modalRoot').innerHTML.includes('سلسلة المتابعة'));
document.getElementById('rkOpStatus').value='CHECKIN';
document.getElementById('rkOpOwner').value='مسؤول الاستثمار';
document.getElementById('rkOpReview').value=investmentCase.nextReview;
document.getElementById('rkOpNote').value='مراجعة قيمة الاستثمار ومؤشرات المخاطر';
app.rkOperationCaseSave(investmentCase.id);
assert.equal(investmentCase.status,'MONITORING','Investment remains monitored after periodic review');
assert.equal(investmentCase.reviews,1,'A review cycle should be counted');
assert.ok(investmentCase.nextReview>new Date().toISOString().slice(0,10),'Next investment review is scheduled');

const beforeWithdrawals=app.operationCases().length;
app.updateTestSavings(20000);
app.openModal('withdraw');
document.getElementById('fBucket').value='instant';
document.getElementById('fAmount').value='100';
app.submitModal('withdraw','');
assert.equal(app.operationCases().length,beforeWithdrawals+1,'Savings withdrawal request must generate independent follow-up');
assert.equal(app.operationCases().at(-1).kind,'WITHDRAWAL');
assert.equal(app.operationCases().at(-1).status,'OPEN','A withdrawal request cannot be treated as settled immediately');
assert.equal(JSON.parse(storage.get('rakaez-v1')).operationFollowups.length,beforeWithdrawals+1,'Operation follow-up persists in the same local workspace');

assert.equal(app.rkActionCents('99.99'),9999,'Amounts must use exact halala conversion');
assert.equal(app.rkActionCents('1.234'),null,'Reject fractions smaller than one halala');
app.openModal('transaction');
assert.ok(document.getElementById('modalRoot').innerHTML.includes('إجراء مالي متكامل'),
 'Legacy manual expense entry must use the unified linked action');
app.rkActionOpen('income');
document.getElementById('rkAType').value='income';
document.getElementById('rkADate').value=new Date().toISOString().slice(0,10);
document.getElementById('rkADesc').value='دخل تجريبي مستقل';
document.getElementById('rkAAmount').value='123.45';
const incomeCaseCount=app.merchantCases().length;
const incomeTxCount=app.state().transactions;
app.rkActionCommit();
assert.equal(app.state().transactions,incomeTxCount+1,'Income must be recorded once');
assert.equal(app.merchantCases().length,incomeCaseCount,'Income must not create a spending follow-up');

const originalCase=app.merchantCases().find(c=>c.id===merchantCase.id);
const eventsBeforeEdit=originalCase.events.length;
app.navigate('hilal');
for(const [field,value] of Object.entries({rkTxDesc:tx.description,rkTxDate:tx.date,rkTxType:'expense',rkTxCategory:'food',rkTxAmount:'600.00'})){
 document.getElementById(field).value=value;
}
app.rkSaveTransactionEdit(tx.id);
assert.equal(app.rkActionPeriodSpend('food',tx.date.slice(0,7)),60000,'Budget must recalculate after editing an expense');
assert.ok(originalCase.events.length>eventsBeforeEdit,'Editing a linked expense must retain follow-up trace');
assert.equal(originalCase.events.at(-1).action,'SOURCE_EDITED');
app.rkRemoveTransaction(tx.id);
assert.equal(app.rkActionPeriodSpend('food',tx.date.slice(0,7)),0,'Deleting the expense removes its budget effect');
assert.equal(originalCase.status,'BLOCKED','Deleting linked source requires explicit review of case');
assert.equal(originalCase.events.at(-1).action,'SOURCE_REMOVED','Do not silently erase the follow-up chain');




const real=storage.get('rakaez-v1');
app.v11ToggleSamples();
assert.equal(app.state().demo,true);
assert.equal(app.state().transactions,420);
assert.ok(app.state().receivables>0);
assert.deepEqual(app.rakaezDataCheck(),[]);
app.v11ToggleSamples();
assert.equal(app.state().demo,false);
assert.equal(storage.get('rakaez-v1'),real,'Demo mode must preserve personal data');
console.log('Rakaez smoke PASS: '+rendered+' restored pages, '+modalCount+' dialogs, one-action financial impact, investment and withdrawal follow-ups, isolated demo data.');
