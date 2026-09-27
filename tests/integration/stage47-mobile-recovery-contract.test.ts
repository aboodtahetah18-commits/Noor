import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Stage 4.7 internal mobile recovery', () => {
  it('keeps conversations as one fixed mobile viewport without outer-page drift', () => {
    const shell = read('src/app/namaa-app-shell.css');
    expect(shell).toContain('.protected-app-shell:has([data-chat-first-route="true"])');
    expect(shell).toContain('position:fixed;');
    expect(shell).toContain('height:100dvh;');
    expect(shell).toContain('overscroll-behavior:none;');
  });

  it('keeps one mobile chat header with the official Namaa logo', () => {
    const workspace = read('src/components/conversations/persistent-conversation-workspace.tsx');
    expect(workspace).toContain('styles.chatHeaderBrand');
    expect(workspace).toContain('/brand/ndos/namaa-logo-white-transparent.png');
  });

  it('keeps the composer visible with send and attachment actions', () => {
    const workspace = read('src/components/conversations/persistent-conversation-workspace.tsx');
    const css = read('src/components/conversations/conversation-workspace.module.css');
    expect(workspace).toContain('className={styles.sendButton}');
    expect(workspace).toContain('className={styles.attachButton}');
    expect(workspace).toContain('className={styles.composer}');
    expect(css).toContain('Stage 4.7 internal mobile recovery');
    expect(css).toContain('.composer{\n    position:relative;');
  });

  it('does not expose empty authority, procedures, or records tabs in entity details', () => {
    const workspace = read('src/components/conversations/persistent-conversation-workspace.tsx');
    expect(workspace).not.toContain("setDetailTab('authority')");
    expect(workspace).not.toContain("setDetailTab('procedures')");
    expect(workspace).not.toContain("setDetailTab('records')");
  });
});
