/* ركائز 36 — طبقة العرض المعتمدة، مسودة محلية غير منشورة.
   Preserve finance data, posting rules, and button handlers. */
(function () {
  'use strict';
  if (typeof render !== 'function' || typeof page === 'undefined') return;

  const supportedPages = new Set([
    'insights','intelligence','research','hilal','malaa','assets','transactions',
    'spending','spending-followups','cycles','goals','debts','fees','reserves',
    'funding','interbank','scheduled','receivables','position','externalBanks',
    'ledger','reports','documents','import','settings','guide'
  ]);
  const banks = {
    hilal: 'بنك الهلال',
    malaa: 'بنك ملاءة',
    assets: 'بنك الأصول'
  };

  /* Reuse the *same existing pictogram* from v35 rather than drawing new logos. */
  function cloneApprovedBankMark(bank) {
    const original = document.querySelector(
      '#nav [data-rk33-page="' + bank + '"] .rk35-bankmark'
    );
    if (!original) return null;
    const mark = original.cloneNode(true);
    mark.setAttribute('aria-hidden', 'true');
    return mark;
  }

  function decorateBankNames(root) {
    const selectors = [
      '.rk-account-title strong', '.rk-malaa-heading h2',
      '.rk35-route-bank strong', '.v27-centers b',
      '.rk34-bank-card .rk34-cardidentity h3',
      '.rk34-reserve-card .rk34-cardidentity h3',
      '.rk-external-head strong', '.rk35-label-with-mark',
      '.v30-bank-record .v30-record-head strong'
    ].join(',');
    root.querySelectorAll(selectors).forEach((el) => {
      if (el.querySelector('.rk35-bankmark')) return;
      const name = (el.textContent || '').trim();
      const bank = Object.keys(banks).find((key) =>
        name === banks[key] || name === banks[key].replace('بنك ', '')
      );
      if (!bank) return;
      const mark = cloneApprovedBankMark(bank);
      if (!mark) return;
      el.classList.add('rk36-bank-name');
      el.prepend(mark);
    });
  }

  /* Only short, true financial summaries are centered: never ledger rows or text forms. */
  function normalizeBankRoleLabels(root) {
    const bankRoles = {
      'المركز الممول': 'البنك الممول',
      'المركز المستفيد': 'البنك المستفيد',
      'الجهة المقرضة': 'الجهة المقرضة',
      'الجهة المستفيدة': 'الجهة المستفيدة'
    };
    root.querySelectorAll('.v27-centers small').forEach((el) => {
      const existing = (el.textContent || '').trim();
      if (Object.prototype.hasOwnProperty.call(bankRoles, existing)) {
        el.textContent = bankRoles[existing];
      }
    });
  }

  function markSummaryGroups(root) {
    root.querySelectorAll([
      '.rk34-values', '.v27-metrics', '.v30-facts', '.v30-fields',
      '.v31-company-facts', '.rk35-stats', '.v29-finance-values',
      '.rk-goal-values', '.v19-fact-grid', '.v25-ledger-pair'
    ].join(',')).forEach(group => group.classList.add('rk36-figures'));
  }

  function markActionRows(root) {
    root.querySelectorAll([
      '.actions', '.rk-account-actions', '.v30-export-actions',
      '.v31-company-actions', '.rk34-cardfoot', '.v27-card-footer',
      '.v25-toolbar', '.v30-record-foot', '.rk-goal-footer'
    ].join(',')).forEach(group => group.classList.add('rk36-actions'));
  }

  /* All changes stay inside the rendered presentation tree. */
  function applyPresentation() {
    const root = document.getElementById('view');
    if (!root) return;
    if (!supportedPages.has(page)) return;
    root.setAttribute('data-rk36-page', page);
    root.classList.add('rk36-design');
    markSummaryGroups(root);
    markActionRows(root);
    decorateBankNames(root);
    normalizeBankRoleLabels(root);
  }

  const previousRender = render;
  render = function () {
    const result = previousRender.apply(this, arguments);
    applyPresentation();
    return result;
  };
  applyPresentation();
})();
