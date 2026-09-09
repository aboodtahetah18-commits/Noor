import { z } from 'zod';
export const createCycleSchema = z.object({
  name: z.string().trim().min(1, 'اسم الدورة مطلوب').max(120),
  startDate: z.iso.date(),
  expectedNextIncomeDate: z.iso.date(),
}).superRefine((v,ctx)=>{ if(v.expectedNextIncomeDate < v.startDate) ctx.addIssue({code:'custom',path:['expectedNextIncomeDate'],message:'تاريخ الدخل القادم يجب ألا يسبق بداية الدورة'}); });
export type CreateCycleInput = z.infer<typeof createCycleSchema>;
