import { Money } from '@/financial-engine/money';
import { rawSql } from '@/infrastructure/db/client';

type TimelineStatus = 'RESERVED_READY'|'PROJECTED_READY'|'PROJECTED_SHORTFALL'|'MISSING_TARGET'|'MISSING_DATE';

export type GoalTripFundingTimelineItem = {
  eventId: string;
  title: string;
  destinationCity: string | null;
  startsAt: string | null;
  targetAmount: string | null;
  reservedAmount: string;
  gapAfterReservation: string | null;
  contributionOpportunities: number | null;
  projectedAvailableAtDeadline: string | null;
  projectedShortfall: string | null;
  projectedPoolAfterDeadline: string | null;
  status: TimelineStatus;
};

export type GoalTripFundingTimeline = {
  goalId: string;
  goalFundingBalance: string;
  reservedAcrossTrips: string;
  unassignedCurrentFunding: string;
  currentApprovedContributionPerCycle: string | null;
  requiredUniformContributionPerCycle: string | null;
  periodicFundingCannotResolveImmediateShortfall: boolean;
  additionalContributionPerCycleNeeded: string | null;
  allDatedTripsFundableAtCurrentPace: boolean;
  firstShortfall: {eventId:string; title:string; startsAt:string; amount:string}|null;
  items: GoalTripFundingTimelineItem[];
  missingTargetCount: number;
  missingDateCount: number;
  projectionBasis: 'ACTIVE_CYCLE_APPROVED_CONTRIBUTION'|'NO_ACTIVE_CONTRIBUTION_PLAN';
};

function maxZero(value: Money){ return value.isNegative()?Money.zero():value; }
function ceilDivMoney(value: Money, divisor: number){
  if(divisor<=0) return null;
  const d=BigInt(divisor);
  return Money.fromMinorUnits((value.minorUnits+d-1n)/d);
}

/** Calendar-month progression anchored to the active cycle's next income date. */
function addOneMonthClamped(date: Date, anchorDay: number): Date {
  const year=date.getUTCFullYear();
  const month=date.getUTCMonth()+1;
  const first=new Date(Date.UTC(year,month,1));
  const lastDay=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth(),Math.min(anchorDay,lastDay)));
}

function contributionOpportunities(deadline: Date, nextIncomeDate: Date|null): number {
  const now=new Date();
  if(deadline.getTime()<=now.getTime()) return 0;
  // The current active cycle remains one possible funding window.
  let count=1;
  if(!nextIncomeDate) return count;
  const anchor=nextIncomeDate.getUTCDate();
  let cursor=nextIncomeDate;
  while(cursor.getTime()<deadline.getTime()){
    count++;
    cursor=addOneMonthClamped(cursor,anchor);
    if(count>240) break;
  }
  return count;
}

