import {readFileSync,existsSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
describe('Desktop uses unified responsive shell',()=>{
 it('retains header and bottom links rather than a separate desktop sidebar',()=>{
  const layout=readFileSync('src/app/(protected)/layout.tsx','utf8');
  expect(layout).toContain('MobileTopBar');
  expect(layout).toContain('MobileBottomNav');
  expect(layout).not.toContain('DesktopTopNav');
  expect(existsSync('src/app/(protected)/desktop-top-nav.tsx')).toBe(false);
 });
 it('keeps tablet-stretched page width and no forced desktop composition',()=>{
  const css=readFileSync('src/app/(protected)/unified-shell.css','utf8');
  expect(css).toContain('@media (min-width: 768px)');
  expect(css).toContain('width: 100%');
 });
});