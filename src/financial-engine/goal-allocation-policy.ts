export interface GoalAllocationCandidate {
  id: string;
  priority: number | null;
  targetDate: string | null;
}

export interface GoalAllocationPolicyResult {
  mode: 'SUGGEST_ONLY_USER_APPROVAL_REQUIRED';
  orderedGoalIds: string[];
  automaticAllocation: false;
  engineVersion: 'P56-V1';
}

/** P56 / PENDING-BR-005: V1 never moves money automatically across goals. */
export function rankGoalsForSuggestion(candidates: readonly GoalAllocationCandidate[]): GoalAllocationPolicyResult {
  const ordered = [...candidates].sort((a, b) => {
    const pa = a.priority ?? Number.MAX_SAFE_INTEGER;
    const pb = b.priority ?? Number.MAX_SAFE_INTEGER;
    if (pa !== pb) return pa - pb;
    const da = a.targetDate ?? '9999-12-31';
    const db = b.targetDate ?? '9999-12-31';
    if (da !== db) return da.localeCompare(db);
    return a.id.localeCompare(b.id);
  });
  return { mode: 'SUGGEST_ONLY_USER_APPROVAL_REQUIRED', orderedGoalIds: ordered.map((item) => item.id), automaticAllocation: false, engineVersion: 'P56-V1' };
}
