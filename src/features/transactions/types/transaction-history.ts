import type { ExpenseNature, PlanningStatus, TransactionStatus, TransactionType } from '@/domain/types';

export type TransactionSort = 'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC';

export type TransactionHistoryFilters = {
  page: number;
  pageSize: number;
  dateFrom?: string;
  dateTo?: string;
  transactionType?: TransactionType;
  categoryId?: string;
  accountId?: string;
  planningStatus?: PlanningStatus;
  search?: string;
  sort: TransactionSort;
};

export type TransactionHistoryItem = {
  id: string;
  cycleId: string | null;
  accountId: string | null;
  accountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  transactionType: TransactionType;
  status: TransactionStatus;
  transactionDirection: 'IN' | 'OUT' | null;
  transferId: string | null;
  relatedTransactionId: string | null;
  amount: string;
  transactionDate: string;
  description: string | null;
  planningStatus: PlanningStatus | null;
  expenseNature: ExpenseNature | null;
  incomeSourceName: string | null;
  incomeKind: string | null;
  postedAt: string | null;
  createdAt: string;
};

export type TransactionHistoryPage = {
  items: TransactionHistoryItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export type TransactionDetails = TransactionHistoryItem & {
  cycleName: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
  obligation: null | {
    id: string;
    name: string;
    dueDate: string;
    status: string;
  };
};
