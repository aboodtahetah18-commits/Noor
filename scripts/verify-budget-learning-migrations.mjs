import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const dir=path.resolve('database/migrations');
const files=fs.readdirSync(dir).filter(name=>/^\d{8}_\d{3}_.+\.sql$/.test(name)).sort();

const expected=[
  '20260930_081_budget_priority_learning.sql',
  '20260930_082_budget_priority_disagreement_learning.sql',
  '20260930_083_budget_priority_temporary_overrides.sql',
  '20260930_084_budget_priority_temporary_reason.sql',
  '20260930_085_budget_temporary_extra_amount.sql',
  '20260930_086_budget_temporary_amount_learning.sql',
  '20260930_087_budget_temporary_amount_outcomes.sql',
  '20260930_088_budget_temporary_amount_bias_learning.sql',
  '20260930_089_budget_temporary_bias_drift.sql',
  '20261001_090_budget_priority_integrity.sql',
];

const errors=[];
for(const filename of expected){
  if(!files.includes(filename)) errors.push(`Missing migration: ${filename}`);
}

const relevant=files.filter(name=>/_(08[1-9]|090)_budget_/.test(name));
const ordinalGroups=new Map();
for(const filename of relevant){
  const match=filename.match(/_(\d{3})_/);
  if(!match) continue;
  const ordinal=match[1];
  const group=ordinalGroups.get(ordinal)??[];
  group.push(filename);
  ordinalGroups.set(ordinal,group);
}
for(const [ordinal,group] of ordinalGroups){
  if(group.length>1) errors.push(`Duplicate budget migration ordinal ${ordinal}: ${group.join(', ')}`);
}

const fingerprints=new Map();
for(const filename of expected){
  const full=path.join(dir,filename);
  if(!fs.existsSync(full)) continue;
  const sql=fs.readFileSync(full,'utf8');
  if(!/^\s*begin;\s*/i.test(sql)) errors.push(`${filename} must start with BEGIN`);
  if(!/\s*commit;\s*$/i.test(sql)) errors.push(`${filename} must end with COMMIT`);
  if(/language\s+plpgsql\s+as\s+\$(?!\$)/i.test(sql)) {
    errors.push(`${filename} contains invalid single-dollar PL/pgSQL quoting`);
  }

  const normalized=sql.replace(/--.*$/gm,'').replace(/\s+/g,' ').trim();
  const hash=crypto.createHash('sha256').update(normalized).digest('hex');
  const duplicate=fingerprints.get(hash);
  if(duplicate) errors.push(`Duplicate migration body: ${duplicate} and ${filename}`);
  else fingerprints.set(hash,filename);
}

const order=expected.map(name=>files.indexOf(name));
for(let i=1;i<order.length;i+=1){
  if(order[i]!==-1&&order[i-1]!==-1&&order[i]<=order[i-1]){
    errors.push(`Migration order is not monotonic around ${expected[i-1]} -> ${expected[i]}`);
  }
}

const integrityPath=path.join(dir,'20261001_090_budget_priority_integrity.sql');
if(fs.existsSync(integrityPath)){
  const sql=fs.readFileSync(integrityPath,'utf8').toLowerCase();
  const firstUpdate=sql.indexOf('update public.budget_allocations');
  const firstConstraint=sql.indexOf('add constraint budget_allocations_priority_override_scope_consistency_chk');
  if(firstUpdate<0||firstConstraint<0||firstUpdate>firstConstraint){
    errors.push('Integrity migration must normalize legacy rows before adding cross-column constraints');
  }
}

if(errors.length){
  console.error('BUDGET-MIGRATION-CONTRACT-FAIL');
  for(const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`BUDGET-MIGRATION-CONTRACT-PASS files=${expected.length}`);
