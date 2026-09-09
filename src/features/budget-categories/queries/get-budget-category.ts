import { budgetCategoryRepository } from '@/repositories/budget-category-repository'; export const getBudgetCategory=(userId:string,id:string)=>budgetCategoryRepository.getById(userId,id);
