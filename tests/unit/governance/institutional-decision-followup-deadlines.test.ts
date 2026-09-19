import { describe, expect, it } from 'vitest';
import { evaluateFollowupTiming, parseFollowupDeadlineCommand } from '@/lib/governance/institutional-decision-followup-deadlines';

describe('institutional decision followup deadlines',()=>{
  it('does not label a followup due soon without an explicit reminder lead',()=>{
    const result=evaluateFollowupTiming({now:new Date('2026-09-20T12:00:00Z'),dueDate:'2026-09-22',reminderLeadDays:null,completed:false});
    expect(result).toMatchObject({state:'ON_TIME',daysUntilDue:2,escalationEligible:false});
  });

  it('uses an explicit reminder lead for due soon and due date for overdue',()=>{
    expect(evaluateFollowupTiming({now:new Date('2026-09-20T12:00:00Z'),dueDate:'2026-09-22',reminderLeadDays:3,completed:false}).state).toBe('DUE_SOON');
    expect(evaluateFollowupTiming({now:new Date('2026-09-23T12:00:00Z'),dueDate:'2026-09-22',reminderLeadDays:3,completed:false})).toMatchObject({state:'OVERDUE',escalationEligible:true});
  });

  it('parses explicit deadline and escalation commands',()=>{
    expect(parseFollowupDeadlineCommand('موعد المتابعة 2 2026-10-01')).toEqual({kind:'SET_DUE_DATE',followupNumber:2,dueDate:'2026-10-01'});
    expect(parseFollowupDeadlineCommand('تنبيه المتابعة 2 قبل 3 أيام')).toEqual({kind:'SET_REMINDER_LEAD',followupNumber:2,leadDays:3});
    expect(parseFollowupDeadlineCommand('تصعيد المتابعة 2 إلى المحافظ')).toEqual({kind:'ESCALATE',followupNumber:2,target:'GOVERNOR'});
  });
});
