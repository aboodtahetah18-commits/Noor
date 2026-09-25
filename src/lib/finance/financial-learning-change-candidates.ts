import type { FinancialLearningProfile, FinancialLearningProposal } from '@/lib/finance/financial-continuous-learning-engine';

export type FinancialLearningChangeCandidateStatus=
  |'ELIGIBLE_FOR_REVIEW'
  |'BACKTEST_FAILED'
  |'REVIEW_ONLY'
  |'INSUFFICIENT_DATA';

export type FinancialLearningChangeCandidate={
  key:string;
  title:string;
  kind:FinancialLearningProposal['kind'];
  parameterKey:string|null;
  currentValue:number|null;
  proposedValue:number|null;
  deltaPercent:number|null;
  confidence:number;
  status:FinancialLearningChangeCandidateStatus;
  ownerBank:'hilal'|'solvency'|'assets'|'central';
  reviewer:'لجنة المراجعة والمخاطر والتعلم';
  before:{
    meanAbsoluteErrorPercent:number|null;
  };
  after:{
    meanAbsoluteErrorPercent:number|null;
  };
  improvementPercent:number|null;
  worstCycleDegradationPercent:number|null;
  evidence:string[];
  safeguards:{
    autoApply:false;
    hardRuleChange:false;
    requiresReview:true;
    requiresBacktestPass:boolean;
  };
};

const parameterMap:Record<FinancialLearningProposal['kind'],{
  parameterKey:string|null;
  ownerBank:FinancialLearningChangeCandidate['ownerBank'];
}>={
  EXPENSE_BASELINE:{parameterKey:'forecast.expenseBaselineFactor',ownerBank:'hilal'},
  SAVING_EXPECTATION:{parameterKey:'forecast.savingExpectationFactor',ownerBank:'solvency'},
  INCOME_REALIZATION:{parameterKey:'forecast.incomeRealizationFactor',ownerBank:'hilal'},
  FORECAST_CALIBRATION:{parameterKey:null,ownerBank:'central'},
};

function statusForProposal(proposal:FinancialLearningProposal):FinancialLearningChangeCandidateStatus{
  if(proposal.backtest.status==='PASSED'&&proposal.proposedAdjustment!==null)return 'ELIGIBLE_FOR_REVIEW';
  if(proposal.backtest.status==='FAILED')return 'BACKTEST_FAILED';
  if(proposal.backtest.status==='INSUFFICIENT_DATA')return 'INSUFFICIENT_DATA';
  return 'REVIEW_ONLY';
}

export function buildFinancialLearningChangeCandidates(
  profile:FinancialLearningProfile,
):FinancialLearningChangeCandidate[]{
  return profile.proposals.map(proposal=>{
    const mapping=parameterMap[proposal.kind];
    const proposedValue=proposal.proposedAdjustment;
    return {
      key:proposal.key,
      title:proposal.title,
      kind:proposal.kind,
      parameterKey:mapping.parameterKey,
      currentValue:proposedValue===null?null:1,
      proposedValue,
      deltaPercent:proposedValue===null?null:(proposedValue-1)*100,
      confidence:proposal.confidence,
      status:statusForProposal(proposal),
      ownerBank:mapping.ownerBank,
      reviewer:'لجنة المراجعة والمخاطر والتعلم',
      before:{
        meanAbsoluteErrorPercent:proposal.backtest.baselineMaePercent,
      },
      after:{
        meanAbsoluteErrorPercent:proposal.backtest.candidateMaePercent,
      },
      improvementPercent:proposal.backtest.improvementPercent,
      worstCycleDegradationPercent:proposal.backtest.worstCycleDegradationPercent,
      evidence:proposal.evidence,
      safeguards:{
        autoApply:false,
        hardRuleChange:false,
        requiresReview:true,
        requiresBacktestPass:proposal.proposedAdjustment!==null,
      },
    };
  });
}

export function reviewEligibleFinancialLearningCandidates(profile:FinancialLearningProfile){
  return buildFinancialLearningChangeCandidates(profile)
    .filter(candidate=>candidate.status==='ELIGIBLE_FOR_REVIEW')
    .sort((a,b)=>b.confidence-a.confidence);
}
