import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
describe('recommendation engine structural safeguards',()=>{
 const source=fs.readFileSync('src/features/recommendations/engine/run-recommendation-rules.ts','utf8');
 it('uses finalized P56 forecast facts and blocks only when an explicit buffer policy is missing',()=>{expect(source).toContain('calculateCashForecast');expect(source).toContain('forecast.code');expect(source).not.toContain('ISSUE-0004');});
 it('uses stable deduplication keys',()=>{expect(source).toContain('deduplicationKey');});
 it('uses Money rather than floating point for surplus arithmetic',()=>{expect(source).toContain('Money.parse');expect(source).not.toContain('Number(s.actual)');});
});
