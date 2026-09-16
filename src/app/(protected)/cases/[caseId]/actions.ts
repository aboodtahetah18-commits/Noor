'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { getGovernanceOperationsSnapshot } from '@/repositories/governance-operations-repository';
import { recordGovernedAlgorithmDecision } from '@/features/governance/services/record-governed-algorithm-decision';
import { decideGovernedRollbackReview } from '@/features/governance/services/decide-governed-rollback-review';
import { releaseGovernedAlgorithmChangeFromCase } from '@/features/governance/services/release-governed-algorithm-change-from-case';
import { executeGovernedAlgorithmRollback } from '@/features/governance/services/execute-governed-algorithm-rollback';
import { buildGovernedRollback } from '@/financial-engine/learning/governed-learning-governance';

function value(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim();
}
function requireRationale(fd: FormData): string {
  const rationale = value(fd, 'rationale').slice(0, 4000);
  if (!rationale) throw new Error('GOVERNANCE_RATIONALE_REQUIRED');
  return rationale;
}
function safeMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : 'GOVERNANCE_ACTION_FAILED';
  const known = [
    'AUTHORIZATION_DENIED', 'GOVERNANCE_RATIONALE_REQUIRED', 'ALGORITHM_PROPOSAL_NOT_FOUND',
    'ALGORITHM_APPROVAL_REQUIRES_PASSED_BACKTEST', 'ALGORITHM_REJECTION_REQUIRES_COMPLETED_BACKTEST',
    'ROLLBACK_REVIEW_NOT_PENDING_OR_NOT_FOUND', 'CASE_RELEASE_NOT_READY', 'CASE_RELEASE_EVIDENCE_MISMATCH',
    'ALGORITHM_ROLLBACK_REQUIRES_APPROVED_REVIEW', 'ALGORITHM_ROLLBACK_GOVERNANCE_GATE_FAILED',
  ];
  return known.some((code) => raw.startsWith(code)) ? raw : 'GOVERNANCE_ACTION_FAILED';
}
function finish(caseId: string, status: 'success' | 'error', message: string): never {
  revalidatePath(`/cases/${caseId}`);
  redirect(`/cases/${caseId}?governanceStatus=${status}&governanceMessage=${encodeURIComponent(message)}`);
}

export async function decideChangeProposalAction(fd: FormData) {
  const actor = await requireAuthenticatedMutationUser();
  const caseId = value(fd, 'caseId');
  const decisionRaw = value(fd, 'decision');
  const decision = decisionRaw === 'APPROVED' ? 'APPROVED' : decisionRaw === 'REJECTED' ? 'REJECTED' : null;
  if (!caseId || !decision) return finish(caseId, 'error', 'GOVERNANCE_ACTION_INVALID');

  try {
    const snapshot = await getGovernanceOperationsSnapshot(actor.id, caseId);
    if (!snapshot.proposal || !snapshot.backtest?.runId || snapshot.approval) throw new Error('CHANGE_PROPOSAL_NOT_DECIDABLE');
    await recordGovernedAlgorithmDecision({
      actorUserId: actor.id,
      proposalId: snapshot.proposal.id,
      backtestRunId: snapshot.backtest.runId,
      decision,
      rationale: requireRationale(fd),
    });
    return finish(caseId, 'success', decision === 'APPROVED' ? 'CHANGE_PROPOSAL_APPROVED' : 'CHANGE_PROPOSAL_REJECTED');
  } catch (error) {
    return finish(caseId, 'error', safeMessage(error));
  }
}

export async function decideRollbackReviewAction(fd: FormData) {
  const actor = await requireAuthenticatedMutationUser();
  const caseId = value(fd, 'caseId');
  const decisionRaw = value(fd, 'decision');
  const decision = decisionRaw === 'APPROVED' ? 'APPROVED' : decisionRaw === 'REJECTED' ? 'REJECTED' : null;
  if (!caseId || !decision) return finish(caseId, 'error', 'GOVERNANCE_ACTION_INVALID');

  try {
    const snapshot = await getGovernanceOperationsSnapshot(actor.id, caseId);
    if (!snapshot.rollbackReview || snapshot.rollbackReview.status !== 'PENDING_REVIEW') throw new Error('ROLLBACK_REVIEW_NOT_PENDING_OR_NOT_FOUND');
    await decideGovernedRollbackReview({
      actorUserId: actor.id,
      reviewId: snapshot.rollbackReview.id,
      decision,
      rationale: requireRationale(fd),
    });
    return finish(caseId, 'success', decision === 'APPROVED' ? 'ROLLBACK_REVIEW_APPROVED' : 'ROLLBACK_REVIEW_REJECTED');
  } catch (error) {
    return finish(caseId, 'error', safeMessage(error));
  }
}

export async function releaseGovernedChangeAction(fd: FormData) {
  const actor = await requireAuthenticatedMutationUser();
  const caseId = value(fd, 'caseId');
  if (!caseId || value(fd, 'confirm') !== 'RELEASE') return finish(caseId, 'error', 'RELEASE_EXPLICIT_CONFIRMATION_REQUIRED');

  try {
    await releaseGovernedAlgorithmChangeFromCase({ actorUserId: actor.id, ownerUserId: actor.id, caseId });
    return finish(caseId, 'success', 'GOVERNED_RELEASE_CREATED');
  } catch (error) {
    return finish(caseId, 'error', safeMessage(error));
  }
}

export async function executeGovernedRollbackAction(fd: FormData) {
  const actor = await requireAuthenticatedMutationUser();
  const caseId = value(fd, 'caseId');
  if (!caseId || value(fd, 'confirm') !== 'ROLLBACK') return finish(caseId, 'error', 'ROLLBACK_EXPLICIT_CONFIRMATION_REQUIRED');

  try {
    const snapshot = await getGovernanceOperationsSnapshot(actor.id, caseId);
    if (!snapshot.release || snapshot.rollbackReview?.status !== 'APPROVED') throw new Error('ALGORITHM_ROLLBACK_REQUIRES_APPROVED_REVIEW');
    const event = buildGovernedRollback({
      releaseId: snapshot.release.id,
      fromVersion: snapshot.release.version,
      previousVersion: snapshot.release.previousVersion,
      reason: requireRationale(fd),
    });
    await executeGovernedAlgorithmRollback({ actorUserId: actor.id, event });
    return finish(caseId, 'success', 'GOVERNED_ROLLBACK_CREATED');
  } catch (error) {
    return finish(caseId, 'error', safeMessage(error));
  }
}
