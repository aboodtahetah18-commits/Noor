export type NamedBudgetSeason='RAMADAN'|'EID_FITR'|'EID_ADHA'|'SUMMER'|'BACK_TO_SCHOOL';

export const namedBudgetSeasonLabels:Record<NamedBudgetSeason,string>={
  RAMADAN:'رمضان',
  EID_FITR:'عيد الفطر',
  EID_ADHA:'عيد الأضحى',
  SUMMER:'الإجازة الصيفية',
  BACK_TO_SCHOOL:'العودة للدراسة',
};

const hijriFormatter=new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura-nu-latn',{
  timeZone:'Asia/Riyadh',
  year:'numeric',
  month:'numeric',
  day:'numeric',
});

function utcNoon(value:string){
  return new Date(`${value.slice(0,10)}T12:00:00Z`);
}

function ymd(date:Date){
  return date.toISOString().slice(0,10);
}

function addDays(value:string,days:number){
  const date=utcNoon(value);
  date.setUTCDate(date.getUTCDate()+days);
  return ymd(date);
}

function hijriParts(value:string){
  const parts=hijriFormatter.formatToParts(utcNoon(value));
  const read=(type:'year'|'month'|'day')=>Number(parts.find(part=>part.type===type)?.value??0);
  return {year:read('year'),month:read('month'),day:read('day')};
}

export function namedSeasonsForDate(value:string):NamedBudgetSeason[]{
  const date=value.slice(0,10);
  const month=Number(date.slice(5,7));
  const day=Number(date.slice(8,10));
  const hijri=hijriParts(date);
  const seasons:NamedBudgetSeason[]=[];

  if(hijri.month===9) seasons.push('RAMADAN');
  if(hijri.month===10&&hijri.day>=1&&hijri.day<=7) seasons.push('EID_FITR');
  if(hijri.month===12&&hijri.day>=8&&hijri.day<=15) seasons.push('EID_ADHA');
  if(month>=6&&month<=8) seasons.push('SUMMER');

  // نطاق موسمي تقريبي، وليس تقويمًا مدرسيًا رسميًا.
  if((month===8&&day>=15)||(month===9&&day<=15)) seasons.push('BACK_TO_SCHOOL');

  return seasons;
}

export type NamedSeasonCoverage={
  season:NamedBudgetSeason;
  days:number;
  coverage:number;
};

export function namedSeasonCoverage(startDate:string,endDate:string):NamedSeasonCoverage[]{
  const counts=new Map<NamedBudgetSeason,number>();
  let cursor=startDate.slice(0,10);
  const end=endDate.slice(0,10);
  let totalDays=0;

  while(cursor<end&&totalDays<120){
    totalDays+=1;
    for(const season of namedSeasonsForDate(cursor)){
      counts.set(season,(counts.get(season)??0)+1);
    }
    cursor=addDays(cursor,1);
  }

  if(!totalDays) return [];
  return [...counts.entries()]
    .map(([season,days])=>({season,days,coverage:days/totalDays}))
    .sort((a,b)=>b.days-a.days);
}

export type DailySeasonSpend={date:string;amount:number};

export type NamedSeasonSignal={
  season:NamedBudgetSeason;
  label:string;
  coverage:number;
  historicalSeasonDays:number;
  historicalSeasonOccurrences:number;
  factor:number;
  weightedFactor:number;
};

export function namedSeasonSignal(params:{
  cycleStart:string;
  cycleEnd:string;
  dailySpend:DailySeasonSpend[];
  historyStart:string;
  historyEnd:string;
}):NamedSeasonSignal|null{
  const coverages=namedSeasonCoverage(params.cycleStart,params.cycleEnd);
  if(!coverages.length) return null;

  const spendByDate=new Map(params.dailySpend.map(row=>[row.date.slice(0,10),Math.max(0,row.amount)]));
  let cursor=params.historyStart.slice(0,10);
  const end=params.historyEnd.slice(0,10);
  let historyDays=0;
  let totalSpend=0;
  const seasonDays=new Map<NamedBudgetSeason,number>();
  const seasonSpend=new Map<NamedBudgetSeason,number>();
  const occurrenceKeys=new Map<NamedBudgetSeason,Set<string>>();

  while(cursor<end&&historyDays<1200){
    historyDays+=1;
    const amount=spendByDate.get(cursor)??0;
    totalSpend+=amount;
    const hijri=hijriParts(cursor);
    const gregorianYear=cursor.slice(0,4);

    for(const season of namedSeasonsForDate(cursor)){
      seasonDays.set(season,(seasonDays.get(season)??0)+1);
      seasonSpend.set(season,(seasonSpend.get(season)??0)+amount);
      const occurrenceKey=season==='RAMADAN'||season==='EID_FITR'||season==='EID_ADHA'
        ? String(hijri.year)
        : gregorianYear;
      const set=occurrenceKeys.get(season)??new Set<string>();
      set.add(occurrenceKey);
      occurrenceKeys.set(season,set);
    }
    cursor=addDays(cursor,1);
  }

  if(historyDays<60||totalSpend<=0) return null;
  const baselineDaily=totalSpend/historyDays;

  const candidates=coverages.map(coverage=>{
    const days=seasonDays.get(coverage.season)??0;
    const occurrences=occurrenceKeys.get(coverage.season)?.size??0;
    const spend=seasonSpend.get(coverage.season)??0;
    const minimumDays=coverage.season==='EID_FITR'||coverage.season==='EID_ADHA'?10:20;
    if(days<minimumDays||occurrences<2||spend<=0) return null;
    const seasonDaily=spend/days;
    const rawFactor=baselineDaily>0?seasonDaily/baselineDaily:1;
    const factor=Math.max(0.75,Math.min(1.5,rawFactor));
    const weightedFactor=1+(factor-1)*coverage.coverage;
    if(Math.abs(weightedFactor-1)<0.08) return null;
    return {
      season:coverage.season,
      label:namedBudgetSeasonLabels[coverage.season],
      coverage:coverage.coverage,
      historicalSeasonDays:days,
      historicalSeasonOccurrences:occurrences,
      factor,
      weightedFactor,
    } satisfies NamedSeasonSignal;
  }).filter((value):value is NamedSeasonSignal=>Boolean(value));

  return candidates.sort((a,b)=>Math.abs(b.weightedFactor-1)-Math.abs(a.weightedFactor-1))[0]??null;
}
