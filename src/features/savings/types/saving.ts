import type { SavingAllocationStatus } from '@/domain/types';

export interface SavingSummary {
  savingAllocationId: string;
  cycleId: string;
  planVersionId: string;
  plannedAmount: string;
  allocatedAmount: string;
  actualTransferredAmount: string;
  remainingToTransfer: string;
  status: SavingAllocationStatus;
}

export interface SavingTransferResult {
  savingTransferId: string;
  savingAllocationId: string;
  outTransactionId: string;
  inTransactionId: string;
  amount: string;
  transactionDate: string;
  fromAccountId: string;
  toAccountId: string;
  fromAccountBalanceAfter: string;
  toAccountBalanceAfter: string;
  actualTransferredAmount: string;
  remainingToTransfer: string;
  allocationStatus: SavingAllocationStatus;
  totalLiquidityChange: '0.00';
  postedAt: string;
}
