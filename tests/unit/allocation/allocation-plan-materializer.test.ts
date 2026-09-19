import { describe, expect, it } from 'vitest';
import { normalizeRatifiedDraftAllocations } from '@/lib/allocation/allocation-plan-materializer';

describe('allocation plan materializer normalization',()=>{
  it('keeps only governed responsibility buckets with non-negative numeric amounts',()=>{
    const rows=normalizeRatifiedDraftAllocations([
      {ownerKey:'budget-spending-owner',ownerName:'مسؤول الميزانية والإنفاق',amount:4000,source:'REQUESTED'},
      {ownerKey:'investment-owner',ownerName:'مسؤول الاستثمار',amount:1000,source:'YIELDED'},
      {ownerKey:'unknown-owner',ownerName:'مجهول',amount:500,source:'REQUESTED'},
      {ownerKey:'goals-owner',ownerName:'مسؤول الأهداف',amount:-1,source:'REQUESTED'},
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ownerKey:'investment-owner',amount:1000,source:'YIELDED'});
  });

  it('never infers missing amounts',()=>{
    const rows=normalizeRatifiedDraftAllocations([
      {ownerKey:'liquidity-protection-owner',ownerName:'مسؤول السيولة والحماية',amount:null,source:'UNRESOLVED'},
    ]);
    expect(rows).toEqual([]);
  });
});
