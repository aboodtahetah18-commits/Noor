import fs from 'node:fs';
import {describe,expect,it} from 'vitest';
const read=(p:string)=>fs.readFileSync(p,'utf8');
describe('approved Namaa interaction system',()=>{
 it('loads finalized NDOS visual authority once',()=>{
  const layout=read('src/app/layout.tsx');
  for(const p of ['interaction-components.css','ndos-v1.2.css','ndos-v1.2.enforcement.css'])expect(layout).toContain(p);
  expect(layout).not.toContain('experience.css');
  expect(layout).not.toContain('brand-refresh.css');
  expect(fs.existsSync('src/design-system/ndos-v1.2.acceptance.css')).toBe(false);
 });
 it('keeps five main navigation destinations',()=>{
  const nav=read('src/app/(protected)/mobile-bottom-nav.tsx');
  for(const label of ['الرئيسية','الحسابات','العمليات','الميزانية','المزيد'])expect(nav).toContain(label);
 });
 it('preserves contextual dialog print control',()=>{
  const dialog=read('src/components/overlays/action-dialog.tsx');
  expect(dialog).toContain('const shouldPrint = printable ?? /تفاصيل|تقرير|كشف|ملخص/.test(title)');
  expect(dialog).toContain('shouldPrint ? <PrintButton/> : null');
 });
 it('keeps approved action rail and scroll affordances',()=>{
  const account=read('src/app/(protected)/accounts/page.tsx');
  const css=read('src/design-system/interaction-components.css');
  expect(account).toContain('EntityActionRail');
  expect(css).toContain('.mx-action-rail');
  expect(css).toContain('touch-action:pan-x');
 });
});