import { describe,expect,it } from 'vitest';
import { evaluateUnifiedEvidenceVerification } from '@/features/financial-engine/services/evidence-verification-contract';

describe('UAT STOP 110',()=>{
  it('a material unexplained difference blocks final matching without inventing a financial effect',()=>{
    const result=evaluateUnifiedEvidenceVerification({
      completeEvidence:true,
      candidateCount:1,
      matchConfidence:99,
      autoMatchThreshold:95,
      hasMaterialDifference:true,
      accountingClassificationReady:true,
    });

    expect(result).toMatchObject({
      status:'RECONCILIATION_REQUIRED',
      state_machine_id:'حالة-مطابقة-٣٨',
      storage_status:'MISMATCH',
    });
    expect(result.status).not.toBe('FINAL_MATCHED');
  });
});
