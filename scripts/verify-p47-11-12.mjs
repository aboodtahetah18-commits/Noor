import fs from 'node:fs';

const required = [
  ['src/app/globals.css', ['P47.11 + P47.12', '.p47-flow-page', '.p47-feedback-state', '@media(max-width:767px)']],
  ['src/components/ui/feedback-state.tsx', ['FeedbackState', 'EmptyState', "tone?: 'neutral' | 'success' | 'warning' | 'danger'"]],
  ['src/app/(protected)/expenses/page.tsx', ['p47-flow-page', 'EmptyState', 'p47-empty-panel']],
  ['src/app/(protected)/goals/new/page.tsx', ['p47-flow-page', 'p47-flow-card']],
  ['src/app/(protected)/obligations/new/page.tsx', ['p47-flow-page', 'p47-flow-card']],
  ['src/app/(protected)/income/new/page.tsx', ['p47-flow-form']],
  ['src/app/(protected)/transfers/new/page.tsx', ['p47-flow-form']],
  ['src/app/(protected)/refunds/new/page.tsx', ['p47-flow-form']],
  ['src/app/(protected)/emergency/withdraw/page.tsx', ['p47-flow-form']],
];
for (const [file, needles] of required) {
  const text = fs.readFileSync(file, 'utf8');
  for (const needle of needles) if (!text.includes(needle)) throw new Error(`${file}: missing ${needle}`);
}
const css=fs.readFileSync('src/app/globals.css','utf8');
if(!css.includes('min-height:var(--ux-size-12)')) throw new Error('mobile touch/input closure missing');
console.log('P47.11/P47.12 verification: PASS');
