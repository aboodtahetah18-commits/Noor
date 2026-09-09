import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
const errors=[];
const warnings=[];

if(pkg.packageManager !== 'npm@11.19.0') errors.push(`packageManager must be npm@11.19.0, got ${pkg.packageManager ?? 'missing'}`);
if(pkg.engines?.node !== '24.20.x') errors.push(`engines.node must be 24.20.x, got ${pkg.engines?.node ?? 'missing'}`);
if(pkg.engines?.npm !== '11.x') errors.push(`engines.npm must be 11.x, got ${pkg.engines?.npm ?? 'missing'}`);

for (const section of ['dependencies','devDependencies']) {
  for (const [name,version] of Object.entries(pkg[section] ?? {})) {
    if (/^[~^*><=]|\s|\|\|/.test(String(version))) errors.push(`${section}.${name} is not exact: ${version}`);
  }
}

const npmrc=fs.existsSync('.npmrc')?fs.readFileSync('.npmrc','utf8'):'';
for(const line of ['engine-strict=true','save-exact=true']) if(!npmrc.includes(line)) errors.push(`.npmrc missing ${line}`);

const lockExists=fs.existsSync('package-lock.json');
if(!lockExists) warnings.push('package-lock.json is absent. Exact direct versions are pinned, but transitive dependency reproducibility is not yet closed.');
else {
  const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
  if(lock.lockfileVersion !== 3) errors.push(`package-lock lockfileVersion must be 3, got ${lock.lockfileVersion}`);
  if(lock.packages?.['']?.version !== pkg.version) errors.push('package-lock root version does not match package.json');
}

if(errors.length){for(const e of errors) console.error('DEPENDENCY-POLICY-FAIL',e);process.exit(1)}
for(const w of warnings) console.warn('DEPENDENCY-POLICY-WARN',w);
console.log(`DEPENDENCY-POLICY-PASS direct dependencies pinned=${Object.keys(pkg.dependencies??{}).length+Object.keys(pkg.devDependencies??{}).length} lockfile=${lockExists?'present':'pending'}`);
