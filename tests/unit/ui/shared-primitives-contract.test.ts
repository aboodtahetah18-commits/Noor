import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const primitiveFiles = [
  'src/components/ui/Button.tsx',
  'src/components/ui/Card.tsx',
  'src/components/ui/Input.tsx',
  'src/components/ui/Select.tsx',
  'src/components/ui/Textarea.tsx',
  'src/components/ui/FormField.tsx',
  'src/components/ui/StatusBadge.tsx',
  'src/components/ui/TableShell.tsx',
  'src/components/ui/section-tabs.tsx',
  'src/components/ui/action-icon.tsx',
  'src/components/ui/FeedbackState.tsx',
  'src/components/ui/Dialog.tsx',
  'src/components/ui/Drawer.tsx',
  'src/components/ui/BottomSheet.tsx',
];

describe('Stage 2 shared primitive contract', () => {
  it('exports the complete shared primitive surface', () => {
    const index = read('src/components/ui/index.ts');
    for (const name of ['Button','Card','Input','Select','Textarea','FormField','StatusBadge','Table','TableShell','SectionTabs','ActionIcon','FeedbackState','Dialog','Drawer','BottomSheet']) {
      expect(index).toContain(name);
    }
  });

  it('keeps primitive source free of raw visual hex values and inline visual style objects', () => {
    for (const file of primitiveFiles) {
      const source = read(file);
      expect(source, file).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(source, file).not.toMatch(/style=\{\{/);
    }
  });

  it('retains RTL keyboard and focus-aware interaction contracts', () => {
    const tabs = read('src/components/ui/section-tabs.tsx');
    expect(tabs).toContain("event.key === 'ArrowRight'");
    expect(tabs).toContain("event.key === 'Home'");
    expect(tabs).toContain('role="tablist"');
    expect(tabs).toContain('aria-selected={selected}');

    const css = read('src/design-system/components.css');
    expect(css).toContain('.ux-button:focus-visible');
    expect(css).toContain('.ux-action-icon-button:focus-visible');
    expect(css).toContain('.ux-dialog-close:focus-visible');
  });

  it('provides disabled, loading, error and overlay accessibility states', () => {
    expect(read('src/components/ui/Button.tsx')).toContain('aria-busy={loading || undefined}');
    expect(read('src/components/ui/Button.tsx')).toContain('disabled={disabled || loading}');
    expect(read('src/components/ui/Input.tsx')).toContain('aria-invalid={ariaInvalid}');
    expect(read('src/components/ui/FeedbackState.tsx')).toContain("role={tone === 'error' ? 'alert' : 'status'}");
    for (const file of ['src/components/ui/Dialog.tsx','src/components/ui/Drawer.tsx','src/components/ui/BottomSheet.tsx']) {
      const source = read(file);
      expect(source, file).toContain('aria-modal="true"');
      expect(source, file).toContain('onCancel=');
      expect(source, file).toContain('showModal()');
      expect(source, file).toContain('dir="rtl"');
    }
  });

  it('retains responsive overflow protection for tables and overlay primitives', () => {
    expect(read('src/components/ui/TableShell.tsx')).toContain('ux-table-wrap');
    const css = read('src/design-system/components.css');
    expect(css).toContain('.ux-table-wrap');
    expect(css).toContain('overflow:auto');
    expect(css).toContain('@media (max-width:767px)');
    expect(css).toContain('.ux-bottom-sheet-surface');
    expect(css).toContain('.ux-drawer-surface');
  });

  it('keeps the legacy feedback implementation as a compatibility layer', () => {
    const legacy = read('src/components/ui/feedback-state.tsx');
    expect(legacy).toContain('p47-feedback-state');
    expect(legacy).toContain("'danger'");
  });
});
