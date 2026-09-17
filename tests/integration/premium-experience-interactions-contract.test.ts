import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const interactions=fs.readFileSync('src/design-system/interaction-components.css','utf8');
const acceptance=fs.readFileSync('src/design-system/ndos-v1.2.acceptance.css','utf8');
const layout=fs.readFileSync('src/app/layout.tsx','utf8');
const nav=fs.readFileSync('src/app/(protected)/mobile-bottom-nav.tsx','utf8');
const dialog=fs.readFileSync('src/components/overlays/action-dialog.tsx','utf8');
const account=fs.readFileSync('src/app/(protected)/accounts/page.tsx','utf8');

describe('governed experience and entity interaction contract',()=>{
  it('loads governed interactions and final NDOS acceptance before frozen authority/enforcement and starts light-first',()=>{
    expect(layout).toContain("../design-system/interaction-components.css");
    expect(layout).toContain("../design-system/ndos-v1.2.acceptance.css");
    expect(layout).toContain("../design-system/ndos-v1.2.css");
    expect(layout).toContain("../design-system/ndos-v1.2.enforcement.css");
    expect(layout).not.toContain("../design-system/experience.css");
    expect(layout).not.toContain("../design-system/brand-refresh.css");
    expect(layout).not.toContain("../design-system/ndos-v1.1.css");
    expect(layout).toContain('data-theme="light"');
  });
  it('keeps the approved five mobile destinations',()=>{
    for(const label of ['الرئيسية','الحسابات','العمليات','الميزانية','المزيد']) expect(nav).toContain(label);
  });
  it('keeps dialogs printable only when contextually useful',()=>{
    expect(dialog).toContain('const shouldPrint = printable ?? /تفاصيل|تقرير|كشف|ملخص/.test(title)');
    expect(dialog).toContain('shouldPrint ? <PrintButton/> : null');
  });
  it('keeps account actions available through the governed horizontal action rail',()=>{
    expect(account).toContain('EntityActionRail');
    expect(interactions).toContain('.mx-action-rail');
    expect(interactions).toContain('touch-action:pan-x');
    expect(interactions).toContain('scroll-snap-type:inline proximity');
  });
  it('keeps final acceptance flat, RTL-first, and free of glass effects',()=>{
    expect(acceptance).toContain('backdrop-filter: none !important');
    expect(acceptance).toContain('inset-inline-start:');
    expect(acceptance).toContain('inset-inline-end:');
  });
});
