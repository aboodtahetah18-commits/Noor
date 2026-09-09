import fs from 'node:fs';

const text = fs.readFileSync('eslint.config.mjs', 'utf8');
const failures = [];

if (text.includes('FlatCompat')) failures.push('legacy FlatCompat remains');
if (!text.includes("eslint-config-next/core-web-vitals")) failures.push('Next.js flat core-web-vitals config missing');
if (!text.includes("eslint-config-next/typescript")) failures.push('Next.js flat TypeScript config missing');
if (!text.includes("'@typescript-eslint/no-explicit-any': 'off'")) failures.push('legacy adapter compatibility rule missing');
if (!text.includes("src/domain/**/*.{ts,tsx}")) failures.push('Domain strict any scope missing');
if (!text.includes("src/financial-engine/**/*.{ts,tsx}")) failures.push('Financial Engine strict any scope missing');
if (!text.includes("src/application/**/*.{ts,tsx}")) failures.push('Application strict any scope missing');

const strictFiles = ['src/domain', 'src/financial-engine', 'src/application'];
for (const dir of strictFiles) {
  if (!fs.existsSync(dir)) continue;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const file = `${current}/${entry.name}`;
      if (entry.isDirectory()) stack.push(file);
      else if (/\.(ts|tsx)$/.test(entry.name)) {
        const source = fs.readFileSync(file, 'utf8');
        if (/\bany\b/.test(source)) failures.push(`explicit any remains in strict layer: ${file}`);
      }
    }
  }
}

if (failures.length) {
  console.error('ESLINT-CONFIG-VERIFY-FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('ESLINT-CONFIG-VERIFY-PASS');
