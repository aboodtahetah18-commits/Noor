import { rawSql } from '@/infrastructure/db/client';
import { Money } from '@/financial-engine/money';

export type HistoricalDirection='LOWER'|'NORMAL'|'HIGHER'|'INSUFFICIENT_DATA';
export type LearningCategory={categoryId:string;name:string;closedCycles:number;average3:string|null;average6:string|null;latestActual:string|null;latestPlanned:string|null;historicalReference:string|null;referenceBasis:string|null;direction:HistoricalDirection;contextualizedCycles:number;seasonalSignals:Array<{seasonCode:string;count:number;averageActual:string}>};
export type ForecastAccuracyItem={cycleId:string;cycleName:string;projected:string;actual:string;difference:string;accuracyPercent:number|null};

function average(values:Money[]){if(values.length===0)return null;return Money.fromMinorUnits(values.reduce((a,v)=>a+v.minorUnits,0n)/BigInt(values.length));}
function directionFromPlan(actual:Money,planned:Money):HistoricalDirection{
  if(planned.isZero())return 'INSUFFICIENT_DATA';
  const diff=actual.subtract(planned); const abs=diff.isNegative()?diff.negate():diff;
  const pct=Number((abs.minorUnits*10000n)/planned.minorUnits)/100;
  if(pct<10)return 'NORMAL';
  return diff.isPositive()?'HIGHER':'LOWER';
}

export async function getHistoricalLearning(userId:string){
  const rows=await rawSql`select ccs.category_id::text,bc.name,fc.id::text cycle_id,fc.name cycle_name,ccs.planned_amount::text,ccs.actual_amount::text,cs.closed_at::text,ccc.persistence,ccc.season_code,ccc.use_for_next_plan
    from public.cycle_category_snapshots ccs
    join public.cycle_snapshots cs on cs.id=ccs.snapshot_id and cs.user_id=ccs.user_id
    join public.financial_cycles fc on fc.id=cs.cycle_id and fc.user_id=cs.user_id and fc.status='CLOSED'
    join public.budget_categories bc on bc.id=ccs.category_id and bc.user_id=ccs.user_id
    left join public.cycle_category_contexts ccc on ccc.user_id=ccs.user_id and ccc.cycle_id=fc.id and ccc.category_id=ccs.category_id
    where ccs.user_id=${userId} order by bc.name,cs.closed_at desc`;
  const groups=new Map<string,Array<Record<string,unknown>>>();
  for(const raw of rows){const r=raw as Record<string,unknown>;const id=String(r.category_id);const list=groups.get(id)??[];list.push(r);groups.set(id,list);}
  const categories:LearningCategory[]=[];
  for(const [categoryId,items] of groups){
    const latest=items[0]; if(!latest)continue;
    const vals=items.map(x=>Money.parse(String(x.actual_amount))); const avg3=items.length>=3?average(vals.slice(0,3)):null; const avg6=items.length>=6?average(vals.slice(0,6)):null;
    const reference=avg6??avg3??null; const basis=avg6?'متوسط آخر 6 دورات مغلقة':avg3?'متوسط آخر 3 دورات مغلقة':null;
    const latestActual=Money.parse(String(latest.actual_amount)); const latestPlanned=Money.parse(String(latest.planned_amount));
    const seasonal=new Map<string,Money[]>();
    for(const i of items){if(!i.season_code)continue;const key=String(i.season_code);const list=seasonal.get(key)??[];list.push(Money.parse(String(i.actual_amount)));seasonal.set(key,list);}
    categories.push({categoryId,name:String(latest.name),closedCycles:items.length,average3:avg3?.toString()??null,average6:avg6?.toString()??null,latestActual:latestActual.toString(),latestPlanned:latestPlanned.toString(),historicalReference:reference?.toString()??null,referenceBasis:basis,direction:directionFromPlan(latestActual,latestPlanned),contextualizedCycles:items.filter(x=>x.persistence!=null).length,seasonalSignals:[...seasonal.entries()].map(([seasonCode,v])=>({seasonCode,count:v.length,averageActual:(average(v)??Money.zero()).toString()}))});
  }
  const forecastRows=await rawSql`select fc.id::text cycle_id,fc.name cycle_name,cs.projected_end_balance_final::text projected,cs.actual_end_balance::text actual from public.cycle_snapshots cs join public.financial_cycles fc on fc.id=cs.cycle_id and fc.user_id=cs.user_id where cs.user_id=${userId} and fc.status='CLOSED' and cs.projected_end_balance_final is not null and cs.actual_end_balance is not null order by cs.closed_at desc limit 12`;
  const forecastAccuracy:ForecastAccuracyItem[]=forecastRows.map((raw:unknown)=>{const r=raw as Record<string,unknown>;const p=Money.parse(String(r.projected));const a=Money.parse(String(r.actual));const d=a.subtract(p);const denom=a.isNegative()?a.negate():a;const ad=d.isNegative()?d.negate():d;return{cycleId:String(r.cycle_id),cycleName:String(r.cycle_name),projected:p.toString(),actual:a.toString(),difference:d.toString(),accuracyPercent:denom.isZero()?null:Math.max(0,100-Number((ad.minorUnits*10000n)/denom.minorUnits)/100)}});
  return{categories,forecastAccuracy};
}
