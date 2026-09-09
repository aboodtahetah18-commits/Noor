import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const arg = process.argv.find((value) => value.startsWith('--live-report='));
const positional = process.argv.find((value, index) => index > 1 && !value.startsWith('--'));
const reportPath = (arg ? arg.slice('--live-report='.length) : positional || '').trim();

function fail(message) {
  console.error(`FINAL-RELEASE-SEAL-FAIL ${message}`);
  process.exit(1);
}

if (!reportPath) fail('live production acceptance report is required');
const absolute = path.resolve(root, reportPath);
if (!fs.existsSync(absolute)) fail(`report not found: ${reportPath}`);

let report;
try {
  report = JSON.parse(fs.readFileSync(absolute, 'utf8'));
} catch {
  fail('report is not valid JSON');
}

if (report?.status !== 'accepted') fail(`live report status is ${String(report?.status)}`);
if (report?.failedChecks !== 0) fail(`live report failedChecks is ${String(report?.failedChecks)}`);
if (!Number.isInteger(report?.totalChecks) || report.totalChecks <= 0) fail('live report totalChecks is invalid');
if (report?.passedChecks !== report?.totalChecks) fail('live report does not show all checks passing');
if (report?.releaseVersion !== pkg.version) fail(`report release ${String(report?.releaseVersion)} does not match package ${pkg.version}`);
if (typeof report?.origin !== 'string' || !report.origin.startsWith('https://')) fail('live report origin must use HTTPS');
if (typeof report?.checkedAt !== 'string' || Number.isNaN(Date.parse(report.checkedAt))) fail('live report checkedAt is invalid');

console.log(`FINAL-RELEASE-SEAL-PASS version=${pkg.version} checks=${report.passedChecks}/${report.totalChecks} origin=${report.origin}`);
