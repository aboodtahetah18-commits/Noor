import { describe, expect, it } from 'vitest';
import { buildOversightQuickActions, parseOversightQuickActionCommand } from '@/lib/governance/governance-oversight-actions';

describe('governance oversight quick actions',()=>{
  it('parses quick followup and decision context commands',()=>{
    expect(parseOversightQuickActionCommand('فتح المتابعة 2')).toEqual({kind:'OPEN_FOLLOWUP',followupNumber:2});
    expect(parseOversightQuickActionCommand('عرض سياق القرار للمتابعة 2')).toEqual({kind:'OPEN_DECISION_CONTEXT',followupNumber:2});
    expect(parseOversightQuickActionCommand('طلب بيانات المتابعة 2: كشف الحساب')).toEqual({kind:'REQUEST_USER_DATA',followupNumber:2,request:'كشف الحساب'});
  });

  it('offers escalation only when eligibility is already established',()=>{
    const normal=buildOversightQuickActions({followupNumber:1,status:'OPEN',assignedTo:null,timingState:'ON_TIME',escalationEligible:false});
    expect(normal.some(item=>item.key==='ESCALATE')).toBe(false);
    const overdue=buildOversightQuickActions({followupNumber:1,status:'IN_PROGRESS',assignedTo:'مسؤول',timingState:'OVERDUE',escalationEligible:true});
    expect(overdue.some(item=>item.key==='ESCALATE')).toBe(true);
  });

  it('marks escalation and completion as confirmation-required',()=>{
    const actions=buildOversightQuickActions({followupNumber:4,status:'IN_PROGRESS',assignedTo:'مسؤول',timingState:'OVERDUE',escalationEligible:true});
    const escalation=actions.find(item=>item.key==='ESCALATE');
    const completion=actions.find(item=>item.key==='COMPLETE');
    expect(escalation).toMatchObject({requires_confirmation:true,confirmation_confirm_label:'تأكيد التصعيد'});
    expect(completion).toMatchObject({requires_confirmation:true,confirmation_confirm_label:'تأكيد الإغلاق'});
  });
});