export async function getGoalTripFundingTimeline(userId:string,goalId:string):Promise<GoalTripFundingTimeline|null>{
  const goalRows=await rawSql`select g.id,g.opening_balance::text as "openingBalance",
      coalesce(sum(t.amount) filter(where t.transaction_type='GOAL_CONTRIBUTION' and t.status='POSTED'),0)::text as "contributions"
    from public.financial_goals g
    left join public.transactions t on t.goal_id=g.id and t.user_id=g.user_id
    where g.user_id=${userId} and g.id=${goalId}::uuid
    group by g.id limit 1`;
  const goal=goalRows[0] as {id:string;openingBalance:string;contributions:string}|undefined;
  if(!goal)return null;

  const cycleRows=await rawSql`select c.id,c.expected_next_income_date::text as "nextIncomeDate",
      gcc.approved_amount::text as "approvedAmount",gcc.status as "commitmentStatus"
    from public.financial_cycles c
    left join public.goal_cycle_commitments gcc on gcc.user_id=c.user_id and gcc.cycle_id=c.id and gcc.goal_id=${goalId}::uuid and gcc.status in ('APPROVED','FUNDED')
    where c.user_id=${userId} and c.status='ACTIVE'
    order by c.start_date desc limit 1`;
  const cycle=cycleRows[0] as {id:string;nextIncomeDate:string;approvedAmount:string|null;commitmentStatus:string|null}|undefined;
  const approvedPerCycle=cycle?.approvedAmount?Money.parse(cycle.approvedAmount):null;
  const nextIncomeDate=cycle?.nextIncomeDate?new Date(`${cycle.nextIncomeDate}T00:00:00Z`):null;

  const eventRows=await rawSql`select e.id,e.title,e.destination_city as "destinationCity",e.starts_at as "startsAt",e.planned_amount::text as "plannedAmount",
      coalesce(r.reserved_amount,0)::text as "reservedAmount"
    from public.goal_events e
    left join public.goal_event_funding_reservations r on r.user_id=e.user_id and r.goal_event_id=e.id and r.status='ACTIVE'
    where e.user_id=${userId} and e.goal_id=${goalId}::uuid and e.event_type='TRIP' and e.status in ('PLANNED','ACTIVE')
    order by e.starts_at nulls last,e.created_at`;

  const goalBalance=Money.parse(goal.openingBalance).add(Money.parse(goal.contributions));
  const totalReserved=(eventRows as Array<{reservedAmount:string}>).reduce((sum,row)=>sum.add(Money.parse(row.reservedAmount)),Money.zero());
  const unassigned=maxZero(goalBalance.subtract(totalReserved));

  type Base={eventId:string;title:string;destinationCity:string|null;startsAt:string|null;target:Money|null;reserved:Money;gap:Money|null;opportunities:number|null};
  const bases:Base[]=(eventRows as Array<{id:string;title:string;destinationCity:string|null;startsAt:Date|string|null;plannedAmount:string|null;reservedAmount:string}>).map(row=>{
    const starts=row.startsAt?new Date(row.startsAt):null;
    const target=row.plannedAmount?Money.parse(row.plannedAmount):null;
    const reserved=Money.parse(row.reservedAmount);
    return {eventId:String(row.id),title:String(row.title),destinationCity:row.destinationCity?String(row.destinationCity):null,startsAt:starts?starts.toISOString():null,target,reserved,gap:target?maxZero(target.subtract(reserved)):null,opportunities:starts?contributionOpportunities(starts,nextIncomeDate):null};
  });

  // Minimum uniform per-cycle contribution needed to satisfy every dated target in chronological order.
  let cumulativeGap=Money.zero();
  let requiredUniform=Money.zero();
  let periodicFundingCannotResolveImmediateShortfall=false;
  for(const b of bases.filter(x=>x.startsAt&&x.target).sort((a,b)=>String(a.startsAt).localeCompare(String(b.startsAt)))){
    cumulativeGap=cumulativeGap.add(b.gap??Money.zero());
    const uncovered=maxZero(cumulativeGap.subtract(unassigned));
    if(uncovered.isPositive()&&(b.opportunities??0)===0)periodicFundingCannotResolveImmediateShortfall=true;
    const required=ceilDivMoney(uncovered,b.opportunities??0);
    if(required&&required.compare(requiredUniform)>0)requiredUniform=required;
  }

  // Projection at the currently approved contribution level. This is analytical only; it creates no reservation or transaction.
  let consumedForEarlierTrips=Money.zero();
  const items:GoalTripFundingTimelineItem[]=[];
  let firstShortfall:GoalTripFundingTimeline['firstShortfall']=null;
  let missingTargetCount=0,missingDateCount=0;
  const currentRate=approvedPerCycle??Money.zero();

  for(const b of bases){
    if(!b.target){missingTargetCount++;items.push({eventId:b.eventId,title:b.title,destinationCity:b.destinationCity,startsAt:b.startsAt,targetAmount:null,reservedAmount:b.reserved.toString(),gapAfterReservation:null,contributionOpportunities:b.opportunities,projectedAvailableAtDeadline:null,projectedShortfall:null,projectedPoolAfterDeadline:null,status:'MISSING_TARGET'});continue;}
    if(!b.startsAt){missingDateCount++;items.push({eventId:b.eventId,title:b.title,destinationCity:b.destinationCity,startsAt:null,targetAmount:b.target.toString(),reservedAmount:b.reserved.toString(),gapAfterReservation:b.gap?.toString()??'0.00',contributionOpportunities:null,projectedAvailableAtDeadline:null,projectedShortfall:null,projectedPoolAfterDeadline:null,status:'MISSING_DATE'});continue;}
    const opportunities=b.opportunities??0;
    const projectedContrib=Money.fromMinorUnits(currentRate.minorUnits*BigInt(opportunities));
    const availableAtDeadline=maxZero(unassigned.add(projectedContrib).subtract(consumedForEarlierTrips));
    const gap=b.gap??Money.zero();
    const shortfall=maxZero(gap.subtract(availableAtDeadline));
    const consumed=gap.min(availableAtDeadline);
    consumedForEarlierTrips=consumedForEarlierTrips.add(consumed);
    const after=maxZero(availableAtDeadline.subtract(gap));
    let status:TimelineStatus='PROJECTED_READY';
    if(gap.isZero())status='RESERVED_READY';
    else if(shortfall.isPositive())status='PROJECTED_SHORTFALL';
    if(status==='PROJECTED_SHORTFALL'&&!firstShortfall)firstShortfall={eventId:b.eventId,title:b.title,startsAt:b.startsAt,amount:shortfall.toString()};
    items.push({eventId:b.eventId,title:b.title,destinationCity:b.destinationCity,startsAt:b.startsAt,targetAmount:b.target.toString(),reservedAmount:b.reserved.toString(),gapAfterReservation:gap.toString(),contributionOpportunities:opportunities,projectedAvailableAtDeadline:availableAtDeadline.toString(),projectedShortfall:shortfall.toString(),projectedPoolAfterDeadline:after.toString(),status});
  }

  const additional=approvedPerCycle?maxZero(requiredUniform.subtract(approvedPerCycle)):null;
  return {
    goalId,
    goalFundingBalance:goalBalance.toString(),
    reservedAcrossTrips:totalReserved.toString(),
    unassignedCurrentFunding:unassigned.toString(),
    currentApprovedContributionPerCycle:approvedPerCycle?approvedPerCycle.toString():null,
    requiredUniformContributionPerCycle:periodicFundingCannotResolveImmediateShortfall?null:(requiredUniform.isZero()?'0.00':requiredUniform.toString()),
    periodicFundingCannotResolveImmediateShortfall,
    additionalContributionPerCycleNeeded:approvedPerCycle?additional?.toString()??'0.00':null,
    allDatedTripsFundableAtCurrentPace:firstShortfall===null,
    firstShortfall,
    items,
    missingTargetCount,
    missingDateCount,
    projectionBasis:approvedPerCycle?'ACTIVE_CYCLE_APPROVED_CONTRIBUTION':'NO_ACTIVE_CONTRIBUTION_PLAN',
  };
}
