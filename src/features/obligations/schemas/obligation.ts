import { z } from 'zod';
import { OBLIGATION_RECURRENCES, OBLIGATION_STATUSES } from '@/domain/types';

const moneyPattern = /^\d{1,16}(?:\.\d{1,2})?$/;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const createObligationTemplateSchema = z.object({
  name: z.string().trim().min(1, 'اسم الالتزام مطلوب').max(160),
  defaultAmount: z.string().trim().regex(moneyPattern, 'مبلغ الالتزام غير صالح').refine((v) => Number(v) > 0, 'المبلغ يجب أن يكون أكبر من صفر'),
  recurrence: z.enum(OBLIGATION_RECURRENCES),
  priority: z.number().int().min(1).optional(),
  expectedAccountId: z.string().uuid('الحساب المتوقع غير صالح').optional(),
  firstDueDate: z.string().regex(isoDatePattern, 'تاريخ الاستحقاق مطلوب'),
  idempotencyKey: z.string().trim().min(1).max(200),
});

export const payObligationSchema = z.object({
  obligationOccurrenceId: z.string().uuid('معرف الاستحقاق غير صالح'),
  accountId: z.string().uuid('الحساب غير صالح'),
  amount: z.string().trim().regex(moneyPattern, 'مبلغ السداد غير صالح').refine((v) => Number(v) > 0, 'المبلغ يجب أن يكون أكبر من صفر'),
  transactionDate: z.string().regex(isoDatePattern, 'تاريخ السداد مطلوب'),
  idempotencyKey: z.string().trim().min(1).max(200),
});

export const listObligationsSchema = z.object({
  status: z.enum(OBLIGATION_STATUSES).optional(),
  cycleId: z.string().uuid().optional(),
});

export const cancelObligationSchema = z.object({
  obligationOccurrenceId: z.string().uuid(),
  reason: z.string().trim().min(3, 'سبب الإلغاء مطلوب').max(500),
});

export type CreateObligationTemplateInput = z.infer<typeof createObligationTemplateSchema>;
export type PayObligationInput = z.infer<typeof payObligationSchema>;
export type ListObligationsInput = z.infer<typeof listObligationsSchema>;
export type CancelObligationInput = z.infer<typeof cancelObligationSchema>;
