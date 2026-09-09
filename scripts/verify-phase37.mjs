import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const read = (p) => readFileSync(join(root,p),'utf8');
function walk(dir){
  const out=[];
  for(const name of readdirSync(join(root,dir))){
    const rel=join(dir,name), st=statSync(join(root,rel));
    if(st.isDirectory()) out.push(...walk(rel)); else out.push(rel);
  }
  return out;
}

const sourceFiles=walk('src').filter(f=>/\.(ts|tsx)$/.test(f));
for(const f of sourceFiles){
  const s=read(f);
  if(s.includes('dangerouslySetInnerHTML')) failures.push(`${f}: dangerouslySetInnerHTML is forbidden`);
  if(/NEXT_PUBLIC_.*(?:SECRET|TOKEN|DATABASE|API_KEY)/i.test(s)) failures.push(`${f}: public secret-like env name`);
}

const actions=walk('src/app/(protected)').filter(f=>f.endsWith('actions.ts'));
for(const f of actions){
  const s=read(f);
  if(!s.includes('requireAuthenticatedMutationUser') && !s.includes('assertTrustedMutationOrigin')) {
    failures.push(`${f}: protected mutation lacks mutation trust-boundary guard`);
  }
}

const nextConfig=read('next.config.ts');
for(const h of ['Content-Security-Policy','X-Content-Type-Options','Referrer-Policy','Permissions-Policy','X-Frame-Options']){
  if(!nextConfig.includes(h)) failures.push(`next.config.ts: missing ${h}`);
}

const health=read('src/app/api/health/route.ts');
for(const leak of ['databaseConfigured','authSecretConfigured','deployUrlDetected']){
  if(health.includes(leak)) failures.push(`health route leaks ${leak}`);
}

const migration=read('database/migrations/20260902_022_security_hardening.sql');
for(const marker of ['enable row level security','revoke all on all tables in schema public from public','owner_isolation']){
  if(!migration.toLowerCase().includes(marker)) failures.push(`security migration missing: ${marker}`);
}

const ai=read('src/features/recommendations/ai/get-advisor-explanation.ts');
if(/infrastructure\/db|DATABASE_URL|getRawSql|rawSql/.test(ai)) failures.push('AI explanation layer has direct DB authority');

if(!existsSync(join(root,'package-lock.json'))) {
  console.warn('SECURITY-GATE-WARN package-lock.json is absent; must be generated with registry access before production.');
}

if(failures.length){
  console.error('Phase 37 security verification: FAIL');
  for(const f of failures) console.error('-',f);
  process.exit(1);
}
console.log('Phase 37 security verification: PASS');
console.log(`Protected action modules checked: ${actions.length}`);
console.log(`Source files scanned: ${sourceFiles.length}`);
