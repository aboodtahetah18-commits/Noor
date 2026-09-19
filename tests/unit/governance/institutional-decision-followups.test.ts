import { describe, expect, it } from 'vitest';
import { parseDecisionFollowupCommand } from '@/lib/governance/institutional-decision-followups';

describe('institutional decision followup lifecycle commands',()=>{
  it('parses explicit assignment and lifecycle commands',()=>{
    expect(parseDecisionFollowupCommand('إسناد المتابعة 2 إلى مسؤول الأهداف')).toEqual({kind:'ASSIGN',followupNumber:2,assignedTo:'مسؤول الأهداف'});
    expect(parseDecisionFollowupCommand('بدء المتابعة 1')).toEqual({kind:'STATUS',followupNumber:1,status:'IN_PROGRESS',note:null});
    expect(parseDecisionFollowupCommand('المتابعة 3 بانتظار المستخدم')).toEqual({kind:'STATUS',followupNumber:3,status:'WAITING_USER',note:null});
    expect(parseDecisionFollowupCommand('إكمال المتابعة 4: تم التحقق')).toEqual({kind:'STATUS',followupNumber:4,status:'COMPLETED',note:'تم التحقق'});
  });

  it('does not treat general approval language as a followup update',()=>{
    expect(parseDecisionFollowupCommand('تمام')).toBeNull();
    expect(parseDecisionFollowupCommand('موافق')).toBeNull();
  });
});
