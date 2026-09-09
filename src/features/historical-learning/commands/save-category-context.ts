import { randomUUID } from 'node:crypto';
import { rawSql } from '@/infrastructure/db/client';

const DIRECTIONS=new Set(['LOWER','NORMAL','HIGHER']);
const PERSISTENCE=new Set(['TEMPORARY','RECURRING','PERMANENT']);
const REASONS=new Set(['VACATION','TRAVEL','WORK_AWAY','WITH_FAMILY','OCCASION','GUESTS','MAINTENANCE','FAMILY_CIRCUMSTANCE','HEALTH','EXCEPTIONAL_PURCHASE','TEMPORARY_CHANGE','PERMANENT_CHANGE','OTHER']);
const SEASONS=new Set(['RAMADAN','EID_FITR','EID_ADHA','SUMMER_HOLIDAY','BACK_TO_SCHOOL','TRAVEL_SEASON','WINTER','SUMMER','CUSTOM','']);

export async function saveCategoryContext(userId:string,input:{cycleId:string;categoryId:string;direction:string;reasonCodes:string[];customReason?:string;persistence:string;seasonCode?:string;customSeasonName?:string;useForNextPlan:boolean}){
  if(!DIRECTIONS.has(input.direction)||!PERSISTENCE.has(input.persistence))return{success:false as const,message:'بيانات سياق البند غير صحيحة.'};
  if(input.reasonCodes.length===0||input.reasonCodes.some(x=>!REASONS.has(x)))return{success:false as const,message:'اختر سببًا واحدًا على الأقل.'};
  if(input.reasonCodes.includes('OTHER')&&!input.customReason?.trim())return{success:false as const,message:'اكتب السبب الآخر.'};
  const season=input.seasonCode??'';
  if(!SEASONS.has(season))return{success:false as const,message:'الموسم المحدد غير صحيح.'};
  if(season==='CUSTOM'&&!input.customSeasonName?.trim())return{success:false as const,message:'اكتب اسم الموسم المخصص.'};
  const owned=await rawSql`select 1 from public.financial_cycles fc join public.budget_categories bc on bc.user_id=fc.user_id where fc.user_id=${userId} and fc.id=${input.cycleId}::uuid and bc.id=${input.categoryId}::uuid limit 1`;
  if(owned.length===0)return{success:false as const,message:'تعذر التحقق من الدورة أو البند.'};
  await rawSql`insert into public.cycle_category_contexts(id,user_id,cycle_id,category_id,direction,reason_codes,custom_reason,persistence,season_code,custom_season_name,use_for_next_plan)
    values(${randomUUID()},${userId},${input.cycleId}::uuid,${input.categoryId}::uuid,${input.direction},${JSON.stringify(input.reasonCodes)}::jsonb,${input.customReason?.trim()||null},${input.persistence},${season||null},${input.customSeasonName?.trim()||null},${input.useForNextPlan})
    on conflict(user_id,cycle_id,category_id) do update set direction=excluded.direction,reason_codes=excluded.reason_codes,custom_reason=excluded.custom_reason,persistence=excluded.persistence,season_code=excluded.season_code,custom_season_name=excluded.custom_season_name,use_for_next_plan=excluded.use_for_next_plan,updated_at=now()`;
  return{success:true as const};
}
