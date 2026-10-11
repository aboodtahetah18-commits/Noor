import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read=(p:string)=>readFileSync(p,'utf8');
describe('Unified responsive accessibility',()=>{
 it('keeps one accessible navigation shell across breakpoints',()=>{
  const layout=read('src/app/(protected)/layout.tsx');
  const top=read('src/app/(protected)/mobile-top-bar.tsx');
  const bottom=read('src/app/(protected)/mobile-bottom-nav.tsx');
  expect(layout).toContain('<MobileTopBar profile={profile} />');
  expect(layout).toContain('<MobileBottomNav />');
  expect(layout).not.toContain('DesktopTopNav');
  expect(layout).not.toContain('TabletTopNav');
  expect(top).toContain('aria-haspopup="dialog"');
  expect(bottom).toContain('aria-label="التنقل الرئيسي للمنصة"');
 });
 it('preserves keyboard and motion accessibility',()=>{
  expect(read('src/app/(protected)/layout.tsx')).toContain('href="#main-content"');
  const css=read('src/app/globals.css');
  for(const token of [':focus-visible','prefers-reduced-motion: reduce','forced-colors: active'])expect(css).toContain(token);
 });
 it('provides semantic, keyboard-dismissable dialog',()=>{
  const dialog=read('src/components/overlays/action-dialog.tsx');
  expect(dialog).toContain('<dialog');
  expect(dialog).toContain('aria-modal="true"');
  expect(dialog).toContain('onCancel');
 });
});