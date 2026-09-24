import { describe, expect, it } from 'vitest';
import { classifyBudgetCommitteeResponse } from '../../src/lib/conversations/budget-committee-conversation-engine';

describe('محرك حوار لجنة الميزانية والإنفاق',()=>{
  it('يميز طلب التفسير عن الموافقة',()=>{
    expect(classifyBudgetCommitteeResponse('ليش تعتبر المصروف مرتفع؟')).toBe('EXPLAIN');
    expect(classifyBudgetCommitteeResponse('موافق')).toBe('APPROVE');
  });

  it('يفهم التفسير المؤقت كسياق لا كاتجاه دائم',()=>{
    expect(classifyBudgetCommitteeResponse('الزيادة مؤقتة بسبب الدوام هذا الشهر')).toBe('CONTEXT');
  });

  it('يميز الرفض والانتقال للنقطة التالية',()=>{
    expect(classifyBudgetCommitteeResponse('لا أوافق')).toBe('REJECT');
    expect(classifyBudgetCommitteeResponse('النقطة التالية')).toBe('NEXT');
  });

  it('يتعرف على طلب التركيز المختصر',()=>{
    expect(classifyBudgetCommitteeResponse('ركز لي على الأهم')).toBe('FOCUS');
  });
});
