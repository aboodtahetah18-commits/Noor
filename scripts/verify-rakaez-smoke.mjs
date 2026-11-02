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
  source+"\nreturn {N,navigate,openModal,formV3,interbankForm,ledgerOpen,ledgerReconcile,researchForm,v14CycleForm,v11ToggleSamples,rakaezDataCheck,rkOpen,rkSave,edit:d=>Object.assign(rkDraft,d),step:n=>{rkStep=n},state:()=>({demo:v11ExamplesMode,transactions:db.transactions.length,receivables:db.receivables?.length||0,collections:db.receivableCollections?.length||0,scheduled:db.scheduledOps?.length||0})};"
)(document,localStorage,MutationObserver,{},()=>{},()=>true,{randomUUID:()=>String(++sequence)});

let rendered=0;
for(const [id] of app.N){
  app.navigate(id);
  assert.ok(document.getElementById('view').innerHTML.length>70,'Empty page '+id);
  rendered++;
}
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
const real=storage.get('rakaez-v1');
app.v11ToggleSamples();
assert.equal(app.state().demo,true);
assert.equal(app.state().transactions,420);
assert.ok(app.state().receivables>0);
assert.deepEqual(app.rakaezDataCheck(),[]);
app.v11ToggleSamples();
assert.equal(app.state().demo,false);
assert.equal(storage.get('rakaez-v1'),real,'Demo mode must preserve personal data');
console.log('Rakaez smoke PASS: '+rendered+' pages, '+modalCount+' existing modal routes, 3 new workflows, sample/real isolation.');
