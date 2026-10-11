import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Stage 4.7 legacy cleanup contract', () => {
  it('keeps one shared FeedbackState implementation', () => {
    expect(fs.existsSync(path.join(root, 'src/components/ui/FeedbackState.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/components/ui/feedback-state.tsx'))).toBe(false);
    expect(read('src/components/ui/index.ts')).toContain("from './FeedbackState'");
  });

  it('keeps frozen legacy CSS untouched until the governed migration batch', () => {
    const globals = read('src/app/globals.css');
    expect(globals).toContain('.p47-feedback-state{');
  });

  it('keeps one desktop speaker-color authority without a final override appendix', () => {
    const css = read('src/components/conversations/conversation-workspace.module.css');
    expect(css).not.toContain('STAGE 4.7 FINAL DESKTOP CHAT AUTHORITY');
    expect(css).toContain('.agentMessage{');
    expect(css).toContain('.userMessage{');
  });
});
