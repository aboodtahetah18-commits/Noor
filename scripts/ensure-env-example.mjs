import fs from 'node:fs';

const target = '.env.example';
const template = 'env.example.template';
const required = ['OPENAI_API_KEY=', 'Financial operations remain fully usable'];

function valid(content) {
  return required.every((needle) => content.includes(needle));
}

if (fs.existsSync(target)) {
  const existing = fs.readFileSync(target, 'utf8');
  if (valid(existing)) {
    console.log('ENV-EXAMPLE-PASS existing .env.example is valid');
    process.exit(0);
  }
}

if (!fs.existsSync(template)) {
  console.error('ENV-EXAMPLE-FAIL env.example.template is missing');
  process.exit(1);
}

const content = fs.readFileSync(template, 'utf8');
if (!valid(content)) {
  console.error('ENV-EXAMPLE-FAIL template is missing required AI optionality contract');
  process.exit(1);
}

fs.writeFileSync(target, content);
console.log('ENV-EXAMPLE-GENERATED .env.example restored from tracked template');
