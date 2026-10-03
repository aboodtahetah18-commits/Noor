import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Stage 4.7 chat-first responsive shell contract', () => {
  it('marks the conversation route as the responsive viewport owner', () => {
    const page = read('src/app/(protected)/conversations/page.tsx');
    const shell = read('src/app/namaa-app-shell.css');

    expect(page).toContain('data-chat-first-route="true"');
    expect(shell).toContain(':has([data-chat-first-route="true"]) .namaa-app-main');
    expect(shell).toContain('height:100dvh!important');
    expect(shell).toContain('width:100%!important');
  });

  it('uses the primary desktop navigation as an overlay drawer on wide screens', () => {
    const shell = read('src/app/namaa-app-shell.css');
    const nav = read('src/app/(protected)/desktop-top-nav.tsx');

    expect(shell).toContain('Conversations use the primary Namaa navigation as an overlay drawer on wide screens.');
    expect(shell).toContain('html[data-sidebar="collapsed"] .protected-app-shell:has([data-chat-first-route="true"]) .desktop-top-nav-wrap.namaa-sidebar');
    expect(shell).toContain('html[data-sidebar="expanded"] .protected-app-shell:has([data-chat-first-route="true"]) .namaa-desktop-sidebar-scrim');
    expect(shell).toContain('padding-inline-start:0;');
    expect(nav).toContain('namaa-desktop-sidebar-scrim');
    expect(nav).toContain('onClick={collapseSidebar}');
  });

  it('keeps desktop chat centered and agent/user bubbles visually distinct', () => {
    const css = read('src/components/conversations/conversation-workspace.module.css');

    expect(css).toContain('@media (min-width:1024px)');
    expect(css).toContain('grid-template-columns:minmax(240px,280px) minmax(0,1fr) minmax(240px,280px)');
    expect(css).toContain('.page .agentMessage{');
    expect(css).toContain('.page .userMessage{');
    expect(css).toContain('var(--namaa-gold-500)');
    expect(css).toContain('var(--namaa-green-700)');
    expect(css).not.toMatch(/\.agentMessage\{[^}]*!important|\.userMessage\{[^}]*!important/s);
  });

  it('keeps one shared responsive topbar and no duplicate bottom navigation', () => {
    const top = read('src/app/(protected)/mobile-top-bar.tsx');
    const bottom = read('src/app/(protected)/mobile-bottom-nav.tsx');

    expect(top).toContain('namaa-responsive-topbar');
    expect(top).toContain('namaa-responsive-page-title');
    expect(top).toContain('namaa:open-responsive-navigation');
    expect(bottom).toContain('return null');
  });

  it('keeps conversations as a direct responsive navigation destination', () => {
    const top = read('src/app/(protected)/mobile-top-bar.tsx');
    expect(top).toContain("href:'/conversations'");
    expect(top).toContain("label:'مركز المحادثات'");
  });

  it('stabilizes conversation geometry without raw palette values', () => {
    const css = read('src/components/conversations/conversation-workspace.module.css');

    expect(css).toContain('position:relative;');
    expect(css).toContain('max-width:min(720px,88%)');
    expect(css).toContain('.page .agentMessage{');
    expect(css).toContain('.page .userMessage{');
    expect(css).toContain('z-index:var(--ux-z-modal)');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});
