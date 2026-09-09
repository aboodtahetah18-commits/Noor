import fs from 'node:fs';
const checks = [
  ['tracked fallback template','env.example.template','OPENAI_API_KEY='],
  ['AI optionality contract','env.example.template','Financial operations remain fully usable'],
  ['env restore script','scripts/ensure-env-example.mjs','ENV-EXAMPLE-GENERATED'],
  ['test bootstrap','package.json','node scripts/ensure-env-example.mjs && vitest run'],
  ['version','package.json','0.48.9'],
];
for (const [name,file,needle] of checks) {
  const text = fs.readFileSync(file,'utf8');
  if (!text.includes(needle)) { console.error('FAIL',name); process.exit(1); }
  console.log('PASS',name);
}
console.log('P48.9 env-example resilience verification: PASS');
