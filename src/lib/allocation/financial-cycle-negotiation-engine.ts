import type { AllocationClaim, FinancialCycleAllocationSnapshot } from '@/lib/allocation/financial-cycle-allocation-engine';

export type NegotiationAction='HOLD'|'YIELD'|'NEEDS_EVIDENCE'|'NO_CLAIM';
export type NegotiationTurn={
  round:number;
  ownerKey:AllocationClaim['ownerKey'];
  ownerName:string;
  action:NegotiationAction;
  beforeAmount:number|null;
  afterAmount:number|null;
  reduction:number;
  reason:string;
  residualGapAfter:number|null;
};
export type NegotiationResult={
  status:'BALANCED_DRAFT'|'UNRESOLVED_CONFLICT'|'NEEDS_EVIDENCE'|'NO_INCOME';
  availableIncome:number|null;
  requestedBefore:number;
  requestedAfter:number;
  remainingGap:number|null;
  turns:NegotiationTurn[];
  draftAllocations:Array<{ownerKey:AllocationClaim['ownerKey'];ownerName:string;amount:number|null;source:'REQUESTED'|'YIELDED'|'UNRESOLVED'}>;
  unresolvedOwners:string[];
  requiresUserRatification:true;
  autoExecution:false;
};

const FLEX_ORDER:AllocationClaim['ownerKey'][]=[
  'investment-owner',
  'goals-owner',
  'budget-spending-owner',
  'liquidity-protection-owner',
  'obligations-owner',
];

function sumKnown(claims:AllocationClaim[]){
  return claims.reduce((sum,claim)=>sum+(claim.requestedAmount??0),0);
}

export function negotiateAllocationClaims(snapshot:FinancialCycleAllocationSnapshot,claims:AllocationClaim[]):NegotiationResult{
  const income=snapshot.availableIncome;
  const unknown=claims.filter(c=>c.requestedAmount===null);
  const before=sumKnown(claims);
  if(income===null){
    return {
      status:'NO_INCOME',availableIncome:null,requestedBefore:before,requestedAfter:before,remainingGap:null,
      turns:unknown.map((c,index)=>({round:index+1,ownerKey:c.ownerKey,ownerName:c.ownerName,action:'NEEDS_EVIDENCE',beforeAmount:null,afterAmount:null,reduction:0,reason:c.missingEvidence.join('، ')||'الدخل المتاح غير مثبت.',residualGapAfter:null})),
      draftAllocations:claims.map(c=>({ownerKey:c.ownerKey,ownerName:c.ownerName,amount:c.requestedAmount,source:'UNRESOLVED'})),
      unresolvedOwners:claims.map(c=>c.ownerName),requiresUserRatification:true,autoExecution:false,
    };
  }

  let gap=Math.max(0,before-income);
  const amounts=new Map(claims.map(c=>[c.ownerKey,c.requestedAmount] as const));
  const turns:NegotiationTurn[]=[];
  let round=0;

  for(const key of FLEX_ORDER){
    const claim=claims.find(c=>c.ownerKey===key);
    if(!claim) continue;
    round+=1;

    if(claim.requestedAmount===null){
      turns.push({round,ownerKey:key,ownerName:claim.ownerName,action:'NEEDS_EVIDENCE',beforeAmount:null,afterAmount:null,reduction:0,reason:claim.missingEvidence.join('، ')||'لا توجد بيانات كافية لتحديد المطالبة.',residualGapAfter:gap});
      continue;
    }
    if(claim.requestedAmount<=0){
      turns.push({round,ownerKey:key,ownerName:claim.ownerName,action:'NO_CLAIM',beforeAmount:claim.requestedAmount,afterAmount:claim.requestedAmount,reduction:0,reason:'لا توجد مطالبة مالية موجبة في هذه الدورة.',residualGapAfter:gap});
      continue;
    }
    if(gap<=0){
      turns.push({round,ownerKey:key,ownerName:claim.ownerName,action:'HOLD',beforeAmount:claim.requestedAmount,afterAmount:claim.requestedAmount,reduction:0,reason:'لا يوجد عجز معروف يتطلب خفض المطالبة الحالية.',residualGapAfter:0});
      continue;
    }

    const minimum=claim.minimumAmount;
    if(minimum===null){
      turns.push({round,ownerKey:key,ownerName:claim.ownerName,action:'NEEDS_EVIDENCE',beforeAmount:claim.requestedAmount,afterAmount:claim.requestedAmount,reduction:0,reason:'لا يوجد حد أدنى مثبت يسمح بخفض آلي دون قرار إضافي.',residualGapAfter:gap});
      continue;
    }

    const flexible=Math.max(0,claim.requestedAmount-minimum);
    if(flexible<=0){
      turns.push({round,ownerKey:key,ownerName:claim.ownerName,action:'HOLD',beforeAmount:claim.requestedAmount,afterAmount:claim.requestedAmount,reduction:0,reason:'المطالبة الحالية عند الحد الأدنى المثبت، لذلك لا أخفضها آليًا.',residualGapAfter:gap});
      continue;
    }

    const reduction=Math.min(gap,flexible);
    const after=claim.requestedAmount-reduction;
    amounts.set(key,after);
    gap=Math.max(0,gap-reduction);
    turns.push({round,ownerKey:key,ownerName:claim.ownerName,action:'YIELD',beforeAmount:claim.requestedAmount,afterAmount:after,reduction,reason:'تم التنازل فقط داخل الهامش المثبت بين المطلوب والحد الأدنى؛ لم يُكسر حد محمي ولم تُفترض نسبة جديدة.',residualGapAfter:gap});
  }

  const after=Array.from(amounts.values()).reduce<number>((sum,value)=>sum+(value??0),0);
  const unresolvedOwners=[
    ...unknown.map(c=>c.ownerName),
    ...(gap>0?claims.filter(c=>c.requestedAmount!==null&&c.requestedAmount>0&&((c.minimumAmount??c.requestedAmount)>=c.requestedAmount)).map(c=>c.ownerName):[]),
  ];
  const status=unknown.length>0
    ? 'NEEDS_EVIDENCE'
    : gap>0
      ? 'UNRESOLVED_CONFLICT'
      : 'BALANCED_DRAFT';

  return {
    status,availableIncome:income,requestedBefore:before,requestedAfter:after,remainingGap:gap,turns,
    draftAllocations:claims.map(c=>({
      ownerKey:c.ownerKey,ownerName:c.ownerName,amount:amounts.get(c.ownerKey)??null,
      source:c.requestedAmount===null?'UNRESOLVED':(amounts.get(c.ownerKey)===c.requestedAmount?'REQUESTED':'YIELDED'),
    })),
    unresolvedOwners:[...new Set(unresolvedOwners)],
    requiresUserRatification:true,
    autoExecution:false,
  };
}
