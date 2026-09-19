export type OversightViewFilter='ALL'|'OVERDUE'|'WAITING_USER'|'UNASSIGNED'|'BLOCKED'|'ESCALATED';
export type OversightViewSort='DEFAULT'|'DUE_DATE'|'LAST_UPDATE';

export type OversightViewItem={
  number?:number;
  registryId?:string;
  followupId?:string;
  status?:string;
  assignedTo?:string|null;
  dueDate?:string|null;
  timingState?:string;
  history?:Array<Record<string,unknown>>;
  [key:string]:unknown;
};

export type OversightEscalationRef={registryId?:string;followupId?:string};

function eventTime(item:OversightViewItem){
  const first=Array.isArray(item.history)?item.history[0]:null;
  const raw=first&&typeof first.createdAt==='string'?first.createdAt:null;
  const ms=raw?Date.parse(raw):NaN;
  return Number.isFinite(ms)?ms:Number.NEGATIVE_INFINITY;
}

function dueTime(item:OversightViewItem){
  if(typeof item.dueDate!=='string'||!item.dueDate)return Number.POSITIVE_INFINITY;
  const ms=Date.parse(item.dueDate+'T00:00:00Z');
  return Number.isFinite(ms)?ms:Number.POSITIVE_INFINITY;
}

export function filterAndSortOversightItems(args:{
  items:OversightViewItem[];
  escalations:OversightEscalationRef[];
  filter:OversightViewFilter;
  sort:OversightViewSort;
}){
  const escalated=new Set(args.escalations.map(item=>String(item.registryId??'')+':'+String(item.followupId??'')));
  const filtered=args.items.filter(item=>{
    if(args.filter==='ALL') return true;
    if(args.filter==='OVERDUE') return item.timingState==='OVERDUE';
    if(args.filter==='WAITING_USER') return item.status==='WAITING_USER';
    if(args.filter==='UNASSIGNED') return !item.assignedTo;
    if(args.filter==='BLOCKED') return item.status==='BLOCKED';
    if(args.filter==='ESCALATED') return escalated.has(String(item.registryId??'')+':'+String(item.followupId??''));
    return true;
  });

  if(args.sort==='DEFAULT') return filtered;
  return [...filtered].sort((a,b)=>{
    if(args.sort==='DUE_DATE'){
      const delta=dueTime(a)-dueTime(b);
      if(delta!==0) return delta;
    }
    if(args.sort==='LAST_UPDATE'){
      const delta=eventTime(b)-eventTime(a);
      if(delta!==0) return delta;
    }
    return Number(a.number??0)-Number(b.number??0);
  });
}
