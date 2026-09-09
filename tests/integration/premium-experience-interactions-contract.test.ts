import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const experience=fs.readFileSync('src/design-system/experience.css','utf8');
const layout=fs.readFileSync('src/app/layout.tsx','utf8');
const nav=fs.readFileSync('src/app/(protected)/mobile-bottom-nav.tsx','utf8');
const dialog=fs.readFileSync('src/components/overlays/action-dialog.tsx','utf8');
const account=fs.readFileSync('src/app/(protected)/accounts/page.tsx','utf8');

describe('premium experience and entity interaction contract',()=>{
  it('loads the premium experience after the governed design layers',()=>{
    expect(layout).toContain("../design-system/experience.css");
    expect(layout).toContain('data-theme="dark"');
  });
  it('keeps the approved five mobile destinations',()=>{
    for(const label of ['الرئيسية','الحسابات','العمليات','الميزانية','المزيد']) expect(nav).toContain(label);
  });
  it('keeps dialogs printable only when contextually useful',()=>{
    expect(dialog).toContain('const shouldPrint = printable ?? /تفاصيل|تقرير|كشف|ملخص/.test(title)');
    expect(dialog).toContain('shouldPrint ? <PrintButton/> : null');
  });
  it('keeps account actions available without cluttering mobile cards',()=>{
    expect(account).toContain('EntityActionRail');
    expect(experience).toContain('.mx-action-rail');
    expect(experience).toContain('touch-action:pan-x');
  });
});
