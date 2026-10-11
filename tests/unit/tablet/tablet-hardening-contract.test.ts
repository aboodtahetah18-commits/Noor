import {readFileSync,existsSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
describe('Tablet uses unified responsive shell',()=>{
 it('reuses common navigation across 768px and wider',()=>{
  const layout=readFileSync('src/app/(protected)/layout.tsx','utf8');
  expect(layout).toContain('MobileTopBar');
  expect(layout).toContain('MobileBottomNav');
  expect(layout).not.toContain('TabletTopNav');
  expect(existsSync('src/app/(protected)/tablet-top-nav.tsx')).toBe(false);
 });
 it('enforces mobile-first content without a third desktop breakpoint',()=>{
  const css=readFileSync('src/app/(protected)/unified-shell.css','utf8');
  expect(css).toContain('min-width: 0;');
  expect(css).toContain('max-width: 100%;');
  expect(css).toContain('@media (min-width: 768px)');
 });
});