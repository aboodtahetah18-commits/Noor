import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});

const pkg = JSON.parse(read('package.json'));
const srcFiles = walk(path.join(root, 'src')).filter((p) => /\.(ts|tsx)$/.test(p));
const appFiles = srcFiles.filter((p) => p.includes(`${path.sep}src${path.sep}app${path.sep}`));
const failures = [];

if (pkg.version !== '0.40.0') failures.push('package version must be 0.40.0');
if (appFiles.some((p) => /from ['"]@\/repositories\//.test(fs.readFileSync(p, 'utf8')))) failures.push('app layer imports repositories directly');
if (srcFiles.some((p) => p.endsWith('state-machine-engine.ts'))) failures.push('deprecated state-machine-engine.ts exists');
if (srcFiles.some((p) => /\bSupabase\b|@supabase\//i.test(fs.readFileSync(p, 'utf8')))) failures.push('Supabase runtime reference exists');
if (walk(path.join(root, 'src')).some((p) => path.basename(p) === '.gitkeep')) failures.push('dead .gitkeep scaffolding exists in src');
if (!fs.existsSync(path.join(root, 'FULL_SYSTEM_AUDIT.md'))) failures.push('FULL_SYSTEM_AUDIT.md missing');
if (!fs.existsSync(path.join(root, 'PHASE_40_STATUS.md'))) failures.push('PHASE_40_STATUS.md missing');

if (failures.length) {
  console.error('Phase 40 audit verification: FAIL');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log('Phase 40 audit verification: PASS');
console.log(`Source files scanned: ${srcFiles.length}`);
console.log('Direct repository imports from app: 0');
console.log('Deprecated state-machine engine: absent');
console.log('Supabase runtime refs: 0');
