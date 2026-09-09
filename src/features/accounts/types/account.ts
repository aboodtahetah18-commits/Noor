import type { AccountType } from '@/domain/types';

export type AccountSummary = {
  id: string;
  name: string;
  accountType: AccountType;
  currency: 'SAR';
  isActive: boolean;
  openingBalance: string;
  balance: string;
  bankCode?: string;
  bankName?: string;
  accountNumberMasked?: string;
  ibanMasked?: string;
  cardLast4?: string;
};

export type AccountDetails = AccountSummary & {
  effectiveDate: string;
  createdAt: string;
};
