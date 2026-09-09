import { randomUUID } from 'node:crypto';
import { rawSql } from '@/infrastructure/db/client';

type Mode='FIXED'|'PERCENT_INCOME'|'MAX_FIXED_PERCENT';
const MODES=new Set<Mode>(['FIXED','PERCENT_INCOME','MAX_FIXED_PERCENT']);
const money=/^\d+(?:\.\d{1,2})?$/;
export async function saveFinancialBufferPolicy(userId:string,input:{mode:unknown;fixedAmount:unknown;percent:unknown}){
  const mode=String(input.mode??'') as Mode;
  const fixedAmount=String(input.fixedAmount??'0').trim()||'0';
  const percentRaw=String(input.percent??'0').trim()||'0';
  const percent=Number(percentRaw);
  if(!MODES.has(mode))return{success:false as const,message:'اختر طريقة احتياطي صحيحة.'};
  if(!money.test(fixedAmount)||!Number.isFinite(percent)||percent<0||percent>100)return{success:false as const,message:'تحقق من مبلغ ونسبة الاحتياطي.'};
  if(mode==='FIXED'&&Number(fixedAmount)<=0)return{success:false as const,message:'أدخل مبلغ احتياطي أكبر من صفر.'};
  if(mode==='PERCENT_INCOME'&&percent<=0)return{success:false as const,message:'أدخل نسبة احتياطي أكبر من صفر.'};
  if(mode==='MAX_FIXED_PERCENT'&&(Number(fixedAmount)<=0||percent<=0))return{success:false as const,message:'أدخل المبلغ والنسبة معًا.'};
  const bps=Math.round(percent*100);
  const now=new Date().toISOString();
  await rawSql.transaction([
    rawSql`update public.financial_buffer_policies set is_active=false,updated_at=${now} where user_id=${userId} and is_active=true returning id`,
    rawSql`insert into public.financial_buffer_policies(id,user_id,mode,fixed_amount,percent_bps,is_active,created_at,updated_at) values(${randomUUID()},${userId},${mode},${fixedAmount},${bps},true,${now},${now}) returning id`
  ]);
  return{success:true as const};
}
