/* Rakaez V24 – preview-only mobile transaction actions and semantic financial colours.
   Production data and payment services are never touched by this interface. */
(function(){
'use strict';
if(typeof db==='undefined'||typeof transactions!=='function'||typeof render!=='function')return;
let filter='all',query='',searchOpen=false,filterOpen=false;
const financialIcons={
  all:'<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  expense:'<path d="M18 6 6 18M8 6h10v10"/>',
  income:'<path d="M6 18 18 6M6 8v10h10"/>',
  filter:'<path d="M3 5h18l-7 8v7l-4-2v-5z"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  plus:'<path d="M12 5v14M5 12h14"/>'
};
const symbols=kind=>'<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(financialIcons[kind]||financialIcons.all)+'</svg>';
const safe=value=>esc(String(value==null?'':value));
const findCategory=id=>(db.categories||[]).find(c=>c.id===id&&!c.archived);
const kindName={all:'الكل',expense:'المصروفات',income:'الإيرادات'};
function results(){
 const q=query.trim().toLocaleLowerCase('ar');
 return (db.transactions||[]).filter(t=>{
  if(filter!=='all'&&t.type!==filter)return false;
  if(!q)return true;
  const category=findCategory(t.category);
  return [t.description,t.date,category?.name,t.merchantEnglish,t.merchant].some(v=>String(v||'').toLocaleLowerCase('ar').includes(q));
 }).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
}
function recordCard(t){
 const income=t.type==='income',category=findCategory(t.category);
 const cname=category?category.name:'غير مرتبط';
 const accent=income?'income':'expense';
 return '<button type="button" class="v24-record '+accent+'" data-v24-open="'+safe(t.id)+'" aria-label="تفاصيل '+safe(t.description||'المعاملة')+'">'+
 '<span class="v24-record-top"><span class="v24-record-kind">'+symbols(accent)+(income?' إيراد':' مصروف')+'</span>'+
 '<strong class="v24-amount" dir="ltr">'+(income?'+':'−')+money(t.amount)+'</strong></span>'+
 '<strong class="v24-record-name">'+safe(t.description||'معاملة مالية')+'</strong>'+
 '<span class="v24-record-date">'+safe(t.date||'')+'</span>'+
 '<span class="v24-record-bottom">'+(income?
  '<span class="v24-income-tag">'+symbols('income')+' إيراد</span>':
  '<span class="v24-category-tag">'+(category&&typeof rakCategoryIcon==='function'?rakCategoryIcon(t.category):'')+'<span>'+safe(cname)+'</span></span>')+
 '<span class="v24-details">'+symbols('eye')+' التفاصيل</span></span></button>';
}
function recordGrid(){
 const list=results();
 return list.length?list.map(recordCard).join(''):'<div class="card v24-empty">لا توجد معاملات مطابقة.</div>';
}
function actions(){
 return '<div class="v24-toolbar" role="toolbar" aria-label="إجراءات المعاملات المالية">'+
 '<button type="button" class="v24-action v24-add" data-v24-action="add" aria-label="إضافة معاملة">'+symbols('plus')+'<span>إضافة</span></button>'+
 '<button type="button" class="v24-action v24-filter" data-v24-action="filter" aria-label="تصفية المعاملات، الاختيار الحالي: '+kindName[filter]+'" aria-expanded="'+filterOpen+'" aria-controls="v24FilterPanel">'+symbols('filter')+'<span>تصفية</span></button>'+
 '<button type="button" class="v24-action v24-search" data-v24-action="search" aria-label="البحث في المعاملات" aria-expanded="'+searchOpen+'" aria-controls="v24SearchPanel">'+symbols('search')+'<span>بحث</span></button></div>';
}
function utilities(){
 return '<div class="v24-utilities">'+
 (searchOpen?'<div class="v24-search-panel" id="v24SearchPanel"><label for="v24SearchInput">بحث في المعاملات</label><input id="v24SearchInput" type="search" autocomplete="off" placeholder="اسم المعاملة أو البند أو التاريخ" value="'+safe(query)+'"></div>':'')+
 (filterOpen?'<div class="v24-filter-panel" id="v24FilterPanel" data-rk-v18-filter="1" role="listbox" aria-label="نوع المعاملات">'+
 [['all','الكل'],['expense','المصروفات'],['income','الإيرادات']].map(([id,label])=>
 '<button type="button" role="option" aria-selected="'+(id===filter)+'" class="v24-filter-choice '+id+(filter===id?' selected':'')+'" data-v24-filter="'+id+'">'+symbols(id)+'<span>'+label+'</span>'+(filter===id?'<strong>✓</strong>':'')+'</button>').join('')+'</div>':'')+
 '</div>';
}
transactions=function(){
 return '<section class="v24-page" aria-label="سجل المعاملات المالية">'+actions()+utilities()+
 '<div class="v24-record-grid" id="v24Records">'+recordGrid()+'</div></section>';
};
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-v24-action],[data-v24-filter],[data-v24-open]');
 if(!button)return;
 if(button.hasAttribute('data-v24-open')){
  event.preventDefault();
  return rkTransactionDetails(button.dataset.v24Open);
 }
 if(button.hasAttribute('data-v24-filter')){
  event.preventDefault();
  filter=button.dataset.v24Filter;
  filterOpen=false;
  return render();
 }
 if(button.hasAttribute('data-v24-action')){
  event.preventDefault();
  const action=button.dataset.v24Action;
  if(action==='add')return openModal('transaction');
  if(action==='filter'){filterOpen=!filterOpen;searchOpen=false;render();return;}
  if(action==='search'){
   searchOpen=!searchOpen;filterOpen=false;render();
   if(searchOpen)document.getElementById('v24SearchInput')?.focus({preventScroll:true});
  }
 }
});
document.addEventListener('input',event=>{
 if(event.target.id!=='v24SearchInput')return;
 query=event.target.value;
 const host=document.getElementById('v24Records');if(host)host.innerHTML=recordGrid();
});
document.addEventListener('keydown',event=>{
 if(event.key!=='Escape')return;
 if(!searchOpen&&!filterOpen)return;
 if(document.getElementById('v24FilterPanel')||document.getElementById('v24SearchPanel')){
  filterOpen=false;searchOpen=false;render();
 }
});
render();
})();