export type PlanItemRule = { recurrenceKind:'MONTHLY'|'EVERY_N_CYCLES'|'ONE_TIME'|'SEASONAL'; intervalCycles:number; startCycleDate:string };

function monthIndex(date:string){
  const d=new Date(`${date}T00:00:00Z`);
  if(Number.isNaN(d.getTime())) return null;
  return d.getUTCFullYear()*12+d.getUTCMonth();
}

export function isPlanItemDue(rule:PlanItemRule,cycleStartDate:string){
  if(cycleStartDate<rule.startCycleDate)return false;
  if(rule.recurrenceKind==='MONTHLY')return true;
  if(rule.recurrenceKind==='ONE_TIME')return cycleStartDate===rule.startCycleDate;
  // Seasonal recurrence needs an explicit season definition. Until that exists, never auto-carry it.
  if(rule.recurrenceKind==='SEASONAL')return false;
  const start=monthIndex(rule.startCycleDate),current=monthIndex(cycleStartDate);
  if(start===null||current===null)return false;
  const cycleIndex=Math.max(0,current-start);
  return cycleIndex % Math.max(1,rule.intervalCycles)===0;
}
