import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const pass = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(name);
};
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const atLeast=(version,major,minor,patch)=>{const [a=0,b=0,c=0]=version.split('.').map(Number);if(a!==major)return a>major;if(b!==minor)return b>minor;return c>=patch;};
const pkg = JSON.parse(read('package.json'));
pass('P49 version', atLeast(pkg.version,0,49,0), pkg.version);

const tsconfig = JSON.parse(read('tsconfig.json'));
const tsAlias = tsconfig.compilerOptions?.paths?.['@/*'];
pass('TypeScript @ alias', Array.isArray(tsAlias) && tsAlias.includes('./src/*'));

const vitestConfig = read('vitest.config.ts');
pass('Vitest runtime alias block', vitestConfig.includes('alias:') && vitestConfig.includes("'@':"));
pass('Vitest alias targets src', vitestConfig.includes("new URL('./src', import.meta.url)"));

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((ent) => {
    const p = path.join(dir, ent.name);
    return ent.isDirectory() ? walk(p) : [p];
  });
}

const testFiles = walk(path.join(root, 'tests')).filter((f) => f.endsWith('.test.ts'));
const importRe = /from\s+['"](@\/[^'"]+)['"]/g;
const unresolved = [];
let aliasImports = 0;
for (const file of testFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(importRe)) {
    aliasImports += 1;
    const rel = match[1].slice(2);
    const candidates = [
      path.join(root, 'src', `${rel}.ts`),
      path.join(root, 'src', `${rel}.tsx`),
      path.join(root, 'src', rel, 'index.ts'),
      path.join(root, 'src', rel, 'index.tsx'),
    ];
    if (!candidates.some(fs.existsSync)) unresolved.push(`${path.relative(root, file)} -> ${match[1]}`);
  }
}
pass('all test @ imports resolve to source', unresolved.length === 0, `${aliasImports} imports checked`);
if (unresolved.length) for (const item of unresolved) console.error(`  UNRESOLVED ${item}`);

const nav = read('src/app/(protected)/mobile-bottom-nav.tsx');
for (const route of ['/dashboard', '/transactions', '/budget', '/advisor', '/more']) {
  pass(`mobile nav ${route}`, nav.includes(`'${route}'`));
}

const more = read('src/app/(protected)/more/page.tsx');
pass('mobile more exposes settings', more.includes("'/settings'"));

const transactions = read('src/app/(protected)/transactions/page.tsx');
pass('transaction amount mobile label', transactions.includes('data-label="المبلغ"'));

const mobileContract = read('tests/integration/mobile-hardening-contract.test.ts');
pass('mobile hardening contract retained', mobileContract.includes("expect(nav).toContain(\"'/transactions'\")") && mobileContract.includes('data-label="المبلغ"'));

if (failures.length) {
  console.error(`P49.1 verification FAILED (${failures.length})`);
  process.exit(1);
}
console.log(`P49.1 CI/runtime contract verification: PASS (${testFiles.length} test files, ${aliasImports} aliased imports)`);
