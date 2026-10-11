import fs from 'node:fs';
import {describe,expect,it} from 'vitest';
const read=(p:string)=>fs.readFileSync(p,'utf8');
describe('Unified Namaa application shell',()=>{
 it('shares one authenticated layout on every viewport',()=>{
  const layout=read('src/app/(protected)/layout.tsx');
  expect(layout).toContain('data-responsive-platform="unified-mobile-first"');
  expect(layout).toContain('<MobileTopBar profile={profile} />');
  expect(layout).toContain('<MobileBottomNav />');
  expect(layout).not.toContain('DesktopTopNav');
  expect(layout).not.toContain('TabletTopNav');
 });
 it('shares menu links from a single navigation registry',()=>{
  const top=read('src/app/(protected)/mobile-top-bar.tsx');
  const shared=read('src/components/navigation/platform-navigation-links.tsx');
  const registry=read('src/lib/navigation/platform-navigation.ts');
  expect(top).toContain('PlatformNavigationLinks');
  expect(shared).toContain('PLATFORM_NAVIGATION.map');
  for(const route of ['/conversations','/bank-operations','/investments','/governance','/cases','/reports','/settings'])expect(registry).toContain(route);
 });
 it('retains five bottom destinations and proper modal semantics',()=>{
  const bottom=read('src/app/(protected)/mobile-bottom-nav.tsx');
  const drawer=read('src/components/ui/Drawer.tsx');
  for(const route of ['/dashboard','/accounts','/transactions','/budget','/more'])expect(bottom).toContain(route);
  expect(drawer).toContain('dialog.showModal()');
  expect(drawer).toContain('onCancel');
 });
 it('does not mount retired viewport-specific navigation files',()=>{
  expect(fs.existsSync('src/app/(protected)/desktop-top-nav.tsx')).toBe(false);
  expect(fs.existsSync('src/app/(protected)/tablet-top-nav.tsx')).toBe(false);
 });
});