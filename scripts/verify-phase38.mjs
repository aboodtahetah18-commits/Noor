import fs from 'node:fs';

const mustContain = (file, text, label) => {
  const source = fs.readFileSync(file, 'utf8');
  if (!source.includes(text)) throw new Error(`${label}: missing ${text}`);
  return source;
};

const goal = mustContain('src/repositories/goal-repository.ts', 'One capacity query per list', 'goal optimization');
if (/for\s*\([^)]*of\s+rows[^)]*\)[\s\S]{0,300}await\s+this\.analyze/.test(goal)) {
  throw new Error('goal optimization: N+1 analyze loop returned');
}
if (!goal.includes('Direct lookup avoids loading/analyzing')) throw new Error('goal get direct lookup missing');

const engine = mustContain('src/features/recommendations/engine/run-recommendation-rules.ts', 'insertManyIfAbsent', 'recommendation batching');
if (/for\s*\([^)]*of\s+candidates[^)]*\)[\s\S]{0,200}insertIfAbsent/.test(engine)) {
  throw new Error('recommendation batching: per-row insert returned');
}

mustContain('src/repositories/recommendation-repository.ts', 'jsonb_to_recordset', 'set-based recommendation insert');
mustContain('src/features/transactions/schemas/transaction-history.ts', 'pageSize', 'transaction pagination');
mustContain('database/migrations/20260902_023_performance_hardening.sql', 'transactions_cycle_posted_type_category_idx', 'performance indexes');
mustContain('database/migrations/20260902_023_performance_hardening.sql', 'obligation_occurrences_open_due_idx', 'obligation index');
mustContain('database/migrations/20260902_023_performance_hardening.sql', 'recommendations_open_feed_idx', 'advisor index');

console.log('Phase 38 performance structural verification: PASS');
