import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const layoutPath = path.join(root,'src/app/layout.tsx');
const ndosPath = path.join(root,'src/design-system/ndos-v1.2.css');
const enforcementPath = path.join(root,'src/design-system/ndos-v1.2.enforcement.css');
const tokenPath = path.join(root,'src/design-system/ndos-v1.2.tokens.json');

const layout = fs.readFileSync(layoutPath,'utf8');
const ndos = fs.readFileSync(ndosPath,'utf8');
const enforcement = fs.readFileSync(enforcementPath,'utf8');
const tokens = JSON.parse(fs.readFileSync(tokenPath,'utf8'));
const failures = [];
const fail = (message) => failures.push(message);

const orderedImports = [
  "import '../design-system/components.css';",
  "import '../design-system/pages.css';",
  "import '../design-system/ndos-v1.2.css';",
  "import '../design-system/ndos-v1.2.enforcement.css';",
];
let cursor = -1;
for(const item of orderedImports){
  const at = layout.indexOf(item);
  if(at < 0) fail(`missing layout import: ${item}`);
  else if(at <= cursor) fail(`incorrect visual authority order: ${item}`);
  cursor = Math.max(cursor,at);
}

const ndosIndex = layout.indexOf("import '../design-system/ndos-v1.2.css';");
const enforcementIndex = layout.indexOf("import '../design-system/ndos-v1.2.enforcement.css';");
const imports = [...layout.matchAll(/^import\s+['\"]([^'\"]+\.css)['\"];$/gm)].map(m=>({path:m[1],index:m.index}));
for(const item of imports){
  if(item.index > ndosIndex && item.index < enforcementIndex && item.path !== '../design-system/ndos-v1.2.enforcement.css') {
    fail(`CSS imported after frozen NDOS and before enforcement: ${item.path}`);
  }
  if(item.index > enforcementIndex) fail(`CSS imported after NDOS enforcement: ${item.path}`);
}

if(tokens.meta?.identity_status !== 'FROZEN') fail('NDOS token registry is not FROZEN');
if(tokens.meta?.version !== '1.2 FINAL') fail(`unexpected NDOS version: ${tokens.meta?.version}`);
if(tokens.typography?.family !== 'Noto Sans Arabic') fail(`unexpected frozen type family: ${tokens.typography?.family}`);
if(!layout.includes('Noto_Sans_Arabic')) fail('RootLayout does not load Noto Sans Arabic');
if(!ndos.includes('var(--font-noto-sans-arabic)')) fail('NDOS does not bind to the Next.js Noto Sans Arabic font variable');

const forbiddenFinalLiterals = ['#0B2D5B','#0EA5A2','#2563EB','#06B6D4','"Tajawal"',"'Tajawal'"];
for(const literal of forbiddenFinalLiterals){
  if(ndos.includes(literal)) fail(`legacy visual literal in final NDOS layer: ${literal}`);
  if(enforcement.includes(literal)) fail(`legacy visual literal in enforcement layer: ${literal}`);
}

const expected = [
  ['--namaa-green-900',tokens.color['brand.green.900']],
  ['--namaa-green-700',tokens.color['brand.green.700']],
  ['--namaa-gold-500',tokens.color['brand.gold.500']],
  ['--namaa-gold-action',tokens.color['brand.gold.action']],
  ['--namaa-cream',tokens.color['surface.cream']],
  ['--namaa-surface-warm',tokens.color['surface.warm']],
  ['--namaa-card',tokens.color['surface.card']],
  ['--namaa-chat-canvas',tokens.color['surface.chat.canvas']],
  ['--namaa-user-message',tokens.color['surface.chat.user']],
  ['--namaa-agent-message',tokens.color['surface.chat.agent']],
  ['--namaa-text',tokens.color['text.primary']],
  ['--namaa-muted',tokens.color['text.muted']],
  ['--namaa-border',tokens.color['border.default']],
  ['--namaa-border-strong',tokens.color['border.strong']],
  ['--namaa-info',tokens.color['state.info']],
  ['--namaa-warning',tokens.color['state.warning']],
  ['--namaa-danger',tokens.color['state.danger']],
  ['--namaa-success',tokens.color['state.success']],
];
for(const [name,value] of expected) if(!ndos.includes(`${name}:${value}`)) fail(`frozen alias mismatch: ${name}:${value}`);

for(const marker of ['html[data-theme="light"]','html[data-theme="dark"]']) if(!ndos.includes(marker)) fail(`missing theme contract: ${marker}`);
for(const marker of ['--ndos-control-sm','--ndos-control-md','--ndos-control-lg','.ndos-actions','.ndos-form-grid']) if(!enforcement.includes(marker)) fail(`missing enforcement primitive: ${marker}`);

if(failures.length){
  console.error(`NDOS-AUTHORITY-CONTRACT-FAIL ${failures.length}`);
  for(const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`NDOS-AUTHORITY-CONTRACT-PASS ${tokens.meta.version} is the final visual authority`);
