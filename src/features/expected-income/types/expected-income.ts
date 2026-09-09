import type { IncomeKind } from '@/domain/types';

export type ExpectedIncomeView = {
  id: string;
  cycleId: string;
  sourceName: string;
  expectedAmount: string;
  expectedDate: string;
  incomeKind: IncomeKind;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};
