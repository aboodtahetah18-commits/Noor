export type ProtectionCapacityInput = {
  protectedLiquidityTotal: number;
  recurringCoreObligationsTotal: number;
  reservedDatedObligationsTotal: number;
  nearGoalReserveTotal: number;
};

export type ProtectionCapacityResult = {
  core_cycle_floor: number;
  dated_obligations_floor: number;
  near_goal_reserve_total: number;
  protected_commitment_floor: number;
  safe_capacity_after_commitments: number;
  commitment_gap: number;
  commitment_protection_status: 'COMMITMENTS_COVERED' | 'COMMITMENT_SHORTFALL';
};

/**
 * Calculates the amount that can still be tested for investment/financing after
 * protecting the current core cycle, dated obligations and near-term goals.
 *
 * Dated obligations may be the concrete schedule behind the aggregate core
 * obligation amount, so we use the larger of the two instead of summing them.
 * This prevents the same obligation from being protected twice. Near-term goal
 * money is then added because it represents a separate earmark.
 */
export function computeProtectionCapacity(input: ProtectionCapacityInput): ProtectionCapacityResult {
  const protectedLiquidityTotal = Math.max(input.protectedLiquidityTotal, 0);
  const coreCycleFloor = Math.max(input.recurringCoreObligationsTotal, 0);
  const datedObligationsFloor = Math.max(input.reservedDatedObligationsTotal, 0);
  const nearGoalReserve = Math.max(input.nearGoalReserveTotal, 0);
  const cycleCommitmentFloor = Math.max(coreCycleFloor, datedObligationsFloor);
  const protectedCommitmentFloor = cycleCommitmentFloor + nearGoalReserve;
  const safeCapacity = Math.max(protectedLiquidityTotal - protectedCommitmentFloor, 0);
  const commitmentGap = Math.max(protectedCommitmentFloor - protectedLiquidityTotal, 0);

  return {
    core_cycle_floor: coreCycleFloor,
    dated_obligations_floor: datedObligationsFloor,
    near_goal_reserve_total: nearGoalReserve,
    protected_commitment_floor: protectedCommitmentFloor,
    safe_capacity_after_commitments: safeCapacity,
    commitment_gap: commitmentGap,
    commitment_protection_status: commitmentGap > 0 ? 'COMMITMENT_SHORTFALL' : 'COMMITMENTS_COVERED',
  };
}
