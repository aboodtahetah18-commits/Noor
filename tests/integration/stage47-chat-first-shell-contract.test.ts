import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Stage 4.7 chat-first mobile shell contract', () => {
  it('marks the conversation route as the mobile viewport owner', () => {
    const page = read('src/app/(protected)/conversations/page.tsx');
    const shell = read('src/app/namaa-app-shell.css');

    expect(page).toContain('data-chat-first-route="true"');
    expect(shell).toContain(':has([data-chat-first-route="true"]) .namaa-app-main');
    expect(shell).toContain('height:100dvh');
  });

  it('removes the unused desktop sidebar reservation from the chat-first route', () => {
    const shell = read('src/app/namaa-app-shell.css');

    expect(shell).toContain('Stage 4.7 — desktop chat-first alignment');
    expect(shell).toContain('.protected-app-shell:has([data-chat-first-route="true"]) {');
    expect(shell).toContain('padding-inline-start:0;');
    expect(shell).toContain('.desktop-top-nav-wrap.mustaqbali-sidebar');
    expect(shell).toContain('inset-inline-start:0;');
    expect(shell).toContain('max-width:100%;');
  });

  it('keeps desktop chat centered and agent/user bubbles visually distinct', () => {
    const css = read('src/components/conversations/conversation-workspace.module.css');

    expect(css).toContain('STAGE 4.7 FINAL DESKTOP CHAT AUTHORITY');
    expect(css).toContain('grid-template-columns:minmax(240px,280px) minmax(0,1fr) minmax(240px,280px)!important');
    expect(css).toContain('.page .agentMessage{');
    expect(css).toContain('.page .userMessage{');
    expect(css).toContain('var(--namaa-gold-500)');
    expect(css).toContain('var(--namaa-green-700)');
  });

  it('removes duplicate global mobile chrome only while conversations own the viewport', () => {
    const top = read('src/app/(protected)/mobile-top-bar.tsx');
    const bottom = read('src/app/(protected)/mobile-bottom-nav.tsx');

    expect(top).toContain("pathname === '/conversations'");
    expect(top).toContain('if (chatFirst) return null');
    expect(bottom).toContain("pathname === '/conversations'");
    expect(bottom).toContain('if (chatFirst) return null');
  });

  it('keeps the existing five-destination mobile navigation for non-chat routes', () => {
    const bottom = read('src/app/(protected)/mobile-bottom-nav.tsx');
    for (const route of ['/dashboard', '/accounts', '/transactions', '/budget', '/more']) {
      expect(bottom).toContain(`href: '${route}'`);
    }
  });

  it('stabilizes conversation geometry without raw palette values', () => {
    const css = read('src/components/conversations/conversation-workspace.module.css');

    expect(css).toContain('position:relative;');
    expect(css).toMatch(/\.agentMessage\s*\{[^}]*max-width:84%/s);
    expect(css).toMatch(/\.userMessage\s*\{[^}]*max-width:78%/s);
    expect(css).toContain('z-index:var(--ux-z-modal)');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});
