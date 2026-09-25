import { describe, expect, it } from 'vitest';
import { compactCommitteeTriggers } from '../../src/lib/governance/governance-meeting-scheduler';

describe('هيكل اللجان المبسط',()=>{
  it('يفتح لجنة التوازن في الدورة الأولى',()=>{
    expect(compactCommitteeTriggers({cycleCount:1,operatingDeficit:0,utilizationPercent:20}).financialBalance).toBe(true);
  });

  it('لا يفتح اجتماعًا دائمًا بلا سبب بين نقاط المراجعة',()=>{
    const result=compactCommitteeTriggers({cycleCount:2,operatingDeficit:0,utilizationPercent:60});
    expect(result.financialBalance).toBe(false);
    expect(result.oversightLearning).toBe(false);
  });

  it('يفتح لجنة التوازن عند عجز أو استخدام مرتفع',()=>{
    expect(compactCommitteeTriggers({cycleCount:2,operatingDeficit:100,utilizationPercent:40}).financialBalance).toBe(true);
    expect(compactCommitteeTriggers({cycleCount:2,operatingDeficit:0,utilizationPercent:90}).financialBalance).toBe(true);
  });

  it('يفتح لجنة المراجعة والمخاطر والتعلم كل سادس دورة فقط',()=>{
    expect(compactCommitteeTriggers({cycleCount:6,operatingDeficit:0,utilizationPercent:50}).oversightLearning).toBe(true);
    expect(compactCommitteeTriggers({cycleCount:5,operatingDeficit:0,utilizationPercent:50}).oversightLearning).toBe(false);
  });
});
