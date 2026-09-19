export type UserActionKind='PROVIDE_REQUESTED_DATA'|'RESPOND_TO_FOLLOWUP';

export type GovernanceUserActionItem={
  followupNumber:number;
  registryId:string;
  followupId:string;
  title:string;
  decisionTitle:string;
  actionKind:UserActionKind;
  actionLabel:string;
  requestDetail:string|null;
  dueDate:string|null;
  timingState:string;
  openCommand:string;
};

type OversightLikeItem={
  number?:number;
  registryId?:string;
  followupId?:string;
  title?:string;
  decisionTitle?:string;
  status?:string;
  dueDate?:string|null;
  timingState?:string;
  history?:Array<Record<string,unknown>>;
};

function latestRequestedData(history:OversightLikeItem['history']){
  if(!Array.isArray(history)) return null;
  const event=history.find(item=>item?.eventType==='DATA_REQUESTED');
  return event&&typeof event.detail==='string'&&event.detail.trim()?event.detail.trim():null;
}

export function buildGovernanceUserActionItems(items:OversightLikeItem[]):GovernanceUserActionItem[]{
  return items.flatMap(item=>{
    if(item.status!=='WAITING_USER') return [];
    const number=typeof item.number==='number'?item.number:null;
    const registryId=typeof item.registryId==='string'?item.registryId:null;
    const followupId=typeof item.followupId==='string'?item.followupId:null;
    if(number===null||!registryId||!followupId) return [];

    const requested=latestRequestedData(item.history);
    return [{
      followupNumber:number,
      registryId,
      followupId,
      title:typeof item.title==='string'&&item.title.trim()?item.title.trim():'متابعة مؤسسية',
      decisionTitle:typeof item.decisionTitle==='string'&&item.decisionTitle.trim()?item.decisionTitle.trim():'قرار مؤسسي',
      actionKind:requested?'PROVIDE_REQUESTED_DATA':'RESPOND_TO_FOLLOWUP',
      actionLabel:requested?'تزويد نماء بالبيانات المطلوبة':'الرد على المتابعة',
      requestDetail:requested,
      dueDate:typeof item.dueDate==='string'&&item.dueDate?item.dueDate:null,
      timingState:typeof item.timingState==='string'?item.timingState:'NO_DUE_DATE',
      openCommand:'فتح المتابعة '+number,
    }];
  });
}
