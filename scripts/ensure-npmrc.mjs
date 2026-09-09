import fs from 'node:fs';

const file = '.npmrc';
const required = new Map([
  ['engine-strict', 'true'],
  ['save-exact', 'true'],
  ['audit', 'false'],
  ['fund', 'false'],
]);

const original = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const lines = original.split(/\r?\n/).filter(Boolean);
const seen = new Set();
const next = [];

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
    next.push(line);
    continue;
  }
  const [rawKey] = trimmed.split('=', 1);
  const key = rawKey.trim();
  if (required.has(key)) {
    if (!seen.has(key)) next.push(`${key}=${required.get(key)}`);
    seen.add(key);
  } else {
    next.push(line);
  }
}

for (const [key, value] of required) {
  if (!seen.has(key)) next.push(`${key}=${value}`);
}

const content = `${next.join('\n')}\n`;
if (content !== original) {
  fs.writeFileSync(file, content, 'utf8');
  console.log(`NPMRC-ENSURE-WRITE ${file}`);
} else {
  console.log(`NPMRC-ENSURE-PASS ${file}`);
}

for (const [key, value] of required) {
  if (!content.includes(`${key}=${value}`)) {
    console.error(`NPMRC-ENSURE-FAIL ${key}=${value}`);
    process.exit(1);
  }
}
