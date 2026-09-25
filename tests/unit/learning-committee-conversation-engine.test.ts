import { describe, expect, it } from 'vitest';
import { classifyLearningCommitteeResponse } from '../../src/lib/conversations/learning-committee-conversation-engine';

describe('محرك حوار لجنة المراجعة والمخاطر والتعلم',()=>{
  it('يميز إحالة المقترح للمراجعة',()=>{
    expect(classifyLearningCommitteeResponse('أرسل للمراجعة')).toBe('SUBMIT_REVIEW');
  });

  it('يميز الاعتماد والرفض',()=>{
    expect(classifyLearningCommitteeResponse('اعتمد المقترح')).toBe('APPROVE');
    expect(classifyLearningCommitteeResponse('ارفض هذا المقترح')).toBe('REJECT');
  });

  it('يميز التفعيل والتراجع',()=>{
    expect(classifyLearningCommitteeResponse('فعّل المعايرة')).toBe('ACTIVATE');
    expect(classifyLearningCommitteeResponse('تراجع عن التفعيل')).toBe('ROLLBACK');
  });

  it('يحول طلب الدليل إلى شرح بدل تنفيذ قرار',()=>{
    expect(classifyLearningCommitteeResponse('اشرح لي نتيجة الاختبار')).toBe('EXPLAIN');
  });

  it('يعامل الكلام العام كطلب حالة فقط',()=>{
    expect(classifyLearningCommitteeResponse('وش عندنا الآن؟')).toBe('STATUS');
  });
});
