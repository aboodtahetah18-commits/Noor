import { describe, expect, it } from 'vitest';
import { computeProtectionCapacity } from '@/lib/conversations/protection-capacity';

describe('protected commitment capacity', () => {
  it('does not double-count dated obligations already covered by the core-cycle floor', () => {
    expect(computeProtectionCapacity({
      protectedLiquidityTotal: 10_000,
      recurringCoreObligationsTotal: 4_000,
      reservedDatedObligationsTotal: 3_000,
      nearGoalReserveTotal: 1_500,
    })).toMatchObject({
      protected_commitment_floor: 5_500,
      safe_capacity_after_commitments: 4_500,
      commitment_gap: 0,
      commitment_protection_status: 'COMMITMENTS_COVERED',
    });
  });

  it('raises the floor when dated obligations exceed the aggregate core-cycle amount', () => {
    expect(computeProtectionCapacity({
      protectedLiquidityTotal: 10_000,
      recurringCoreObligationsTotal: 4_000,
      reservedDatedObligationsTotal: 6_000,
      nearGoalReserveTotal: 1_000,
    })).toMatchObject({
      protected_commitment_floor: 7_000,
      safe_capacity_after_commitments: 3_000,
    });
  });

  it('blocks capacity when protected commitments exceed protected liquidity', () => {
    expect(computeProtectionCapacity({
      protectedLiquidityTotal: 5_000,
      recurringCoreObligationsTotal: 4_000,
      reservedDatedObligationsTotal: 4_500,
      nearGoalReserveTotal: 1_500,
    })).toMatchObject({
      protected_commitment_floor: 6_000,
      safe_capacity_after_commitments: 0,
      commitment_gap: 1_000,
      commitment_protection_status: 'COMMITMENT_SHORTFALL',
    });
  });
});
