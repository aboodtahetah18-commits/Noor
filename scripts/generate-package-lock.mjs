import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const REQUIRED_NODE = /^v24\.20\./;
const REQUIRED_NPM = /^11\.19\./;

function fail(message) {
  console.error(`LOCKFILE-GENERATION-FAIL ${message}`);
  process.exit(1);
}

if (!REQUIRED_NODE.test(process.version)) {
  fail(`Node 24.20.x is required; current runtime is ${process.version}`);
}

let npmVersion = '';
try {
  npmVersion = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim();
} catch {
  fail('npm is not available');
}

if (!REQUIRED_NPM.test(npmVersion)) {
  fail(`npm 11.19.x is required; current runtime is ${npmVersion}`);
}

console.log(`LOCKFILE-GENERATION runtime node=${process.version} npm=${npmVersion}`);
execFileSync(
  'npm',
  ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'],
  { stdio: 'inherit' },
);

if (!fs.existsSync('package-lock.json')) {
  fail('npm completed without producing package-lock.json');
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
if (lock.lockfileVersion !== 3) fail(`expected lockfileVersion 3, got ${lock.lockfileVersion}`);
if (lock.packages?.['']?.version !== pkg.version) fail('package-lock root version does not match package.json');

console.log('LOCKFILE-GENERATION-PASS package-lock.json generated and validated');
