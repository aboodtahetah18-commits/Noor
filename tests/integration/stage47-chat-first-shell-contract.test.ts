import fs from 'node:fs';
import {describe,expect,it} from 'vitest';
const read=(p:string)=>fs.readFileSync(p,'utf8');
describe('Conversations inside unified Namaa',()=>{
 it('keeps conversations inside the authenticated platform shell',()=>{
  const layout=read('src/app/(protected)/layout.tsx');
  const top=read('src/app/(protected)/mobile-top-bar.tsx');
  const bottom=read('src/app/(protected)/mobile-bottom-nav.tsx');
  expect(layout).toContain('<MobileTopBar profile={profile} />');
  expect(layout).toContain('<MobileBottomNav />');
  expect(top).not.toContain('if (chatFirst) return null');
  expect(bottom).not.toContain('if (chatFirst) return null');
 });
 it('retains read-only conversation rooms without duplicating platform routes',()=>{
  const workspace=read('src/components/conversations/persistent-conversation-workspace.tsx');
  expect(workspace).toContain('title="غرف المحادثات"');
  expect(workspace).toContain('namaa-conversation-navigation-drawer');
  expect(workspace).not.toContain('PlatformNavigationLinks');
 });
 it('preserves RTL messages and a scrollable composer layout',()=>{
  const css=read('src/components/conversations/conversation-workspace.module.css');
  expect(css).toContain('.agentMessage{');
  expect(css).toContain('.userMessage{');
  expect(css).toContain('direction:rtl!important');
  expect(css).toContain('overflow-y:auto!important');
 });
 it('removes retired full-screen chat-only shell hiding',()=>{
  const css=read('src/app/namaa-app-shell.css');
  expect(css).not.toContain('CONVERSATION ROUTE OWNS ITS CHROME');
  expect(css).not.toContain('CHAT ROUTE ZERO-TOP-GAP AUTHORITY');
 });
});