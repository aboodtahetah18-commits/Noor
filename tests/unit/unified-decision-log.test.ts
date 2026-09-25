import { describe, expect, it } from 'vitest';
import {
  mapBankDecisionToUnified,
  mapConversationDecisionToUnified,
} from '../../src/features/decision-log/queries/list-unified-decision-log';

describe('سجل القرارات الموحد',()=>{
  it('يوحد قرارًا بنكيًا قديمًا داخل البنية الجديدة',()=>{
    const item=mapBankDecisionToUnified({
      id:'b1',
      eventType:'ROW_CONFIRM',
      sourceType:'USER',
      affectedCount:1,
      affectedAmount:'250.00',
      beforeState:null,
      afterState:null,
      impactSummary:{posted:true},
      reason:'تأكيد العملية',
      createdAt:'2026-09-25T10:00:00.000Z',
      merchantName:'متجر',
      rowDescription:null,
      importName:null,
    });
    expect(item.source).toBe('BANK_OPERATION');
    expect(item.decision.action).toBe('اعتماد عملية');
    expect(item.current.value).toBe('250.00');
    expect(item.externalExecution).toBe(true);
  });

  it('يستخرج الرقم والقاعدة والذاكرة والتعلم من قرار خوارزمي مفسر',()=>{
    const item=mapConversationDecisionToUnified({
      id:'m1',
      sender_key:'budget-spending-owner',
      sender_name:'مسؤول الميزانية والإنفاق',
      sender_type:'agent',
      message_kind:'recommendation',
      body:'توصية',
      created_at:'2026-09-25T11:00:00.000Z',
      structured_data:{
        role_name:'مسؤول الميزانية والإنفاق',
        external_execution:false,
        decision_explanation:{
          current:{label:'المتاح الحقيقي',value:'1500 ر.س',secondary:['استخدام الخطة 80٪']},
          rule:{code:'RULE-BUDGET-TRUE-AVAILABLE',title:'الإنفاق يبنى على المتاح الحقيقي'},
          memory:{summary:'الارتفاع السابق كان مؤقتًا',at:'2026-09-20T10:00:00.000Z'},
          learning:{
            algorithm_name:'خوارزمية خط أساس المصروفات',
            outcome:'IMPROVED',
            decision_use:'SUPPORT',
            source_cycle_ids:['c1','c2','c3'],
            confidence:84,
          },
          why:'الرقم الحالي والقاعدة يدعمان التوصية.',
        },
      },
    });
    expect(item).not.toBeNull();
    expect(item?.current.label).toBe('المتاح الحقيقي');
    expect(item?.rule.code).toBe('RULE-BUDGET-TRUE-AVAILABLE');
    expect(item?.memory.summary).toContain('مؤقتًا');
    expect(item?.learning.algorithmName).toContain('المصروفات');
    expect(item?.learning.confidence).toBe(84);
    expect(item?.externalExecution).toBe(false);
  });

  it('يميز قرار اللجنة ويحفظ حالة القرار',()=>{
    const item=mapConversationDecisionToUnified({
      id:'m2',
      sender_key:'budget-spending-owner',
      sender_name:'مسؤول الميزانية والإنفاق',
      sender_type:'agent',
      message_kind:'decision',
      body:'تم تسجيل الموافقة',
      created_at:'2026-09-25T12:00:00.000Z',
      structured_data:{
        meeting_title:'لجنة الدورة المالية والتوازن',
        committee_point_title:'تجاوز في الإنفاق',
        committee_decision:'APPROVED',
        committee_resolution_status:'APPROVED',
        external_execution:false,
      },
    });
    expect(item?.source).toBe('COMMITTEE');
    expect(item?.decision.title).toBe('تجاوز في الإنفاق');
    expect(item?.decision.status).toBe('APPROVED');
  });

  it('يتجاهل الرسالة العادية التي ليست قرارًا',()=>{
    const item=mapConversationDecisionToUnified({
      id:'m3',
      sender_key:'central-governor',
      sender_name:'المحافظ',
      sender_type:'agent',
      message_kind:'message',
      body:'رسالة عادية',
      created_at:'2026-09-25T13:00:00.000Z',
      structured_data:{},
    });
    expect(item).toBeNull();
  });
});
