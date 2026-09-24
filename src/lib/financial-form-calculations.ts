export type RecurrencePeriod='يومي'|'أسبوعي'|'شهري';

function finite(value:number){
  return Number.isFinite(value)?value:0;
}

export function roundMoney(value:number){
  return Number(finite(value).toFixed(2));
}

export function monthlyRecurringTotal(period:RecurrencePeriod,occurrences:number,unitCost:number){
  const count=Math.max(0,finite(occurrences));
  const cost=Math.max(0,finite(unitCost));
  const factor=period==='يومي'?30:period==='أسبوعي'?52/12:1;
  return roundMoney(count*cost*factor);
}

export function fuelMonthlyCost(distanceKm:number,efficiencyKmPerLiter:number,pricePerLiter:number){
  const distance=Math.max(0,finite(distanceKm));
  const efficiency=finite(efficiencyKmPerLiter);
  const price=Math.max(0,finite(pricePerLiter));
  if(efficiency<=0) return 0;
  return roundMoney((distance/efficiency)*price);
}

export function remainingAfter(base:number,change:number){
  return roundMoney(Math.max(0,finite(base)-Math.max(0,finite(change))));
}

export function maintenanceForecast({
  intervalValue,
  forecastValue,
  primaryAmount,
  alternateAmount,
  alternating,
}:{
  intervalValue:number;
  forecastValue:number;
  primaryAmount:number;
  alternateAmount?:number;
  alternating?:boolean;
}){
  const interval=finite(intervalValue);
  const horizon=Math.max(0,finite(forecastValue));
  if(interval<=0) return {occurrences:0,total:0};
  const occurrences=Math.max(0,Math.floor(horizon/interval));
  const primary=Math.max(0,finite(primaryAmount));
  const alternate=Math.max(0,finite(alternateAmount??primary));
  if(!alternating) return {occurrences,total:roundMoney(occurrences*primary)};
  const primaryCount=Math.ceil(occurrences/2);
  const alternateCount=Math.floor(occurrences/2);
  return {occurrences,total:roundMoney(primaryCount*primary+alternateCount*alternate)};
}

export function sumFinancialValues(values:Array<number|string|null|undefined>){
  return roundMoney(values.reduce<number>((sum,value)=>{
    const n=typeof value==='number'?value:Number(value??0);
    return sum+(Number.isFinite(n)?n:0);
  },0));
}
