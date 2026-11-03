'use client';

import { useEffect } from 'react';

/**
 * One governed enhancement for legacy native buttons.
 * It changes presentation only: original elements, handlers, forms and links stay intact.
 * The original label remains available to assistive technology and as a tooltip.
 */
const iconPaths = {
  add: ['M12 5v14', 'M5 12h14'],
  edit: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z'],
  view: ['M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z'],
  delete: ['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 15H6L5 6', 'M10 11v6', 'M14 11v6'],
  save: ['M5 4h12l2 2v14H5Z', 'M8 4v6h8V4', 'M8 20v-6h8v6'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  check: ['M5 12l4 4L19 6'],
  transfer: ['M17 2l4 4-4 4', 'M3 11V9a3 3 0 0 1 3-3h15', 'M7 22l-4-4 4-4', 'M21 13v2a3 3 0 0 1-3 3H3'],
  search: ['M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z', 'M21 21l-4.3-4.3'],
  settings: ['M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z','M4 12h2m12 0h2M12 4v2m0 12v2'],
  refresh: ['M20 6v6h-6', 'M4 18v-6h6', 'M18.5 9A7 7 0 0 0 6 6.5L4 9', 'M5.5 15A7 7 0 0 0 18 17.5l2-2.5'],
  download: ['M12 4v12', 'M8 12l4 4 4-4', 'M5 20h14'],
  upload: ['M12 16V4', 'M8 8l4-4 4 4', 'M5 20h14'],
  print: ['M6 9V3h12v6', 'M6 17H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2', 'M6 14h12v7H6Z'],
  next: ['M15 18l-6-6 6-6'],
  previous: ['M9 18l6-6-6-6'],
  more: ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'],
} as const;

type SymbolName = keyof typeof iconPaths;

function iconFor(label: string): SymbolName {
  if (/حذف|مسح|إزالة|Delete|Remove/i.test(label)) return 'delete';
  if (/إغلاق|إلغاء|إقفال|Cancel|Close/i.test(label)) return 'close';
  if (/تعديل|تحرير|Edit/i.test(label)) return 'edit';
  if (/طباعة|Print/i.test(label)) return 'print';
  if (/تحميل|تنزيل|تصدير|Download|Export/i.test(label)) return 'download';
  if (/رفع|استيراد|Upload|Import/i.test(label)) return 'upload';
  if (/بحث|تصفية|فلتر|Search|Filter/i.test(label)) return 'search';
  if (/حفظ|اعتماد|Save|Submit/i.test(label)) return 'save';
  if (/تأكيد|موافق|تم الاطلاع|قبول|Confirm|Approve/i.test(label)) return 'check';
  if (/تحديث|إعادة تحميل|إعادة المحاولة|Refresh|Retry/i.test(label)) return 'refresh';
  if (/إضافة|إنشاء|جديد|تسجيل|بدء|ابدأ|Add|Create|New/i.test(label)) return 'add';
  if (/تحويل|سحب|إيداع|نقل|Transfer/i.test(label)) return 'transfer';
  if (/إعداد|ضبط|Settings/i.test(label)) return 'settings';
  if (/التالي|متابعة|استمرار|فتح|Next|Continue/i.test(label)) return 'next';
  if (/السابق|رجوع|عودة|Previous|Back/i.test(label)) return 'previous';
  if (/عرض|تفاصيل|اطلاع|مشاهدة|View|Details/i.test(label)) return 'view';
  return 'more';
}

function generateIcon(name: SymbolName): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('data-namaa-generated-icon', name);
  for (const d of iconPaths[name]) {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}

function upgradeButton(button: HTMLButtonElement) {
  if (button.closest('[data-symbol-exempt="true"]')) return;
  if (button.matches('[data-symbol-exempt="true"], [role="tablist"] button, [role="grid"] button')) return;
  if (button.querySelector('input,textarea,select,fieldset,article,table,video,canvas,div')) return;

  const originalText = (button.getAttribute('data-namaa-action-label') || button.innerText || button.textContent || '').trim();
  const label = (button.getAttribute('aria-label') || button.getAttribute('title') || originalText).trim();
  if (!label || label.length > 120) return;
  if (/^[\d٠-٩۰-۹]+$/.test(label)) return;

  button.setAttribute('data-namaa-action-label', label);
  if (!button.hasAttribute('aria-label')) button.setAttribute('aria-label', label);
  if (!button.hasAttribute('title')) button.setAttribute('title', label);
  if (!button.querySelector('svg')) button.appendChild(generateIcon(iconFor(label)));
  button.setAttribute('data-namaa-symbol-only', 'true');
}

export function IconOnlyActions() {
  useEffect(() => {
    const upgradeTree = (node: Element) => {
      if (node instanceof HTMLButtonElement) upgradeButton(node);
      node.querySelectorAll<HTMLButtonElement>('button').forEach(upgradeButton);
    };

    upgradeTree(document.body);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.target instanceof Element) {
          const host = record.target.closest('button');
          if (host instanceof HTMLButtonElement) upgradeButton(host);
        }
        for (const node of record.addedNodes) {
          if (node instanceof Element) upgradeTree(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
