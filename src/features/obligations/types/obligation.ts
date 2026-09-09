import type { ObligationRecurrence, ObligationStatus } from '@/domain/types';

export type ObligationListItem = {
  id: string;
  templateId: string;
  cycleId: string | null;
  name: string;
  amount: string;
  dueDate: string;
  status: ObligationStatus;
  recurrence: ObligationRecurrence;
  priority: number | null;
  expectedAccountId: string | null;
  expectedAccountName: string | null;
  isReserved: boolean;
  paidTransactionId: string | null;
  paidAt: string | null;
};

export type CreateObligationTemplateResult = {
  templateId: string;
  occurrence: ObligationListItem;
};

export type PayObligationResult = {
  occurrenceId: string;
  transactionId: string;
  status: 'PAID';
  amount: string;
  accountId: string;
  accountBalanceAfter: string;
  reservationReleased: true;
  nextOccurrence: ObligationListItem | null;
  reservedUnpaidAfter: string;
  safeToSpendStatus: 'BUFFER_POLICY_REQUIRED';
  safeToSpendBlockingIssue: 'BUFFER_POLICY_REQUIRED';
};

export type ObligationStatusSyncResult = {
  markedDue: number;
  markedOverdue: number;
  reservationsUpdated: number;
};
