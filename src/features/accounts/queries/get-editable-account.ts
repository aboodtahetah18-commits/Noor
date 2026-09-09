import { rawSql } from '@/infrastructure/db/client';
export async function getEditableAccount(userId:string,accountId:string){
  const rows=await rawSql`select a.id,a.name,a.bank_code,a.bank_name,a.iban,a.card_last4,ob.amount::text opening_balance,ob.effective_date::text effective_date
    from public.accounts a left join public.account_opening_balances ob on ob.account_id=a.id and ob.user_id=a.user_id
    where a.id=${accountId} and a.user_id=${userId} and a.is_active=true limit 1`;
  if(!rows[0])return null; const r=rows[0];
  return{id:String(r.id),name:String(r.name),bankCode:r.bank_code?String(r.bank_code):'',bankName:r.bank_name?String(r.bank_name):'',iban:r.iban?String(r.iban):'',cardLast4:r.card_last4?String(r.card_last4):'',openingBalance:String(r.opening_balance??'0.00'),effectiveDate:String(r.effective_date??'')};
}
