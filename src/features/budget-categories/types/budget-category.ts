import type { CategoryGroup, DefaultExpenseNature } from '@/domain/types';
export type BudgetCategoryView = {
  id:string; name:string; categoryGroup:CategoryGroup; expenseNatureDefault:DefaultExpenseNature|null;
  isEssential:boolean; isActive:boolean; createdAt:string; updatedAt:string;
};
