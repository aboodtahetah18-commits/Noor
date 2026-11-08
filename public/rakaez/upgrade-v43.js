/* ركائز 43 — قاعدة موحدة لرؤوس النوافذ وأزرار الاعتماد.
   ترتيب RTL: رجوع في أقصى اليمين، عنوان في الوسط، إغلاق في أقصى اليسار.
   لا تعدل هذه الطبقة البيانات أو خطوات الحفظ. */
(function(){
 'use strict';
 const root=document.getElementById('modalRoot');
 if(!root||typeof closeModal!=='function')return;
 const backSvg='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
 const closeSvg='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
 const dialogSelector='[role="dialog"],.modal,.v27-dialog,.rk39-dialog';
 const headerSelector='.rk43-modal-header,.modalhead,.v3header,.v7-head,.v27-dialog-head,.rk39-dialog-head,.rk42-research-head,.rk41-debt-head,.v19-dialog-head';
 const footerSelector='footer,.v3footer,.actions,.rk-compact-footer,.rk-budget-detail-actions,.v27-dialog-footer,.rk39-dialog-foot,.rk41-debt-footer,.rk42-research-actions,.wiz-actions,.modalfooter,.modal-footer';
 const stripCss='.v3footer,.actions,.rk-compact-footer,.rk-budget-detail-actions,.v27-dialog-footer,.rk39-dialog-foot,.rk41-debt-footer,.rk42-research-actions,.wiz-actions,.modalfooter,.modal-footer';
 const isClose=button=>{
  const name=(button.getAttribute('aria-label')||'')+' '+(button.textContent||'').trim();
  const handler=button.getAttribute('onclick')||'';
  return button.matches('.rk43-close,.v27-close,.rk42-research-close,.rk-budget-close,.rk39-dialog-close')||
   /إغلاق|إقفال|✕|×/.test(name)||handler.includes('closeModal');
 };
 const isBack=button=>{
  const name=(button.getAttribute('aria-label')||'')+' '+(button.textContent||'').trim();
  return button.matches('.rk43-back,.rk41-go-back,.rk38-modal-back,[data-rk38-back]')||
   /^(رجوع|الرجوع|عودة|العودة)/.test(name.trim());
 };
 // نافذة تأسيس 44 لها رأس وتنقّل مستقلان؛ التطبيع العام ينشئ رأسًا وزر إغلاق مكررين.
 const isModal=el=>el&&el.nodeType===1&&el.matches?.(dialogSelector)&&!el.classList.contains('modalbg')&&!el.classList.contains('rk44-wizard');
 function createBack(){
  const button=document.createElement('button');
  button.type='button';button.className='rk43-back';button.dataset.rk43Back='1';
  button.setAttribute('aria-label','رجوع');
  button.innerHTML=backSvg+'<span>رجوع</span>';
  return button;
 }
 function createClose(){
  const button=document.createElement('button');
  button.type='button';button.className='rk43-close';button.dataset.rk43Close='1';
  button.setAttribute('aria-label','إغلاق النافذة');
  // Older repair routines require this marker to avoid injecting a second close.
  button.setAttribute('onclick','closeModal()');
  button.innerHTML=closeSvg;
  return button;
 }
 function existingReturn(dialog){
  const candidates=dialog.querySelectorAll('.rk-compact-footer button,.v3footer button,.v27-dialog-footer button,.rk-budget-detail-actions button');
  for(const button of candidates){
   if(!isBack(button)||button.closest('.wiz-actions'))continue;
   const onclick=button.getAttribute('onclick')||'';
   if(!onclick||/closeModal\s*\(/.test(onclick))continue;
   button.dataset.rk43ExistingBack='1';
   return button;
  }
  return null;
 }
 function arrangeHeader(dialog){
  const directHeads=Array.from(dialog.children).filter(child=>child.matches?.(headerSelector));
  const preference=['rk41-debt-head','rk42-research-head','v27-dialog-head','rk39-dialog-head','modalhead','v7-head','v3header'];
  let head=directHeads.sort((a,b)=>{
   const rank=node=>{const i=preference.findIndex(cls=>node.classList.contains(cls));return i<0?99:i;};
   return rank(a)-rank(b);
  })[0]||dialog.querySelector(headerSelector);
  // If an old repair routine injected a second title bar, retain the original
  // financial header and merge its title before discarding the duplicate.
  for(const duplicate of directHeads.filter(node=>node!==head)){
   const missingTitle=!head?.querySelector('h1,h2,h3');
   if(missingTitle){
    const heading=duplicate.querySelector('h1,h2,h3');
    if(heading)head.prepend(heading);
   }
   duplicate.remove();
  }
  if(!head){
   head=document.createElement('header');
   head.className='modalhead';
   const source=Array.from(dialog.children).find(n=>n.matches?.('h2,h1'));
   if(source)head.appendChild(source);
   else {
    const h2=document.createElement('h2');
    h2.textContent=dialog.getAttribute('aria-label')||'التفاصيل';
    head.appendChild(h2);
   }
   dialog.prepend(head);
  }
  // Do not rebuild an already arranged heading; keep focus and input state intact.
  if(head.classList.contains('rk43-arranged')){
   // Older decorators may add an extra close button later; never let it
   // become another heading control or start a second row.
   const controls=Array.from(head.querySelectorAll(':scope > button'));
   controls.forEach(button=>{
    if(!button.matches('.rk43-back,.rk43-close'))button.remove();
   });
   dialog.classList.add('rk43-normalized');
   return;
  }
  const buttons=Array.from(head.querySelectorAll('button'));
  let back=buttons.find(isBack)||existingReturn(dialog)||createBack();
  let close=buttons.find(button=>button!==back&&isClose(button))||createClose();
  // Legacy back listeners close immediately even when the current form has a detail parent.
  if(back.hasAttribute('data-rk38-back'))back=replaceLegacyBack(back);
  if(back.hasAttribute('data-rk41-close')){
   back.removeAttribute('data-rk41-close');
  }
  if(!back.hasAttribute('data-rk43-existing-back'))back.setAttribute('data-rk43-back','1');
  back.classList.add('rk43-back');
  close.classList.add('rk43-close');
  close.setAttribute('aria-label','إغلاق النافذة');
  if(!close.getAttribute('onclick')&&!close.hasAttribute('data-rk42-close')&&!close.hasAttribute('data-v27-action')&&!close.hasAttribute('data-rk39-close')){
   close.setAttribute('onclick','closeModal()');
  }
  const center=head.querySelector(':scope > .rk43-heading')||document.createElement('div');
  center.className='rk43-heading';
  // Move heading and inline status only; preserve all buttons' native listeners.
  for(const child of Array.from(head.childNodes)){
   if(child===back||child===close||child===center)continue;
   if(child.nodeType===1&&child.matches?.('button')){
    if(isBack(child)||isClose(child)){child.remove();continue;}
   }
   center.appendChild(child);
  }
  if(!center.querySelector('h1,h2,h3,[role="heading"]')){
   const h2=document.createElement('h2');
   h2.textContent=dialog.getAttribute('aria-label')||'التفاصيل';
   center.prepend(h2);
  }
  head.replaceChildren(back,center,close);
  head.classList.add('rk43-modal-header','rk43-arranged');
  dialog.classList.add('rk43-normalized');
 }
 function replaceLegacyBack(button){
  const fresh=createBack();
  button.replaceWith(fresh);
  return fresh;
 }
 function normalizeFooter(dialog){
  const footers=Array.from(dialog.querySelectorAll(footerSelector));
  for(const footer of footers){
   if(footer.closest('.rk43-modal-header'))continue;
   if(!footer.matches(stripCss))continue;
   if(footer.classList.contains('wiz-original-hidden'))continue;
   if(footer.closest('.rk43-action-strip')&&footer!==footer.closest('.rk43-action-strip'))continue;
   const buttons=Array.from(footer.querySelectorAll('button')).filter(btn=>
    !btn.matches('[data-rk43-back],[data-rk43-close]')&&!btn.closest('.rk43-modal-header')
   );
   if(!buttons.length)continue;
   if(footer.classList.contains('wiz-actions')){
    footer.classList.add('rk43-wizard-actions');continue;
   }
   const active=buttons.filter(btn=>btn.isConnected&&!btn.classList.contains('wiz-original-hidden'));
   if(!active.length)continue;
   const form=footer.closest('form');
   const hasSave=active.some(btn=>btn.type==='submit'||/حفظ|تسجيل|اعتماد|تأكيد|تنفيذ/.test(btn.textContent||''));
   const hasCancel=active.some(btn=>/إلغاء|إغلاق|الغاء/.test(btn.textContent||''));
   if(form&&hasSave&&!hasCancel&&active.length<=2){
    const cancel=document.createElement('button');
    cancel.type='button';
    cancel.className='rk43-cancel';
    cancel.dataset.rk43Cancel='1';
    cancel.textContent='إلغاء';
    footer.appendChild(cancel);
    active.push(cancel);
   }
   footer.classList.add('rk43-action-strip');
   // Two equal actions fill the full footer; one action fills the entire width.
   const count=active.length;
   footer.style.setProperty('--rk43-cols',String(Math.min(count,2)));
   footer.classList.toggle('rk43-three-actions',count===3);
  }
 }
 function normalize(){
  const dialogs=Array.from(root.querySelectorAll(dialogSelector)).filter(isModal);
  for(const dialog of dialogs){
   try{arrangeHeader(dialog);normalizeFooter(dialog);}
   catch(e){if(typeof console!=='undefined')console.warn('Rakaez modal layout',e);}
  }
 }
 root.addEventListener('click',event=>{
  const back=event.target.closest('[data-rk43-back]');
  if(back&&root.contains(back)){
   if(back.hasAttribute('data-rk43-existing-back'))return;
   event.preventDefault();event.stopImmediatePropagation();
   const dialog=back.closest(dialogSelector);
   const payment=dialog?.querySelector('[data-rk41-payment-form]');
   const id=payment?.dataset.rk41DebtId;
   if(id&&typeof detailV3==='function'){
    detailV3('debts',id);
   }else{
    closeModal();
   }
   return;
  }
  const close=event.target.closest('.rk43-close,[data-rk43-cancel]');
  if(close&&root.contains(close)){
   event.preventDefault();event.stopImmediatePropagation();
   closeModal();
  }
 },true);
 if(typeof MutationObserver!=='undefined'){
  let queued=false;
  new MutationObserver(()=>{
   if(queued)return;
   queued=true;
   queueMicrotask(()=>{queued=false;normalize()});
  }).observe(root,{childList:true,subtree:true});
 }
 normalize();
})();