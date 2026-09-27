import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
describe('daily algorithm knowledge report contract',()=>{
  it('publishes the report through the existing daily financial-engine job',()=>{const route=read('src/app/api/jobs/financial-engine/route.ts');expect(route).toContain('runDailyAlgorithmKnowledgeReportJob');expect(route).toContain('algorithmKnowledgeReports')});
  it('keeps learning changes review-gated instead of self-modifying production rules',()=>{const service=read('src/features/algorithm-learning/services/daily-algorithm-knowledge-report.ts');expect(service).toContain('autoApply:false');expect(service).toContain('requiresReview:true');expect(service).toContain('hardRulesMutable:false');expect(service).toContain('مصدر تعلم لم يكتمل تحليله')});
  it('shows only stored real report data on the knowledge page',()=>{const page=read('src/app/(protected)/governance/page.tsx');expect(page).toContain('readDailyAlgorithmKnowledgeReport');expect(page).toContain('التقرير اليومي للذكاء والخوارزميات');expect(page).toContain('latest.findings.slice(0,5)');expect(page).not.toContain('Math.random')});
});
