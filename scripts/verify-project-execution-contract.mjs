import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const fail = [];
const requiredFiles = [
  'AGENTS.md',
  'docs/ui-ux/CURRENT_SOURCE_OF_TRUTH.md',
  'src/design-system/README.md',
  'src/app/globals.css',
  'src/app/uiux-governance.css',
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) fail.push(`missing required governance file: ${file}`);
}

const contract = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
for (const phrase of [
  'Pages do not own the design system.',
  'Mobile: `< 768px`',
  'Transitional/tablet: `768px–1023px`',
  'Desktop: `1024px–1439px`',
  'Wide desktop: `>= 1440px`',
  'no new "Build XX fix"',
]) {
  if (!contract.includes(phrase)) fail.push(`execution contract missing invariant: ${phrase}`);
}

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const baselinePath = path.join(root, 'scripts/project-contract-css-baseline.json');
if (!fs.existsSync(baselinePath)) fail.push('missing CSS migration baseline');
else {
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  for (const file of ['src/app/globals.css', 'src/app/uiux-governance.css']) {
    const content = fs.readFileSync(path.join(root, file));
    const expected = baseline[file];
    const actualHash = sha256(content);
    if (!expected || expected.sha256 !== actualHash) {
      fail.push(`${file} changed after legacy-CSS freeze. Migrate the change into src/design-system or shared components instead.`);
    }
  }
}

if (fail.length) {
  console.error('PROJECT-EXECUTION-CONTRACT-FAIL');
  for (const item of fail) console.error(`- ${item}`);
  process.exit(1);
}

console.log('PROJECT-EXECUTION-CONTRACT-PASS');
