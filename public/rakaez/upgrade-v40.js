/* ركائز 41 — الرئيسية تعرض القائمة، والصفحات الداخلية ترجع إلى الصفحة السابقة.
   لا يغيّر بيانات الحسابات أو عمليات التمويل أو دفاتر المخصصات. */
(function () {
  'use strict';
  if (typeof render !== 'function' || typeof navigate !== 'function') return;
  const menu = document.querySelector('.topbar .rk-mobilemenu');
  const menuMarkup = menu ? menu.innerHTML : '';
  const backMarkup = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
  const getPage = () => typeof page !== 'undefined' ? page : 'insights';
  // Track only in-app navigation; a direct page entry has no prior in-app page.
  const inAppTrail = [getPage()];
  const priorNavigate = navigate;
  navigate = function(target) {
    if(typeof target==='string'&&target!==getPage()) {
      inAppTrail.push(target);
      if(inAppTrail.length>100)inAppTrail.shift();
    }
    return priorNavigate.apply(this,arguments);
  };
  window.addEventListener('popstate',function(){
    const current=getPage();
    const index=inAppTrail.lastIndexOf(current);
    if(index>=0)inAppTrail.splice(index+1);
    else inAppTrail.push(current);
  });

  function syncTopNavigation() {
    const isHome = getPage() === 'insights';
    const btn = document.querySelector('.topbar .rk-mobilemenu');
    if (btn) {
      const nextMode = isHome ? 'menu' : 'back';
      if (btn.dataset.rk40Mode !== nextMode) {
        btn.innerHTML = isHome ? menuMarkup : backMarkup;
        btn.dataset.rk40Mode = nextMode;
      }
      btn.setAttribute('aria-label', isHome ? 'فتح القائمة الجانبية' : 'الرجوع إلى الصفحة السابقة');
      btn.setAttribute('title', isHome ? 'القائمة الجانبية' : 'الرجوع إلى الصفحة السابقة');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', 'nav');
      // The original inline click handler is preserved for the home page.
      if (!isHome) document.getElementById('layout')?.classList.remove('showmenu');
    }
    const view = document.getElementById('view');
    if (view) {
      // Previous versions introduced global navigation links and a duplicate back button.
      // Remove them while keeping intentional record actions (e.g. opening a bank) intact.
      view.querySelectorAll('.rk37-context,.rk38-navigation-back').forEach(node => node.remove());
    }
  }
  document.addEventListener('click', event => {
    const btn = event.target.closest('.topbar .rk-mobilemenu');
    if (!btn || getPage() === 'insights') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.getElementById('layout')?.classList.remove('showmenu');
    const dialogs = document.getElementById('modalRoot');
    if (dialogs?.children.length && typeof closeModal === 'function') closeModal();
    if(inAppTrail.length>1&&window.history?.state?.rk38&&typeof window.history.back==='function'){
      // v38 popstate restores the true previous page, preserving forward navigation.
      window.history.back();
      return;
    }
    if(inAppTrail.length>1){
      inAppTrail.pop();
      const previous=inAppTrail.pop()||'insights';
      navigate(previous);
      return;
    }
    navigate('insights');
  }, true);
  const previousRender = render;
  render = function () {
    const result = previousRender.apply(this, arguments);
    syncTopNavigation();
    return result;
  };
  syncTopNavigation();
})();