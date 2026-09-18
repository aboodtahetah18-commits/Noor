import { beforeEach,describe,expect,it,vi } from 'vitest';

const sqlMock=vi.fn();
const verifyEvidenceMock=vi.fn();
vi.mock('@/infrastructure/db/client',()=>({getRawSql:()=>sqlMock}));
vi.mock('@/features/financial-engine/services/evidence-verification-service',()=>({verifyUnifiedEvidenceCase:verifyEvidenceMock}));

import { reportUserExecution } from '@/features/financial-engine/services/execution-service';

const userId='11111111-1111-4111-8111-111111111111';
const taskId='22222222-2222-4222-8222-222222222222';
const decisionReference='DEC-55555555-5555-4555-8555-555555555555';

describe('reportUserExecution',()=>{
  beforeEach(()=>{sqlMock.mockReset();verifyEvidenceMock.mockReset();verifyEvidenceMock.mockResolvedValue({status:'PENDING',reason:'EVIDENCE_FIELDS_INCOMPLETE',candidateCount:0,matchedStatementRowId:null});});

  it('requires evidence when the execution task requires it',async()=>{
    sqlMock
      .mockResolvedValueOnce([{id:taskId,status:'USER_ACTION_REQUEST',evidence_requirement:'REQUIRED',amount:'500',currency:'SAR',action_type:'TRANSFER',decision_reference:decisionReference}])
      .mockResolvedValueOnce([]);
    await expect(reportUserExecution({userId,executionTaskId:taskId})).rejects.toMatchObject({code:'EVIDENCE_REQUIRED',httpStatus:422});
    expect(sqlMock).toHaveBeenCalledTimes(2);
  });

  it('is idempotent when an open execution event already exists',async()=>{
    sqlMock
      .mockResolvedValueOnce([{id:taskId,status:'EVIDENCE_PENDING',evidence_requirement:'REQUIRED',amount:'500',currency:'SAR',action_type:'TRANSFER',decision_reference:decisionReference}])
      .mockResolvedValueOnce([{id:'33333333-3333-4333-8333-333333333333',status:'EVIDENCE_PENDING',reported_amount:'500',currency:'SAR',external_reference:'ref',executed_at:'x',created_at:'x'}]);
    const result=await reportUserExecution({userId,executionTaskId:taskId,evidence:{type:'REFERENCE',fileOrReference:'ref'}});
    expect(result.created).toBe(false);
    expect(sqlMock).toHaveBeenCalledTimes(2);
  });

  it('reports user execution and leaves verification pending on evidence',async()=>{
    sqlMock
      .mockResolvedValueOnce([{id:taskId,status:'USER_ACTION_REQUEST',evidence_requirement:'REQUIRED',amount:'500',currency:'SAR',action_type:'TRANSFER'}])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{id:'33333333-3333-4333-8333-333333333333',status:'REPORTED',reported_amount:'500',currency:'SAR',external_reference:'ref',executed_at:'x',decision_reference:decisionReference,created_at:'x'}])
      .mockResolvedValueOnce([{id:'44444444-4444-4444-8444-444444444444',evidence_type:'REFERENCE',file_or_reference:'ref',verification_status:'PENDING',decision_reference:decisionReference,created_at:'x'}])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const result=await reportUserExecution({
      userId,executionTaskId:taskId,externalReference:'ref',evidence:{type:'REFERENCE',fileOrReference:'ref',claimedAmount:'500'},
    });
    expect(result.created).toBe(true);
    expect(result.executionEvent.status).toBe('EVIDENCE_PENDING');
    expect(result.evidenceCase?.verification_status).toBe('PENDING');
    expect(verifyEvidenceMock).toHaveBeenCalledTimes(1);
    expect(result.executionEvent.decision_reference).toBe(decisionReference);
    expect(result.evidenceCase?.decision_reference).toBe(decisionReference);
  });
});
