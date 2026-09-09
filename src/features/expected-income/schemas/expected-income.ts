import { z } from 'zod';
import { INCOME_KINDS } from '@/domain/types';

const moneyPattern = /^\d{1,16}(?:\.\d{1,2})?$/;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const expectedIncomeSchema = z.object({
  cycleId: z.string().uuid('معرف الدورة غير صالح'),
  sourceName: z.string().trim().min(1, 'اسم مصدر الدخل مطلوب').max(120),
  expectedAmount: z.string().trim().regex(moneyPattern, 'قيمة الدخل المتوقعة غير صالحة').refine(v => Number(v) > 0, 'قيمة الدخل يجب أن تكون أكبر من صفر'),
  expectedDate: z.string().regex(isoDatePattern, 'تاريخ الاستلام المتوقع غير صالح'),
  incomeKind: z.enum(INCOME_KINDS),
  isPrimary: z.boolean().default(false),
});

export type ExpectedIncomeInput = z.infer<typeof expectedIncomeSchema>;
