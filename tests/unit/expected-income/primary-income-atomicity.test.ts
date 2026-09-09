import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
describe('Primary expected income atomicity',()=>{it('uses a database transaction when replacing the primary source',()=>{const s=fs.readFileSync('src/repositories/expected-income-repository.ts','utf8');expect(s).toContain('rawSql.transaction');expect(s).toContain('set is_primary=false');});});
