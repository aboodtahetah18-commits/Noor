import fs from 'node:fs';
const atLeast=(v,a,b,c)=>{const x=v.split('.').map(Number);return x[0]>a||(x[0]===a&&(x[1]>b||(x[1]===b&&x[2]>=c)));};

const read = (p) => fs.readFileSync(p, 'utf8');
const nav = read('src/app/(protected)/mobile-bottom-nav.tsx');
const test = read('tests/integration/mobile-hardening-contract.test.ts');
const pkg = JSON.parse(read('package.json'));

const checks = [
  ['version', atLeast(pkg.version,0,49,5)],
  ['approved mobile more route', nav.includes("href: '/more'")],
  ['stale settings assertion removed', !test.includes("expect(nav).toContain(\"'/settings'\")")],
  ['mobile contract expects more route', test.includes("expect(nav).toContain(\"'/more'\")")],
  ['settings remains reachable via more hub', fs.existsSync('src/app/(protected)/more/page.tsx') && read('src/app/(protected)/more/page.tsx').includes("'/settings'")],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
console.log('P49.5 stale mobile contract repair: PASS');
