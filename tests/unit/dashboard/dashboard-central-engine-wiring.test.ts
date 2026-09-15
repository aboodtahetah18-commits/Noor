import { beforeEach,describe,expect,it,vi } from 'vitest';

const {getDashboard,getCurrent,listRecommendations}=vi.hoisted(()=>({
  getDashboard:vi.fn(),
  getCurrent:vi.fn(),
  listRecommendations:vi.fn(),
}));

vi.mock('@/repositories/dashboard-repository',()=>({dashboardRepository:{get:getDashboard}}));
vi.mock('@/features/financial-engine/queries/get-current-financial-state',()=>({getCurrentFinancialState:getCurrent}));
vi.mock('@/features/financial-engine/queries/list-cycle-recommendations',()=>({listCycleRecommendations:listRecommendations}));

import { getDashboardSummary } from '@/features/dashboard/queries/get-dashboard-summary';

const userId='11111111-1111-4111-8111-111111111111';
const cycleId='22222222-2222-4222-8222-222222222222';
const base={
  cycle:{id:cycleId,name:'الدورة',status:'ACTIVE',startDate:'2026-09-01',expectedNextIncomeDate:'2026-10-01',remainingDays:10,source:'LIVE'},
  liquidity:{total:'1'},safeToSpend:{amount:'1',status:'AVAILABLE',blockingIssue:null},dailySafeLimit:{amount:'1',status:'AVAILABLE',blockingIssue:null},
  income:{expected:'1',actual:'1'},budget:{planned:'1',actual:'1',remaining:'0',utilizationPercent:'100'},saving:{planned:'0',actual:'0',rate:null},
  forecast:{projectedEndBalance:'1',expectedDeficit:'0',deficitStatus:'AVAILABLE',blockingIssue:null},upcomingObligations:[],topRecommendation:null,
  recommendationEngineStatus:'AVAILABLE',emergencySummary:null,goalSummaries:[],
};

describe('dashboard central engine wiring',()=>{
  beforeEach(()=>{getDashboard.mockReset();getCurrent.mockReset();listRecommendations.mockReset();});

  it('overrides live dashboard financial truth with the central engine snapshot',async()=>{
    getDashboard.mockResolvedValue(base);
    getCurrent.mockResolvedValue({
      cycleId,snapshotId:'s',scoreAssessmentId:'a',asOfAt:'x',actualLiquidity:'10000',verifiedIncomeReceived:'8000',expectedIncomeUnreceived:'2000',
      openObligations:'4000',reservedObligations:'4000',requiredProtection:'3000',freeCashAmount:'3000',protectionDeficit:'0',projectedEndBalance:'5000',
      projectedSurplus:'5000',projectedDeficit:'0',weightedScore:'81',finalState:'STABLE',confidenceScore:'90',dataCoverageBps:9000,recommendationReadiness:'HIGH',hardGateCode:null,
    });
    listRecommendations.mockResolvedValue([{id:'r',type:'OPPORTUNITY',status:'NEW',priority:1,title:'فائض',message:'رسالة',reasonCode:'ENGINE_FREE_CASH_AVAILABLE',reasonData:{},createdAt:'x',gateStatus:'ALLOWED',sensitivity:'SENSITIVE',gateReason:'ok',readiness:'HIGH',confidenceScore:'90',hardGateCode:null}]);
    const result=await getDashboardSummary(userId);
    expect(result?.liquidity.total).toBe('10000');
    expect(result?.safeToSpend.amount).toBe('3000');
    expect(result?.income.expected).toBe('10000.00');
    expect(result?.forecast.projectedEndBalance).toBe('5000');
    expect(result?.topRecommendation?.reasonCode).toBe('ENGINE_FREE_CASH_AVAILABLE');
  });
});
