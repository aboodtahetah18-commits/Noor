import { describe, expect, it } from 'vitest';
import {
  FOLLOWUP_EVIDENCE_MAX_BYTES,
  FOLLOWUP_EVIDENCE_TYPES,
} from '@/lib/governance/governance-followup-user-response';

describe('governance followup user response',()=>{
  it('allows only reviewable evidence file types',()=>{
    expect(FOLLOWUP_EVIDENCE_TYPES.has('application/pdf')).toBe(true);
    expect(FOLLOWUP_EVIDENCE_TYPES.has('image/png')).toBe(true);
    expect(FOLLOWUP_EVIDENCE_TYPES.has('application/x-msdownload')).toBe(false);
  });

  it('caps evidence payload size',()=>{
    expect(FOLLOWUP_EVIDENCE_MAX_BYTES).toBe(5*1024*1024);
  });
});
