import fs from 'node:fs';

const errors = [];
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const readme = fs.readFileSync('README.md', 'utf8');
const generator = fs.readFileSync('scripts/generate-package-lock.mjs', 'utf8');

if (!/^0\.(?:48\.(?:1\d|[2-9]\d)|49\.|[5-9]\d\.)/.test(pkg.version)) errors.push(`expected version 0.48.10 or newer, got ${pkg.version}`);
if (pkg.scripts?.['dependencies:lock'] !== 'node scripts/generate-package-lock.mjs') errors.push('dependencies:lock is not wired');
if (readme.includes('pnpm install') || readme.includes('pnpm check') || readme.includes('pnpm lint')) errors.push('README still contains stale pnpm operational commands');
if (!readme.includes('npm install') || !readme.includes('npm run check')) errors.push('README npm operational commands missing');
if (!generator.includes('Node 24.20.x is required')) errors.push('Node runtime guard missing');
if (!generator.includes('npm 11.19.x is required')) errors.push('npm runtime guard missing');
if (!generator.includes('lockfileVersion !== 3')) errors.push('lockfile v3 validation missing');

if (errors.length) {
  for (const error of errors) console.error('P48.5-FAIL', error);
  process.exit(1);
}

console.log('P48.5 verification: PASS');
