import { z } from 'zod';

export const categoryGroupSchema = z.enum(['OBLIGATION','ESSENTIAL','SAVING','EMERGENCY','GOAL','FLEXIBLE']);
export const defaultExpenseNatureSchema = z.enum(['NECESSARY','IMPORTANT','OPTIONAL','ENTERTAINMENT']);

export const budgetCategoryInputSchema = z.object({
  name: z.string().trim().min(1, 'اسم البند مطلوب').max(120),
  categoryGroup: categoryGroupSchema,
  expenseNatureDefault: z.union([defaultExpenseNatureSchema, z.literal('')]).transform(v => v === '' ? null : v),
  isEssential: z.boolean(),
});

export type BudgetCategoryInput = z.infer<typeof budgetCategoryInputSchema>;
