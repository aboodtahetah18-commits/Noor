import { describe, expect, it } from 'vitest';
import { buildGovernanceOversightDashboard } from '@/lib/governance/governance-oversight-dashboard';

describe('governance oversight dashboard',()=>{
  it('groups open decision followups without inventing lateness',()=>{
    const dashboard=buildGovernanceOversightDashboard({
      now:new Date('2026-09-20T12:00:00Z'),
      escalations:[],
      registry:{
        generatedAt:'2026-09-20T12:00:00Z',
        total:1,
        openFollowupCount:3,
        sourceOfTruth:'APPEND_ONLY_DECISION_MESSAGES',
        externalExecution:false,
        decisions:[{
          registryId:'REG-1',decisionType:'ALLOCATION',sourceMessageId:'m1',sourceDecisionId:'d1',decidedAt:'2026-09-19T00:00:00Z',
          status:'FOLLOWUP_PENDING',title:'اعتماد توزيع الدورة',rationale:null,cycleId:'c1',planId:'p1',planVersionId:'v1',previousPlanVersionId:null,
          externalExecution:false,metadata:{},
          followups:[
            {followupId:'f1',title:'بانتظار المستخدم',status:'WAITING_USER',assignedTo:null,completed:false},
            {followupId:'f2',title:'متأخرة',status:'IN_PROGRESS',assignedTo:'مسؤول',completed:false,dueDate:'2026-09-19',reminderLeadDays:null},
            {followupId:'f3',title:'قريبة',status:'ASSIGNED',assignedTo:'مسؤول',completed:false,dueDate:'2026-09-22',reminderLeadDays:3},
          ],
        }],
      },
    });
    expect(dashboard.openDecisions).toBe(1);
    expect(dashboard.waitingUser).toHaveLength(1);
    expect(dashboard.unassigned).toHaveLength(1);
    expect(dashboard.overdueFollowups).toHaveLength(1);
    expect(dashboard.dueSoon).toHaveLength(1);
    expect(dashboard.policies.noAutomaticEscalation).toBe(true);
  });

  it('carries compact followup history into the card model',()=>{
    const dashboard=buildGovernanceOversightDashboard({
      now:new Date('2026-09-20T12:00:00Z'),
      escalations:[],
      histories:{'REG-1:f1':[{
        eventId:'e1',eventType:'ASSIGNED',label:'تم إسناد المتابعة',detail:'إلى مسؤول الأهداف',
        actorKey:'central-secretary',actorName:'أمين السر المركزي',createdAt:'2026-09-20T10:00:00Z',
      }]},
      registry:{
        generatedAt:'x',total:1,openFollowupCount:1,sourceOfTruth:'APPEND_ONLY_DECISION_MESSAGES',externalExecution:false,
        decisions:[{
          registryId:'REG-1',decisionType:'ALLOCATION',sourceMessageId:'m1',sourceDecisionId:'d1',decidedAt:'x',
          status:'FOLLOWUP_PENDING',title:'قرار',rationale:null,cycleId:null,planId:null,planVersionId:null,previousPlanVersionId:null,metadata:{},externalExecution:false,
          followups:[{followupId:'f1',title:'متابعة',status:'ASSIGNED',assignedTo:'مسؤول الأهداف',completed:false}],
        }],
      },
    });
    expect(dashboard.allOpenFollowups[0].history[0]).toMatchObject({eventType:'ASSIGNED',actorName:'أمين السر المركزي'});
  });

  it('does not mark undated followups overdue',()=>{
    const dashboard=buildGovernanceOversightDashboard({
      now:new Date('2026-09-20T12:00:00Z'),escalations:[],
      registry:{
        generatedAt:'x',total:1,openFollowupCount:1,sourceOfTruth:'APPEND_ONLY_DECISION_MESSAGES',externalExecution:false,
        decisions:[{
          registryId:'REG-1',decisionType:'PLAN_DEVIATION',sourceMessageId:'m1',sourceDecisionId:'d1',decidedAt:'x',
          status:'FOLLOWUP_PENDING',title:'قرار',rationale:null,cycleId:null,planId:null,planVersionId:null,previousPlanVersionId:null,metadata:{},externalExecution:false,
          followups:[{followupId:'f1',title:'بلا موعد',status:'OPEN',assignedTo:null,completed:false}],
        }],
      },
    });
    expect(dashboard.overdueFollowups).toEqual([]);
    expect(dashboard.allOpenFollowups[0].timingState).toBe('NO_DUE_DATE');
  });
});
