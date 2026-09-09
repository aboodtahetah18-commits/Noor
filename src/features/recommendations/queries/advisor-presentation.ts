import type { RecommendationRecord, RecommendationReasonCode } from '@/features/recommendations/types/recommendation';
import type { AdvisorRelatedEntity, AdvisorSuggestedAction } from '@/features/recommendations/types/advisor';

const money = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? `${n.toLocaleString('ar-SA-u-nu-latn', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س` : '—';
};

export function supportingSummary(rec: RecommendationRecord): string {
  const d = rec.reasonData;
  switch (rec.reasonCode) {
    case 'OBLIGATION_OVERDUE': return `قيمة الالتزام ${money(d.amount)}، وتاريخ الاستحقاق ${String(d.dueDate ?? 'غير محدد')}.`;
    case 'OBLIGATION_UPCOMING': return `مبلغ محجوز ${money(d.amount)} قبل الاستحقاق بتاريخ ${String(d.dueDate ?? 'غير محدد')}.`;
    case 'GOAL_UNREALISTIC': return `قيمة الهدف ${money(d.targetAmount)}، والتاريخ المستهدف ${String(d.targetDate ?? 'غير محدد')}.`;
    case 'SURPLUS_AVAILABLE': return `المتوقع ${money(d.expected)}، الفعلي ${money(d.actual)}، والفائض ${money(d.surplus)}.`;
    case 'OVER_BUDGET': return `المخطط ${money(d.planned)} مقابل فعلي ${money(d.actual)}.`;
    case 'DEFICIT_RISK': return 'خطر العجز يعتمد على توقع مالي معتمد قبل عرض أرقام تفصيلية.';
    case 'SAFE_TO_SPEND_ZERO': return 'قيمة المتاح الآمن للصرف تعتمد على قاعدة الاحتياطي المالي المعتمدة.';
  }
}

export function whyText(reasonCode: RecommendationReasonCode, reasonData: Record<string, unknown>): string {
  switch (reasonCode) {
    case 'OBLIGATION_OVERDUE': return `ظهرت لأن هناك التزامًا غير مسدد تجاوز تاريخ استحقاقه. المبلغ المسجل هو ${money(reasonData.amount)} وتاريخ الاستحقاق ${String(reasonData.dueDate ?? 'غير محدد')}.`;
    case 'OBLIGATION_UPCOMING': return `ظهرت لأن هناك التزامًا قادمًا ما زال غير مسدد ويجب إبقاء مبلغه محجوزًا قبل تاريخ الاستحقاق ${String(reasonData.dueDate ?? 'غير محدد')}.`;
    case 'GOAL_UNREALISTIC': return 'ظهرت لأن الهدف مصنف حاليًا غير واقعي ماليًا وفق مقارنة المساهمة المطلوبة بالقدرة المالية المعروفة. لم يغيّر النظام الهدف تلقائيًا.';
    case 'SURPLUS_AVAILABLE': return `ظهرت لأن الدخل الفعلي أعلى من المتوقع بمقدار ${money(reasonData.surplus)}. لم يتم تحويل الفائض تلقائيًا إلى مصروف مرن أو ادخار.`;
    case 'OVER_BUDGET': return `ظهرت لأن المصروف الفعلي للبند (${money(reasonData.actual)}) تجاوز المبلغ المخطط (${money(reasonData.planned)}).`;
    case 'DEFICIT_RISK': return 'هذه القاعدة تبقى محجوبة حتى اعتماد معادلة التوقع المالي؛ لا يعرض النظام توقع عجز غير معتمد.';
    case 'SAFE_TO_SPEND_ZERO': return 'هذه القاعدة تبقى محجوبة حتى اعتماد الاحتياطي المالي المطلوب؛ لا يعرض النظام قيمة غير معتمدة للمتاح الآمن للصرف.';
  }
}

export function suggestedActions(rec: RecommendationRecord): AdvisorSuggestedAction[] {
  switch (rec.reasonCode) {
    case 'OBLIGATION_OVERDUE':
    case 'OBLIGATION_UPCOMING':
      return [{ code:'OPEN_OBLIGATIONS', label:'فتح الالتزامات', href:'/obligations', description:'راجع الالتزام ثم قرر السداد أو الإجراء المناسب بنفسك.' }];
    case 'GOAL_UNREALISTIC':
      return [{ code:'OPEN_GOAL_EDIT', label:'مراجعة الهدف', href:rec.relatedGoalId ? `/goals/${rec.relatedGoalId}` : '/goals', description:'راجع قيمة الهدف أو التاريخ أو القدرة المتاحة. لن يعدل النظام الهدف تلقائيًا.' }];
    case 'SURPLUS_AVAILABLE':
      return [
        { code:'OPEN_SAVING_TRANSFER', label:'مراجعة الادخار', href:'/savings/transfer', description:'يمكنك اختيار تحويل جزء من الفائض إلى الادخار إذا كان ذلك مناسبًا.' },
        { code:'OPEN_PLAN_REVISION', label:'مراجعة الخطة', href:'/budget/revise', description:'يمكنك إنشاء نسخة تعديل للخطة بدل تغيير النسخة المعتمدة مباشرة.' },
      ];
    case 'OVER_BUDGET':
    case 'DEFICIT_RISK':
    case 'SAFE_TO_SPEND_ZERO':
      return [{ code:'OPEN_PLAN_REVISION', label:'مراجعة الخطة', href:'/budget/revise', description:'راجع الخطة وأنشئ نسخة تعديل إذا قررت تغيير التخصيصات.' }];
  }
}

export function relatedEntity(rec: RecommendationRecord, label: string | null): AdvisorRelatedEntity {
  if (rec.relatedCategoryId) return { kind:'CATEGORY', id:rec.relatedCategoryId, label };
  if (rec.relatedGoalId) return { kind:'GOAL', id:rec.relatedGoalId, label };
  if (rec.relatedObligationOccurrenceId) return { kind:'OBLIGATION', id:rec.relatedObligationOccurrenceId, label };
  if (rec.cycleId) return { kind:'CYCLE', id:rec.cycleId, label };
  return { kind:'NONE', id:null, label:null };
}
