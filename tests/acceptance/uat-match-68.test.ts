import { describe,expect,it } from 'vitest';
import { evaluateUnifiedEvidenceVerification } from '@/features/financial-engine/services/evidence-verification-contract';

describe('UAT MATCH 68',()=>{
  it('receipt stays provisional and an unexplained bank difference requires reconciliation',()=>{
    const provisional=evaluateUnifiedEvidenceVerification({
      completeEvidence:true,
      candidateCount:0,
      matchConfidence:null,
      autoMatchThreshold:95,
      hasMaterialDifference:false,
      accountingClassificationReady:false,
    });
    expect(provisional.status).toBe('PENDING_MATCH');

    const difference=evaluateUnifiedEvidenceVerification({
      completeEvidence:true,
      candidateCount:0,
      matchConfidence:null,
      autoMatchThreshold:95,
      hasMaterialDifference:true,
      accountingClassificationReady:false,
    });
    expect(difference).toMatchObject({
      status:'RECONCILIATION_REQUIRED',
      storage_status:'MISMATCH',
      reason:'MATERIAL_DIFFERENCE_REQUIRES_RECONCILIATION',
    });
  });
});
