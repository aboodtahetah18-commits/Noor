import type { FinancialCycleStatus } from '@/domain/types';
export interface FinancialCycleView { id:string; name:string; startDate:string; expectedNextIncomeDate:string; status:FinancialCycleStatus; activatedAt:string|null; createdAt:string; }
