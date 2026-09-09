import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Phase 23 advisor UI contract',()=>{
  const details=fs.readFileSync('src/app/(protected)/advisor/[id]/page.tsx','utf8');
  const actions=fs.readFileSync('src/app/(protected)/advisor/actions.ts','utf8');
  const repository=fs.readFileSync('src/repositories/recommendation-repository.ts','utf8');
  it('supports feed filters and pagination',()=>{ expect(repository).toContain('listFeed'); expect(repository).toContain('limit ${input.pageSize} offset ${offset}'); });
  it('shows why, accept and dismiss without automatic finance writes',()=>{ expect(details).toContain('لماذا ظهرت هذه التوصية؟'); expect(details).toContain('قبول التوصية لا ينفذ'); expect(actions).toContain('acceptRecommendation'); expect(actions).toContain('dismissRecommendation'); });
});
