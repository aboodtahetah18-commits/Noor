import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
const read=(p:string)=>readFileSync(p,'utf8');
describe('Unified responsive root cause protections',()=>{
 it('defines one mobile and stretched-tablet breakpoint',()=>{
  const css=read('src/app/(protected)/unified-shell.css');
  expect(css).toContain('@media (min-width: 768px)');
  expect(css).not.toContain('min-width:1024px');
  expect(css).not.toContain('min-width:1440px');
 });
 it('always renders the shared top and bottom navigation',()=>{
  const layout=read('src/app/(protected)/layout.tsx');
  expect(layout).toContain('MobileTopBar profile={profile}');
  expect(layout).toContain('<MobileBottomNav />');
  expect(layout).not.toContain('DesktopTopNav');
  expect(layout).not.toContain('TabletTopNav');
 });
 it('keeps RTL accessible branding and real user control',()=>{
  const top=read('src/app/(protected)/mobile-top-bar.tsx');
  expect(top).toContain('dir="rtl"');
  expect(top).toContain('ProfileTrigger');
  expect(top).toContain('namaa-mobile-profile-trigger');
  expect(top).toContain('namaa-mobile-menu-trigger');
  expect(top).toContain('BrandLogo');
 });
});