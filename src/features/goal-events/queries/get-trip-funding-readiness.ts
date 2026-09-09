import { Money } from '@/financial-engine/money';
import { rawSql } from '@/infrastructure/db/client';

export type TripFundingReadiness = {
  eventId: string;
  goalId: string;
  eventTitle: string;
  eventStatus: string;
  startsAt: string | null;
  fundingTarget: string | null;
  goalFundingBalance: string;
  reservedForThisTrip: string;
  reservedForOtherTrips: string;
  unassignedGoalFunding: string;
  fundingGap: string | null;
  remainingCycles: number | null;
  requiredPerCycle: string | null;
  readiness: 'NO_TARGET'|'NO_DATE'|'READY'|'FUNDING_GAP'|'DUE_NOW';
};

function maxZero(value: Money) { return value.isNegative() ? Money.zero() : value; }

export async function getTripFundingReadiness(userId:string,eventId:string):Promise<TripFundingReadiness|null>{
  const rows=await rawSql`select e.id,e.goal_id as "goalId",e.title,e.status,e.starts_at as "startsAt",e.planned_amount::text as "plannedAmount",
    g.opening_balance::text as "openingBalance",
    coalesce(sum(t.amount) filter(where t.transaction_type='GOAL_CONTRIBUTION' and t.status='POSTED'),0)::text as "contributions"
    from public.goal_events e
    join public.financial_goals g on g.id=e.goal_id and g.user_id=e.user_id
    left join public.transactions t on t.goal_id=g.id and t.user_id=g.user_id
    where e.user_id=${userId} and e.id=${eventId}::uuid
    group by e.id,g.id limit 1`;
  const row=rows[0];if(!row)return null;

  const reservationRows=await rawSql`select
    coalesce(sum(r.reserved_amount) filter(where r.goal_event_id=${eventId}::uuid and r.status='ACTIVE'),0)::text as "thisReserved",
    coalesce(sum(r.reserved_amount) filter(where r.goal_event_id<>${eventId}::uuid and r.status='ACTIVE' and oe.status in ('PLANNED','ACTIVE')),0)::text as "otherReserved"
    from public.goal_event_funding_reservations r
    join public.goal_events oe on oe.id=r.goal_event_id and oe.user_id=r.user_id
    where r.user_id=${userId} and r.goal_id=${row.goalId}::uuid`;
  const rr=reservationRows[0];
  const goalBalance=Money.parse(String(row.openingBalance)).add(Money.parse(String(row.contributions)));
  const thisReserved=Money.parse(String(rr?.thisReserved??'0'));
  const otherReserved=Money.parse(String(rr?.otherReserved??'0'));
  const unassigned=maxZero(goalBalance.subtract(thisReserved).subtract(otherReserved));
  const target=row.plannedAmount?Money.parse(String(row.plannedAmount)):null;
  const gap=target?maxZero(target.subtract(thisReserved)):null;

  let remainingCycles:number|null=null;
  if(row.startsAt){
    const cycleRows=await rawSql`select start_date::text as "startDate",expected_next_income_date::text as "nextIncomeDate" from public.financial_cycles where user_id=${userId} and status='ACTIVE' order by start_date desc limit 1`;
    const cycle=cycleRows[0];
    if(cycle){
      const start=new Date(`${String(cycle.startDate)}T00:00:00Z`),next=new Date(`${String(cycle.nextIncomeDate)}T00:00:00Z`),trip=new Date(String(row.startsAt));
      const cadence=Math.max(1,Math.round((next.getTime()-start.getTime())/86_400_000));
      const days=Math.ceil((trip.getTime()-Date.now())/86_400_000);
      remainingCycles=days<=0?0:Math.max(1,Math.ceil(days/cadence));
    }
  }
  let requiredPerCycle:string|null=null;
  if(gap&&!gap.isZero()&&remainingCycles!==null&&remainingCycles>0){
    const n=BigInt(remainingCycles);
    requiredPerCycle=Money.fromMinorUnits((gap.minorUnits+n-1n)/n).toString();
  }
  let readiness:TripFundingReadiness['readiness']='FUNDING_GAP';
  if(!target)readiness='NO_TARGET';
  else if(gap?.isZero())readiness='READY';
  else if(!row.startsAt)readiness='NO_DATE';
  else if(remainingCycles===0)readiness='DUE_NOW';

  return {eventId:String(row.id),goalId:String(row.goalId),eventTitle:String(row.title),eventStatus:String(row.status),startsAt:row.startsAt?new Date(String(row.startsAt)).toISOString():null,
    fundingTarget:target?target.toString():null,goalFundingBalance:goalBalance.toString(),reservedForThisTrip:thisReserved.toString(),reservedForOtherTrips:otherReserved.toString(),unassignedGoalFunding:unassigned.toString(),fundingGap:gap?gap.toString():null,remainingCycles,requiredPerCycle,readiness};
}
