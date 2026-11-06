/* Rakaez v22 preview: hierarchy for external banks and branded financial categories.
   Preview only. No remote account calls, no automatic transfers. */
(function(){
'use strict';
if(typeof db==='undefined'||typeof rkExternalEnsure!=='function'||typeof save!=='function')return;
const centerLabels={hilal:'بنك الهلال التشغيلي',malaa:'بنك ملاءة للادخار',assets:'بنك الأصول الاستثماري'};
const palettes=['navy','gold','blue','teal','red','dark'];
let wizard=null,searchText='',txMode='all';
function clean(v){return esc(String(v==null?'':v))}
function activeCats(){return (db.categories||[]).filter(c=>!c.archived)}
function category(id){return db.categories.find(c=>c.id===id)}
function catStyle(c){
 if(!c)return 'navy';
 const t=String(c.id+' '+c.name).toLowerCase();
 if(/سكن|إيجار|منزل|housing/.test(t))return 'navy';
 if(/مطعم|وجبات|مقهى|ضيافة|restaurant|leisure/.test(t))return 'gold';
 if(/فاتورة|اتصال|كهرباء|ماء|bills/.test(t))return 'blue';
 if(/غذاء|مقاضي|تسوق|food/.test(t))return 'teal';
 if(/سيارة|نقل|وقود|مركب|transport/.test(t))return 'dark';
 if(/صحة|علاج|دواء|health/.test(t))return 'red';
 let h=0;for(const ch of String(c.id))h=(h*31+ch.charCodeAt(0))>>>0;
 return palettes[h%palettes.length];
}
function catIcon(c){
 if(!c)return ico('wallet');
 const t=String(c.id+' '+c.name).toLowerCase();
 if(/سكن|إيجار|منزل|housing/.test(t))return ico('home');
 if(/مطعم|وجبات|مقهى|ضيافة|restaurant/.test(t))return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 3v8m3-8v8M4 8h3m-1.5 3v10M15 3v18M20 3c1 2 1.5 4 1.5 6S21 13 19 14h-4"/></svg>';
 if(/فاتورة|اتصال|كهرباء|ماء|bills/.test(t))return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3ZM9 8h6m-6 4h6m-6 4h4"/></svg>';
 if(/غذاء|مقاضي|تسوق|food/.test(t))return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 8 2 12h14l2-12H3Zm5 0 4-5 4 5M8 12v4m8-4v4"/></svg>';
 if(/نقل|سيارة|وقود|مركب|transport/.test(t))return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 16V9l3-4h10l3 4v7M4 12h16M7 16h.01M17 16h.01M6 19h2m8 0h2"/></svg>';
 if(/صحة|علاج|دواء|health/.test(t))return ico('shield');
 return ico(icons[c.icon]?c.icon:'layers');
}
function badge(id){const c=category(id);return c?'<span class="v22-cat tone-'+catStyle(c)+'">'+catIcon(c)+'<span>'+clean(c.name)+'</span></span>':'<span class="v22-cat tone-navy">غير مرتبط</span>'}
function groupKey(s){return String(s||'').trim().toLocaleLowerCase('ar')}
function bankGroups(){
 rkExternalEnsure();const result=new Map();
 for(const r of db.externalBanks){
  const key=groupKey(r.name);if(!key)continue;
  if(!result.has(key))result.set(key,{key,name:r.name,logo:'',accounts:[]});
  const g=result.get(key);g.accounts.push(r);if(!g.logo&&r.logo)g.logo=r.logo;
 }
 return [...result.values()];
}
function logoHTML(g){return g.logo&&/^data:image\/(?:png|jpeg|webp);base64,/.test(g.logo)?'<img alt="شعار '+clean(g.name)+'" src="'+clean(g.logo)+'">':ico('bank')}
function accountType(a){return a.kind==='sub'?'فرعي':'رئيسي'}
function accountRow(a,sub){
 const tags=(a.categoryIds||[]).filter(id=>category(id)).map(badge).join('');
 return '<button type="button" class="v22-account '+(sub?'is-sub':'is-main')+'" data-v22-account="'+clean(a.id)+'">'+
 '<span class="v22-account-symbol">'+ico(sub?'layers':'wallet')+'</span>'+
 '<span class="v22-account-info"><strong>'+clean(a.nickname||'الحساب الجاري')+'</strong><small>'+accountType(a)+' · '+(a.last4?'•••• '+clean(a.last4):'بدون رقم')+'</small>'+
 '<span class="v22-center">'+clean(centerLabels[a.center]||'غير مرتبط')+'</span>'+
 (tags?'<span class="v22-tags">'+tags+'</span>':'')+'</span>'+
 '<span class="v22-account-arrow">'+ico('view')+'</span></button>';
}
rkExternalBanksView=function(){
 const groups=bankGroups();
 return '<section class="v22-bank-page"><div class="v22-heading"><h2>البنوك الخارجية</h2><button type="button" class="btn primary" data-v22-addbank>'+ico('plus')+' إضافة بنك</button></div>'+
 (groups.length?'<div class="v22-banks">'+groups.map(g=>{
  const mains=g.accounts.filter(a=>a.kind!=='sub');
  const subs=g.accounts.filter(a=>a.kind==='sub');
  const orphan=subs.filter(a=>!mains.some(p=>p.id===a.parentId));
  const tree=mains.map(a=>'<div class="v22-account-group">'+accountRow(a,false)+
   (subs.some(b=>b.parentId===a.id)?'<div class="v22-children">'+subs.filter(b=>b.parentId===a.id).map(b=>accountRow(b,true)).join('')+'</div>':'')+'</div>').join('')+
   orphan.map(a=>accountRow(a,true)).join('');
  return '<article class="v22-bank"><header class="v22-bank-head"><span class="v22-bank-logo">'+logoHTML(g)+'</span>'+
   '<span class="v22-bank-title"><strong>'+clean(g.name)+'</strong><small>الحسابات الرئيسية والفرعية</small></span>'+
   '<button type="button" class="v22-bank-settings" data-v22-editbank="'+clean(g.accounts[0].id)+'" aria-label="تعديل بيانات البنك">'+ico('edit')+'</button></header>'+
   '<div class="v22-tree">'+tree+'</div>'+
   '<div class="v22-bank-actions"><button type="button" class="btn" data-v22-manage="'+clean(g.accounts[0].id)+'">تفاصيل البنك</button>'+
   '<button type="button" class="btn primary" data-v22-addaccount="'+clean(g.accounts[0].id)+'">'+ico('plus')+' إضافة حساب</button></div></article>';
 }).join('')+'</div>':'<div class="card v22-empty">لا توجد بنوك خارجية. اختر «إضافة بنك» للبدء.</div>')+'</section>';
};
function userAccount(id){return db.externalBanks.find(a=>a.id===id)}
function openAccount(id){
 const a=userAccount(id);if(!a)return;
 const g=bankGroups().find(x=>x.key===groupKey(a.name));
 const parent=userAccount(a.parentId);
 const tags=(a.categoryIds||[]).map(badge).join('');
 document.getElementById('modalRoot').innerHTML='<div class="modalbg v22-dim" data-v22-backdrop>'+
 '<section class="v22-detail" role="dialog" aria-modal="true" aria-label="تفاصيل الحساب">'+
 '<header class="v22-dialog-head"><button class="v22-close" data-v22-close aria-label="إغلاق">'+ico('close')+'</button><div><h2>'+clean(a.nickname||'الحساب الجاري')+'</h2><small>تفاصيل الحساب الخارجي</small></div></header>'+
 '<div class="v22-detail-main"><div class="v22-detail-bank"><span class="v22-bank-logo">'+logoHTML(g||{name:a.name,logo:a.logo})+'</span><strong>'+clean(a.name)+'</strong></div>'+
 '<div class="v22-facts">'+[
 ['نوع الحساب',accountType(a)],['آخر أربعة أرقام',a.last4?'•••• '+a.last4:'—'],
 ['المركز المرتبط',centerLabels[a.center]||'—'],['الحساب الرئيسي',a.kind==='sub'?(parent?.nickname||'غير مرتبط'):'مستقل']
 ].map(x=>'<div><span>'+clean(x[0])+'</span><strong>'+clean(x[1])+'</strong></div>').join('')+'</div>'+
 '<h3>البنود المرتبطة</h3><div class="v22-tags">'+(tags||'<span class="v22-empty-link">لا توجد بنود مرتبطة</span>')+'</div></div>'+
 '<footer class="v22-dialog-foot"><button type="button" class="btn primary" data-v22-editaccount="'+clean(a.id)+'">'+ico('edit')+' تعديل</button>'+
 '<button type="button" class="btn v22-danger" data-v22-deleteaccount="'+clean(a.id)+'">'+ico('delete')+' حذف</button></footer></section></div>';
}
rkExternalBankDetails=function(id){openAccount(id)};
function openBankSummary(id){
 const a=userAccount(id);if(!a)return;const group=bankGroups().find(g=>g.key===groupKey(a.name));if(!group)return;
 document.getElementById('modalRoot').innerHTML='<div class="modalbg v22-dim" data-v22-backdrop><section class="v22-detail" role="dialog" aria-modal="true" aria-label="إدارة البنك">'+
 '<header class="v22-dialog-head"><button class="v22-close" data-v22-close aria-label="إغلاق">'+ico('close')+'</button><div><h2>'+clean(group.name)+'</h2><small>الحسابات المرتبطة</small></div></header>'+
 '<div class="v22-detail-main"><div class="v22-detail-bank"><span class="v22-bank-logo">'+logoHTML(group)+'</span><strong>'+clean(group.name)+'</strong></div>'+
 group.accounts.map(a=>'<button class="v22-summary-row" data-v22-account="'+clean(a.id)+'"><strong>'+clean(a.nickname||'الحساب الجاري')+'</strong><span>'+accountType(a)+' · '+(a.last4?'•••• '+clean(a.last4):'—')+'</span></button>').join('')+'</div>'+
 '<footer class="v22-dialog-foot"><button class="btn primary" data-v22-addaccount="'+clean(a.id)+'">'+ico('plus')+' إضافة حساب</button>'+
 '<button class="btn" data-v22-editbank="'+clean(a.id)+'">'+ico('edit')+' بيانات البنك</button></footer></section></div>';
}
function startWizard(accountId='',addToBankId='',onlyBank=false){
 const old=userAccount(accountId),same=userAccount(addToBankId);
 const group=old?.name||same?.name||'';
 wizard={step:0,oldId:old?.id||'',group,onlyBank:!!onlyBank,bankName:group||'',logo:old?.logo||same?.logo||'',
  nickname:old?.nickname||'',kind:old?.kind||'main',parentId:old?.parentId||'',last4:old?.last4||'',
  center:old?.center||same?.center||'hilal',categoryIds:[...(old?.categoryIds||[])]};
 if(!wizard.oldId&&same){wizard.kind='sub';wizard.parentId=same.kind==='sub'?same.parentId:same.id}
 renderWizard();
}
function wizardRead(){
 if(!wizard)return;
 const q=id=>document.getElementById(id);
 if(q('v22BankName'))wizard.bankName=q('v22BankName').value.trim();
 if(q('v22AccountName'))wizard.nickname=q('v22AccountName').value.trim();
 if(q('v22AccountKind'))wizard.kind=q('v22AccountKind').value;
 if(q('v22Parent'))wizard.parentId=q('v22Parent').value;
 if(q('v22Last4'))wizard.last4=q('v22Last4').value.trim();
 if(q('v22Center'))wizard.center=q('v22Center').value;
 if(document.getElementById('v22CategoryList'))wizard.categoryIds=[...document.querySelectorAll('#v22CategoryList input:checked')].map(x=>x.value);
}
function parentChoices(){
 const key=groupKey(wizard.group||wizard.bankName);
 const parents=db.externalBanks.filter(a=>groupKey(a.name)===key&&a.kind!=='sub'&&a.id!==wizard.oldId);
 return parents.map(a=>'<option value="'+clean(a.id)+'" '+(wizard.parentId===a.id?'selected':'')+'>'+clean(a.nickname||'الحساب الجاري')+(a.last4?' · ••••'+clean(a.last4):'')+'</option>').join('');
}
function opt(id,label,current){return '<option value="'+clean(id)+'" '+(id===current?'selected':'')+'>'+clean(label)+'</option>'}
function renderWizard(){
 if(!wizard)return;
 const w=wizard,step=w.step,steps=['البنك','الحساب','الربط','المراجعة'];
 let content='';
 if(step===0)content='<div class="v22-field"><label for="v22BankName">اسم البنك</label><input id="v22BankName" maxlength="90" value="'+clean(w.bankName)+'" '+(w.group&&!w.onlyBank?'readonly':'')+'></div>'+
 '<div class="v22-field"><label for="v22Logo">شعار البنك الرسمي (اختياري)</label><div class="v22-logo-pick"><span class="v22-bank-logo">'+logoHTML({name:w.bankName,logo:w.logo})+'</span>'+
 '<input id="v22Logo" type="file" accept="image/png,image/jpeg,image/webp"></div></div>';
 if(step===1)content='<div class="v22-form-grid"><div class="v22-field"><label for="v22AccountName">اسم الحساب</label><input id="v22AccountName" maxlength="90" value="'+clean(w.nickname)+'" placeholder="الحساب الجاري"></div>'+
 '<div class="v22-field"><label for="v22Last4">آخر أربعة أرقام (اختياري)</label><input id="v22Last4" maxlength="4" inputmode="numeric" value="'+clean(w.last4)+'" placeholder="4821"></div>'+
 '<div class="v22-field"><label for="v22AccountKind">نوع الحساب</label><select id="v22AccountKind">'+opt('main','رئيسي',w.kind)+opt('sub','فرعي',w.kind)+'</select></div>'+
 (w.kind==='sub'?'<div class="v22-field"><label for="v22Parent">يتبع الحساب الرئيسي</label><select id="v22Parent"><option value="">اختر الحساب</option>'+parentChoices()+'</select></div>':'')+'</div>';
 if(step===2)content='<div class="v22-field"><label for="v22Center">المركز المالي في ركائز</label><select id="v22Center">'+Object.keys(centerLabels).map(k=>opt(k,centerLabels[k],w.center)).join('')+'</select></div>'+
 '<div class="v22-field"><label>بنود الميزانية المرتبطة</label><div class="v22-category-checks" id="v22CategoryList">'+activeCats().map(c=>'<label class="v22-category-option"><input type="checkbox" value="'+clean(c.id)+'" '+(w.categoryIds.includes(c.id)?'checked':'')+'>'+badge(c.id)+'</label>').join('')+'</div></div>';
 if(step===3)content='<div class="v22-facts">'+[
 ['البنك',w.bankName],['الحساب',w.nickname],['نوع الحساب',w.kind==='sub'?'فرعي':'رئيسي'],
 ['آخر أربعة أرقام',w.last4?'•••• '+w.last4:'—'],['المركز المرتبط',centerLabels[w.center]],
 ['يتبع',w.kind==='sub'?userAccount(w.parentId)?.nickname||'—':'مستقل']
 ].map(x=>'<div><span>'+clean(x[0])+'</span><strong>'+clean(x[1])+'</strong></div>').join('')+'</div>'+
 '<h3>البنود المرتبطة</h3><div class="v22-tags">'+(w.categoryIds.map(badge).join('')||'<span class="v22-empty-link">دون بنود</span>')+'</div>';
 const final=step===3;
 document.getElementById('modalRoot').innerHTML='<div class="modalbg v22-dim"><section class="v22-wizard" role="dialog" aria-modal="true" aria-label="إضافة أو تعديل حساب خارجي">'+
 '<header class="v22-dialog-head"><button type="button" class="v22-close" data-v22-close aria-label="إغلاق">'+ico('close')+'</button><div><h2>'+((w.oldId||w.onlyBank)?'تعديل بيانات البنك والحساب':'إضافة بنك أو حساب')+'</h2><small>'+(step+1)+' من 4</small></div></header>'+
 '<nav class="v22-steps">'+steps.map((x,i)=>'<span class="'+(i===step?'active':i<step?'done':'')+'">'+(i+1)+'. '+x+'</span>').join('')+'</nav>'+
 '<main class="v22-wizard-body">'+content+'</main>'+
 '<footer class="v22-dialog-foot">'+(final?'<button type="button" class="btn primary v22-full" data-v22-save>'+ico('check')+' حفظ البيانات</button>':
 '<button type="button" class="btn primary" data-v22-next>التالي '+ico('next')+'</button>'+
 '<button type="button" class="btn" data-v22-previous '+(step===0?'disabled':'')+'>'+ico('prev')+' السابق</button>')+'</footer></section></div>';
}
function validStep(){
 const w=wizard;
 if(w.step===0){
  if(!w.bankName)return 'أدخل اسم البنك.';
  const existing=bankGroups().find(g=>g.key===groupKey(w.bankName));
  if(!w.group&&existing)return 'هذا البنك موجود؛ افتحه ثم اختر «إضافة حساب».';
  if(w.group&&groupKey(w.group)!==groupKey(w.bankName)&&existing)return 'اسم البنك مستخدم بالفعل.';
 }
 if(w.step===1){
  if(!w.nickname)return 'أدخل اسم الحساب.';
  if(w.last4&&!/^\d{4}$/.test(w.last4))return 'آخر أربعة أرقام يجب أن تتكون من 4 أرقام.';
  if(w.kind==='sub'&&(!w.parentId||!db.externalBanks.some(a=>a.id===w.parentId&&groupKey(a.name)===groupKey(w.group||w.bankName)&&a.kind!=='sub')))return 'اختر حسابًا رئيسيًا من البنك نفسه.';
  if(w.oldId&&w.kind==='sub'&&db.externalBanks.some(a=>a.parentId===w.oldId))return 'لا يمكن تحويل الحساب إلى فرعي وله حسابات تابعة.';
 }
 if(w.step===2&&!centerLabels[w.center])return 'حدد المركز المالي.';
 return '';
}
function saveWizard(){
 if(!wizard)return;wizardRead();
 for(let i=0;i<=2;i++){const old=wizard.step;wizard.step=i;const err=validStep();wizard.step=old;if(err){wizard.step=i;renderWizard();alert(err);return}}
 const w=wizard;
 const bankKey=groupKey(w.group||w.bankName);
 const dup=db.externalBanks.some(a=>a.id!==w.oldId&&groupKey(a.name)===groupKey(w.bankName)&&w.last4&&a.last4===w.last4);
 if(dup){alert('الحساب الذي يحمل هذه الأرقام مسجل مسبقًا في البنك.');return}
 const record={id:w.oldId||rid(),name:w.bankName,nickname:w.nickname,last4:w.last4,center:w.center,
   logo:w.logo||'',kind:w.kind,parentId:w.kind==='sub'?w.parentId:'',categoryIds:w.categoryIds.slice()};
 const backup=db.externalBanks.map(a=>Object.assign({},a));
 try{
  if(w.group){db.externalBanks.forEach(a=>{if(groupKey(a.name)===bankKey){a.name=w.bankName;a.logo=w.logo||a.logo||''}})}
  const i=db.externalBanks.findIndex(a=>a.id===record.id);
  if(i>=0)db.externalBanks[i]=record;else db.externalBanks.push(record);
  audit('حفظ حساب بنك خارجي',w.bankName+' / '+w.nickname);
  save();
 }catch(e){db.externalBanks=backup;alert('تعذر حفظ الحساب. تأكد من توفر مساحة تخزين على الجهاز.');return}
 wizard=null;render();openAccount(record.id);toast('تم حفظ الحساب وروابط البنود');
}
function deleteAccount(id){
 const a=userAccount(id);if(!a)return;
 if(db.externalBanks.some(x=>x.parentId===id)){alert('يجب نقل الحسابات الفرعية أو حذفها قبل حذف حسابها الرئيسي.');return}
 if((db.transactions||[]).some(t=>t.externalAccountId===id||t.bankAccountId===id)){alert('هذا الحساب مرتبط بمعاملة مسجلة، فلا يمكن حذفه دون مراجعة السجل.');return}
 if(!confirm('هل تريد حذف حساب '+a.nickname+'؟'))return;
 db.externalBanks=db.externalBanks.filter(x=>x.id!==id);save();closeModal();render();toast('تم حذف الحساب');
}
rkExternalBankOpen=function(id){startWizard(id||'')};
rkRemoveExternalBank=function(id){deleteAccount(id)};
const oldIcons=rakCategoryIcon;
rakCategoryIcon=function(id){const c=category(id);return c?'<span class="v22-inline-icon tone-'+catStyle(c)+'">'+catIcon(c)+'</span>':oldIcons(id)};
v18Budgets=function(){
 const cats=activeCats();
 return '<section class="v22-budget-page"><div class="v22-heading"><h2>بنود الميزانية</h2><button class="btn primary" type="button" data-v22-newcat>'+ico('plus')+' إضافة بند</button></div>'+
 '<div class="v22-budget-list">'+(cats.length?cats.map(c=>'<button type="button" class="v22-budget-item" data-v21-category="'+clean(c.id)+'">'+
 '<span class="v22-budget-mark tone-'+catStyle(c)+'">'+catIcon(c)+'</span><strong>'+clean(c.name)+'</strong>'+
 '<span class="v22-budget-open">'+ico('view')+'</span></button>').join(''):'<div class="card v22-empty">لا توجد بنود.</div>')+'</div></section>';
};
function transactionCard(t){
 const income=t.type==='income',c=category(t.category);
 return '<button type="button" class="v22-tx '+(income?'income':'expense')+'" data-v22-tx="'+clean(t.id)+'">'+
 '<span class="v22-tx-top"><span class="v22-tx-kind">'+ico(income?'chart':'wallet')+(income?' إيراد':' مصروف')+'</span>'+
 '<strong class="v22-amount">'+(income?'+':'−')+money(t.amount)+'</strong></span>'+
 '<strong class="v22-tx-name">'+clean(t.description||'معاملة مالية')+'</strong>'+
 '<span class="v22-tx-meta">'+clean(t.date||'')+'</span>'+
 '<span class="v22-tx-bottom">'+(income?'<span class="v22-income-tag">إيراد</span>':c?badge(c.id):'<span class="v22-empty-link">دون بند</span>')+
 '<span class="v22-open">'+ico('view')+' التفاصيل</span></span></button>';
}
function txList(){
 const q=searchText.toLocaleLowerCase('ar');
 const records=db.transactions.filter(t=>(txMode==='all'||t.type===txMode)&&(!q||String((t.description||'')+' '+(t.date||'')+' '+(category(t.category)?.name||'')).toLocaleLowerCase('ar').includes(q))).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 return records.length?records.map(transactionCard).join(''):'<div class="card v22-empty">لا توجد معاملات مطابقة.</div>';
}
transactions=function(){
 return '<section class="v22-transactions"><div class="v22-heading"><h2>المعاملات المالية</h2><button type="button" class="btn primary" onclick="openModal(\'transaction\')">'+ico('plus')+' إضافة معاملة</button></div>'+
 '<div class="v22-tx-tools"><label><span>'+ico('search')+'</span><input id="v22TxSearch" type="search" placeholder="ابحث عن معاملة" value="'+clean(searchText)+'"></label>'+
 '<div class="v22-filters">'+[['all','الكل'],['expense','المصروفات'],['income','الإيرادات']].map(x=>'<button type="button" class="'+(txMode===x[0]?'active':'')+'" data-v22-filter="'+x[0]+'">'+x[1]+'</button>').join('')+'</div></div>'+
 '<div class="v22-tx-grid" id="v22TxGrid">'+txList()+'</div></section>';
};
rkTransactionDetails=function(id){
 const t=db.transactions.find(x=>x.id===id);if(!t)return;
 const isIncome=t.type==='income';
 const rows=[['نوع العملية',isIncome?'إيراد':'مصروف'],['التاريخ',t.date],['البند',category(t.category)?.name||'—'],
 ['الجهة',t.merchantEnglish||t.merchant||'—'],['الملاحظات',t.notes||'—']];
 document.getElementById('modalRoot').innerHTML='<div class="modalbg v22-dim"><section class="v22-detail" role="dialog" aria-modal="true" aria-label="تفاصيل المعاملة">'+
 '<header class="v22-dialog-head"><button class="v22-close" data-v22-close aria-label="إغلاق">'+ico('close')+'</button><div><h2>تفاصيل المعاملة</h2></div></header>'+
 '<div class="v22-detail-main"><div class="v22-tx-hero '+(isIncome?'income':'expense')+'"><span>'+ico(isIncome?'chart':'wallet')+(isIncome?' إيراد':' مصروف')+'</span>'+
 '<strong class="v22-amount">'+(isIncome?'+':'−')+money(t.amount)+'</strong><h3>'+clean(t.description||'عملية مالية')+'</h3></div>'+
 '<div class="v22-facts">'+rows.map(x=>'<div><span>'+clean(x[0])+'</span><strong>'+clean(x[1])+'</strong></div>').join('')+'</div>'+
 (!isIncome&&category(t.category)?'<div class="v22-tags">'+badge(t.category)+'</div>':'')+'</div>'+
 '<footer class="v22-dialog-foot"><button class="btn primary" data-v22-edittx="'+clean(t.id)+'">'+ico('edit')+' تعديل</button>'+
 '<button class="btn v22-danger" data-v22-deletetx="'+clean(t.id)+'">'+ico('delete')+' حذف</button></footer></section></div>';
};
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-v22-account],[data-v22-manage],[data-v22-addbank],[data-v22-addaccount],[data-v22-editbank],[data-v22-editaccount],[data-v22-deleteaccount],[data-v22-next],[data-v22-previous],[data-v22-save],[data-v22-close],[data-v22-newcat],[data-v22-tx],[data-v22-edittx],[data-v22-deletetx],[data-v22-filter]');
 if(!b)return;
 if(b.hasAttribute('data-v22-account'))return openAccount(b.dataset.v22Account);
 if(b.hasAttribute('data-v22-manage'))return openBankSummary(b.dataset.v22Manage);
 if(b.hasAttribute('data-v22-addbank'))return startWizard();
 if(b.hasAttribute('data-v22-addaccount'))return startWizard('',b.dataset.v22Addaccount);
 if(b.hasAttribute('data-v22-editbank'))return startWizard(b.dataset.v22Editbank,'',true);
 if(b.hasAttribute('data-v22-editaccount'))return startWizard(b.dataset.v22Editaccount);
 if(b.hasAttribute('data-v22-deleteaccount'))return deleteAccount(b.dataset.v22Deleteaccount);
 if(b.hasAttribute('data-v22-close')){wizard=null;return closeModal()}
 if(b.hasAttribute('data-v22-newcat'))return v18CategoryModal();
 if(b.hasAttribute('data-v22-previous')){if(wizard){wizardRead();wizard.step=Math.max(0,wizard.step-1);renderWizard()}return}
 if(b.hasAttribute('data-v22-next')){if(wizard){wizardRead();const err=validStep();if(err){alert(err);return}wizard.step=Math.min(3,wizard.step+1);renderWizard()}return}
 if(b.hasAttribute('data-v22-save'))return saveWizard();
 if(b.hasAttribute('data-v22-tx'))return rkTransactionDetails(b.dataset.v22Tx);
 if(b.hasAttribute('data-v22-edittx'))return rkTransactionEdit(b.dataset.v22Edittx);
 if(b.hasAttribute('data-v22-deletetx'))return rkRemoveTransaction(b.dataset.v22Deletetx);
 if(b.hasAttribute('data-v22-filter')){
  txMode=b.dataset.v22Filter;
  document.querySelectorAll('[data-v22-filter]').forEach(x=>x.classList.toggle('active',x.dataset.v22Filter===txMode));
  const list=document.getElementById('v22TxGrid');if(list)list.innerHTML=txList();
 }
});
document.addEventListener('input',e=>{
 if(e.target.id==='v22TxSearch'){searchText=e.target.value;const list=document.getElementById('v22TxGrid');if(list)list.innerHTML=txList()}
});
document.addEventListener('change',e=>{
 if(e.target.id==='v22AccountKind'&&wizard){wizardRead();renderWizard();return}
 if(e.target.id==='v22Logo'&&wizard){
  const file=e.target.files?.[0];if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>150*1024){alert('اختر صورة PNG أو JPG أو WebP بحجم أقل من 150 كيلوبايت.');return}
  const reader=new FileReader();reader.onload=()=>{
   if(!wizard)return;const value=String(reader.result||'');
   if(!/^data:image\/(?:png|jpeg|webp);base64,/.test(value))return;
   wizard.logo=value;renderWizard()
  };reader.readAsDataURL(file);
 }
});
/* Only this preview branch is served on a separate Vercel host. Never seed the production origin. */
try{
 if(location.hostname!=='noor-w7wp.vercel.app'&&location.hostname!=='noor-w7wp-name-eb60.vercel.app'&&
 !localStorage.getItem('rakaez-v22-example-bank')){
  if(!db.externalBanks.length){
   const first=rid(),child=rid();const cats=activeCats();
   const eat=cats.find(c=>/مطعم|وجبات|مقهى/.test(c.name))?.id||cats[0]?.id;
   const bill=cats.find(c=>/فاتورة|اتصال/.test(c.name))?.id||cats[1]?.id;
   db.externalBanks.push({id:first,name:'بنك البلاد',nickname:'الحساب الجاري',last4:'4821',kind:'main',parentId:'',center:'hilal',logo:'',categoryIds:eat?[eat]:[]});
   db.externalBanks.push({id:child,name:'بنك البلاد',nickname:'حساب الفواتير',last4:'7936',kind:'sub',parentId:first,center:'hilal',logo:'',categoryIds:[eat,bill].filter((v,i,a)=>v&&a.indexOf(v)===i)});
   save();
  }
  localStorage.setItem('rakaez-v22-example-bank','yes');
 }
}catch(err){console.warn('Preview fixture could not be stored',err)}
render();
})();