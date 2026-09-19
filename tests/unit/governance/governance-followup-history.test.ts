import { describe, expect, it } from 'vitest';
import { followupHistoryKey } from '@/lib/governance/governance-followup-history';

describe('governance followup history',()=>{
  it('uses a stable registry/followup composite key',()=>{
    expect(followupHistoryKey('REG-1','FUP-2')).toBe('REG-1:FUP-2');
  });
});
