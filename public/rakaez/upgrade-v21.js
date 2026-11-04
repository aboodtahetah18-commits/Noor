/* Rakaez v21: compact touch-friendly dialogs, detail-first budgets, single trial workspace.
   Trial records are isolated; previous personal data remains stored locally. */
(function(){
'use strict';
if(typeof db==='undefined'||typeof v18ActiveCategories!=='function')return;
const BACKUP_KEY='rakaez-v21-personal-preserved';
const STARTED_KEY='rakaez-v21-trial-initialized';
function startSampleWorkspace(){
 try{
  if(!v11ExamplesMode){
   const personal=localStorage.getItem(V11_REAL_KEY);
   if(personal && !localStorage.getItem(BACKUP_KEY))localStorage.setItem(BACKUP_KEY,personal);
   let samples=null;
   try{samples=JSON.parse(localStorage.getItem(V11_DEMO_KEY)||'null')}catch(e){}
   if(!samples||!Array.isArray(samples.categories)||!Array.isArray(samples.transactions))samples=v11BuildSamples();
   db=samples;
   v11ExamplesMode=true;
   localStorage.setItem('rakaez-v11-mode','demo');
   save();
  }
  localStorage.setItem(STARTED_KEY,'yes');
 }catch(e){
  console.warn('Could not safely initialize isolated example records',e);
  if(typeof toast==='function')toast('تعذر تجهيز بيانات الاختبار دون المساس ببياناتك. تحقق من سعة تخزين المتصفح.');
 }
}
function clearOldModeUI(){
 document.querySelectorAll('#rakaezModePanel,#v11ModeTag,.content>.demo,.topbar .rakaez-add').forEach(el=>el.remove());
}
if(typeof rakaezSamplePanel==='function'){
 rakaezSamplePanel=function(){document.getElementById('rakaezModePanel')?.remove()};
}
const oldBudgetView=v18Budgets;
v18Budgets=function(){
 const cats=v18ActiveCategories();
 return '<section class="v21-budget-section" aria-label="بنود الميزانية">'+
 '<header class="v21-budget-heading"><div><h2>بنود الميزانية</h2><p>اضغط على اسم البند لمراجعة التفاصيل والإجراءات</p></div>'+
 '<button class="btn primary v21-add-category" type="button" data-v21-new-category>'+ico('plus')+' إضافة بند</button></header>'+
 (cats.length?'<div class="v21-budget-list">'+cats.map(c=>
 '<button type="button" class="v21-budget-row" data-v21-category="'+esc(c.id)+'" aria-label="عرض تفاصيل بند '+esc(c.name)+'">'+
 '<strong>'+esc(c.name)+'</strong><span class="v21-budget-hint">عرض التفاصيل</span></button>').join('')+'</div>':
 '<div class="card v21-budget-empty">لا توجد بنود نشطة. اختر «إضافة بند» لإنشاء أول بند.</div>')+
 '</section>';
};
function categoryAllocation(c){
 const cycle=(db.salaryCycles||[]).find(x=>x.period===month&&x.approved);
 return cycle&&Object.prototype.hasOwnProperty.call(cycle.amounts||{},c.id)?
 Number(cycle.amounts[c.id]||0):Math.round(Number(c.limit||0)*100);
}
function openCategory(id){
 const c=db.categories.find(x=>x.id===id&&!x.archived);if(!c)return;
 const allocated=categoryAllocation(c),used=spent(c.id),remaining=allocated-used;
 const fraction=allocated>0?Math.round(used/allocated*100):used>0?100:0;
 const records=(db.transactions||[]).filter(t=>t.category===c.id&&t.type==='expense'&&String(t.date||'').slice(0,7)===month).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,6);
 const rows=[['المخصص الشهري',money(allocated)],['المصروف الفعلي',money(used)],['المتبقي من البند',money(remaining)],['نسبة الاستهلاك',fraction+'%']];
 const root=document.getElementById('modalRoot');
 root.innerHTML='<div class="modalbg v21-detail-backdrop" data-v21-overlay>'+
 '<section class="v21-detail-dialog" role="dialog" aria-modal="true" aria-label="تفاصيل بند '+esc(c.name)+'">'+
 '<header class="v21-detail-header"><button type="button" class="v21-detail-close" data-v21-close aria-label="إغلاق">'+ico('close')+'</button>'+
 '<div><h2>'+esc(c.name)+'</h2><p>تفاصيل بند الميزانية · '+esc(month)+'</p></div></header>'+
 '<div class="v21-detail-scroll"><div class="v21-detail-values">'+rows.map(([k,v])=>'<div><span>'+esc(k)+'</span><strong>'+esc(v)+'</strong></div>').join('')+'</div>'+
 '<div class="v21-detail-progress" role="progressbar" aria-label="نسبة استهلاك البند" aria-valuenow="'+Math.min(100,Math.max(0,fraction))+'" aria-valuemin="0" aria-valuemax="100"><span style="width:'+Math.min(100,Math.max(0,fraction))+'%"></span></div>'+
 '<h3>المصروفات المسجلة لهذا الشهر</h3>'+
 (records.length?'<div class="v21-detail-transactions">'+records.map(t=>'<div><span>'+esc(t.description||'مصروف')+'<small>'+esc(t.date||'')+'</small></span><strong>'+money(t.amount)+'</strong></div>').join('')+'</div>':
 '<p class="v21-detail-muted">لا توجد مصروفات مسجلة لهذا البند في الشهر المحدد.</p>')+
 '<p class="v21-detail-muted">القروض المستقلة لا تخصم من هذا البند، وتظل دورات الراتب المعتمدة محفوظة.</p></div>'+
 '<footer class="v21-detail-actions"><button type="button" class="btn primary" data-v21-edit-category="'+esc(id)+'">'+ico('edit')+' تعديل</button>'+
 '<button type="button" class="btn v21-delete-btn" data-v21-delete-category="'+esc(id)+'">'+ico('delete')+' حذف</button></footer></section></div>';
 const scrolling=root.querySelector('.v21-detail-scroll');if(scrolling)scrolling.scrollTop=0;
}
function deleteCategory(id){
 const c=db.categories.find(x=>x.id===id&&!x.archived);if(!c)return;
 const linked=(db.transactions||[]).some(t=>t.category===id)||
 (db.fundings||[]).some(f=>f.category===id)||
 (db.salaryCycles||[]).some(p=>Object.prototype.hasOwnProperty.call(p.amounts||{},id))||
 (db.rkCyclesV19||[]).some(p=>Object.prototype.hasOwnProperty.call(p.allocations||{},id)||(p.categories||[]).some(x=>x.categoryId===id));
 const message=linked?'حذف هذا البند من الميزانية؟ ستبقى حركاته المالية ودوراته السابقة محفوظة حتى لا تتغير الحسابات التاريخية.':'هل تريد حذف هذا البند نهائيًا؟';
 if(!confirm(message))return;
 if(linked){c.archived=true;c.deletedAt=new Date().toISOString()}
 else db.categories=db.categories.filter(x=>x.id!==id);
 audit('حذف بند من الميزانية',c.name);
 save();
 closeModal();
 render();
 toast('تم حذف البند من قائمة الميزانية');
}
rkBudgetOpen=function(id){openCategory(id)};
function alignSemanticIcons(root){
 if(!root)return;
 root.querySelectorAll('button:not([data-v21-icon-checked])').forEach(b=>{
  if(b.closest('.v19-progress,.v19-hilal-tabs,.v21-budget-list'))return;
  const label=(b.getAttribute('aria-label')||b.textContent||'').replace(/\s+/g,' ').trim();
  const iconName=/^(تعديل|تحرير)/.test(label)?'edit':/^(حذف|إزالة)/.test(label)?'delete':/^(التفاصيل|تفاصيل|عرض التفاصيل|معاينة التفاصيل)/.test(label)?'view':null;
  if(!iconName)return;
  const glyph=b.querySelector('svg');
  if(glyph)glyph.outerHTML=ico(iconName);
  else if(!b.querySelector('.rakaez-action-icon'))b.insertAdjacentHTML('afterbegin',ico(iconName));
  b.dataset.v21IconChecked='1';
 });
}
function ensureOneClose(){
 document.querySelectorAll('#modalRoot .modalhead,#modalRoot .v3header,#modalRoot .v7-head,#modalRoot .v19-workspace-header').forEach(head=>{
  const closers=Array.from(head.querySelectorAll('button')).filter(b=>b.matches('[data-v18-close],.v19-close,[aria-label="إغلاق"],.rk-budget-close')||/^[×✕xX]$/.test((b.textContent||'').trim()));
  closers.slice(1).forEach(b=>b.remove());
 });
}
function afterRender(){
 clearOldModeUI();
 alignSemanticIcons(document.getElementById('view'));
 alignSemanticIcons(document.getElementById('modalRoot'));
 ensureOneClose();
}
const oldRender=render;
render=function(){
 const output=oldRender.apply(this,arguments);
 afterRender();
 return output;
};
document.addEventListener('click',event=>{
 const node=event.target.closest('[data-v21-category],[data-v21-new-category],[data-v21-edit-category],[data-v21-delete-category],[data-v21-close],[data-v21-overlay]');
 if(!node)return;
 if(node.hasAttribute('data-v21-overlay')&&event.target!==node)return;
 if(node.hasAttribute('data-v21-category')){event.preventDefault();openCategory(node.dataset.v21Category)}
 else if(node.hasAttribute('data-v21-new-category')){event.preventDefault();v18CategoryModal()}
 else if(node.hasAttribute('data-v21-edit-category')){event.preventDefault();closeModal();v18CategoryModal(node.dataset.v21EditCategory)}
 else if(node.hasAttribute('data-v21-delete-category')){event.preventDefault();deleteCategory(node.dataset.v21DeleteCategory)}
 else if(node.hasAttribute('data-v21-close')||node.hasAttribute('data-v21-overlay')){event.preventDefault();closeModal()}
});
document.addEventListener('focusin',event=>{
 const main=event.target.closest('#modalRoot .v19-workspace-main,#modalRoot .v21-detail-scroll');
 if(main&&event.target.matches('input,select,textarea')){
  requestAnimationFrame(()=>{if(!main.isConnected)return;const el=event.target,b=el.getBoundingClientRect(),r=main.getBoundingClientRect();if(b.bottom>r.bottom-18)main.scrollTop+=b.bottom-r.bottom+34;if(b.top<r.top+12)main.scrollTop-=r.top-b.top+24});
 }
});
const observer=new MutationObserver(records=>{
 if(records.some(r=>Array.from(r.addedNodes||[]).some(n=>n.nodeType===1))){
  clearOldModeUI();
  alignSemanticIcons(document.getElementById('modalRoot'));
  ensureOneClose();
 }
});
observer.observe(document.body,{subtree:true,childList:true});
startSampleWorkspace();
render();
})();