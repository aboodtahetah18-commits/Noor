import { z } from 'zod';
import { ALLOCATION_TYPES } from '@/domain/types';

export const planAllocationSchema = z.object({
  categoryId: z.string().uuid('البند غير صالح'),
  plannedAmount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'المبلغ غير صالح'),
  allocationType: z.enum(ALLOCATION_TYPES),
});

export const createFinancialPlanSchema = z.object({
  cycleId: z.string().uuid('الدورة غير صالحة'),
  allocations: z.array(planAllocationSchema).min(1, 'أضف تخصيصًا واحدًا على الأقل'),
}).superRefine((value, ctx) => {
  const ids = new Set<string>();
  value.allocations.forEach((a, i) => {
    if (ids.has(a.categoryId)) ctx.addIssue({ code: 'custom', message: 'لا يمكن تكرار البند داخل الخطة', path: ['allocations', i, 'categoryId'] });
    ids.add(a.categoryId);
  });
});

export const reviseFinancialPlanSchema = z.object({
  planId: z.string().uuid(),
  revisionReason: z.string().trim().min(3, 'سبب التعديل مطلوب').max(500),
  changes: z.array(z.object({
    categoryId: z.string().uuid(),
    newAmount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'المبلغ غير صالح'),
  })).min(1, 'أضف تعديلًا واحدًا على الأقل'),
});

export type CreateFinancialPlanInput = z.infer<typeof createFinancialPlanSchema>;
export type ReviseFinancialPlanInput = z.infer<typeof reviseFinancialPlanSchema>;
