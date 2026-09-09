import { z } from 'zod';
import { ALLOCATION_TYPES } from '@/domain/types';
import { financialPlanRepository } from '@/repositories/financial-plan-repository';

const schema = z.object({
  cycleId: z.string().uuid('الدورة غير صالحة'),
  items: z.array(z.object({
    name: z.string().trim().min(1, 'اسم البند مطلوب').max(120, 'اسم البند طويل'),
    allocationType: z.enum(ALLOCATION_TYPES),
    plannedAmount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'المبلغ غير صالح').refine((v) => Number(v) >= 0, 'المبلغ يجب ألا يكون سالبًا'),
    recurrenceKind: z.enum(['MONTHLY','EVERY_N_CYCLES','ONE_TIME','SEASONAL']),
    intervalCycles: z.coerce.number().int().min(1).max(24),
    startCycleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    note: z.string().max(240).optional().default(''),
  })).min(1, 'أضف بندًا واحدًا على الأقل'),
}).superRefine((value, ctx) => {
  const names = new Set<string>();
  value.items.forEach((item, index) => {
    const key = item.name.trim().toLocaleLowerCase('ar');
    if (names.has(key)) ctx.addIssue({ code: 'custom', message: 'لا تكرر نفس البند داخل الخطة', path: ['items', index, 'name'] });
    names.add(key);
  });
});

export async function createManualOnboardingPlan(userId:string,input:unknown){
  const parsed=schema.safeParse(input);
  if(!parsed.success)return{success:false as const,message:parsed.error.issues[0]?.message??'الخطة غير صالحة'};
  try{return{success:true as const,planId:await financialPlanRepository.createDraftWithManualCategories(userId,parsed.data.cycleId,parsed.data.items)}}
  catch(e){const m=e instanceof Error?e.message:'';return{success:false as const,message:m==='CYCLE_NOT_FOUND'?'الدورة المالية غير متاحة':'تعذر إنشاء الخطة اليدوية'}}
}
