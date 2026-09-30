import { rawSql } from '@/infrastructure/db/client';

export type BudgetPriorityConfidence={
  level:'INITIAL'|'MEDIUM'|'HIGH';
  source:'RULE'|'EXACT_HISTORY'|'PATTERN';
  confirmations:number;
  label:string;
};

function normalizePriorityLabel(value:string){
  return value
    .trim()
    .toLocaleLowerCase('ar')
    .replace(/[أإآ]/g,'ا')
    .replace(/ى/g,'ي')
    .replace(/ة/g,'ه')
    .replace(/[^\p{L}\p{N}\s]/gu,' ')
    .replace(/\s+/g,' ')
    .trim();
}

export async function getBudgetPriorityConfidence(
  userId:string,
  items:Array<{id:string;name:string;allocationType:string}>,
){
  const result=new Map<string,BudgetPriorityConfidence>();
  for(const item of items){
    result.set(item.id,{
      level:'INITIAL',
      source:'RULE',
      confirmations:0,
      label:'اقتراح أولي — لا توجد بيانات كافية بعد',
    });
  }
  if(!items.length) return result;

  const table=await rawSql`select to_regclass('public.budget_priority_preferences')::text table_name`;
  if(!(table[0] as Record<string,unknown>|undefined)?.table_name) return result;

  const rows=await rawSql`
    select normalized_label,allocation_type,chosen_priority,confirmation_count
    from public.budget_priority_preferences
    where user_id=${userId}::uuid
  `;

  const exact=new Map<string,{count:number;priority:string}>();
  const byType=new Map<string,Map<string,number>>();
  for(const row of rows){
    const allocationType=String(row.allocation_type??'');
    const normalizedLabel=String(row.normalized_label??'');
    const priority=String(row.chosen_priority??'');
    const count=Math.max(1,Number(row.confirmation_count??1));
    exact.set(`${allocationType}:${normalizedLabel}`,{count,priority});
    const typeMap=byType.get(allocationType)??new Map<string,number>();
    typeMap.set(priority,(typeMap.get(priority)??0)+count);
    byType.set(allocationType,typeMap);
  }

  for(const item of items){
    const key=`${item.allocationType}:${normalizePriorityLabel(item.name)}`;
    const learned=exact.get(key);
    if(learned){
      const level=learned.count>=5?'HIGH':learned.count>=2?'MEDIUM':'INITIAL';
      result.set(item.id,{
        level,
        source:'EXACT_HISTORY',
        confirmations:learned.count,
        label:level==='HIGH'
          ? `ثقة عالية — بناءً على ${learned.count} تأكيدات سابقة لهذا البند`
          : level==='MEDIUM'
            ? `ثقة متوسطة — بناءً على ${learned.count} تأكيدات سابقة لهذا البند`
            : 'اقتراح أولي — يوجد تأكيد سابق واحد فقط',
      });
      continue;
    }

    const typeMap=byType.get(item.allocationType);
    if(!typeMap) continue;
    const entries=[...typeMap.entries()].sort((a,b)=>b[1]-a[1]);
    const total=entries.reduce((sum,[,count])=>sum+count,0);
    const leader=entries[0];
    if(total>=3&&leader&&leader[1]/total>=0.7){
      result.set(item.id,{
        level:'MEDIUM',
        source:'PATTERN',
        confirmations:leader[1],
        label:`ثقة متوسطة — مستندة إلى نمطك في ${total} اختيارات سابقة مشابهة`,
      });
    }
  }

  return result;
}
