import { rawSql } from '@/infrastructure/db/client';

export type BankStatementImportListItem = {
  id:string;
  fileName:string;
  status:string;
  periodStart:string|null;
  periodEnd:string|null;
  rowCount:number;
  autoClassifiedCount:number;
  reviewCount:number;
  createdAt:string;
  accountName:string;
  bankName:string;
};

export async function listBankStatementImports(userId:string):Promise<BankStatementImportListItem[]> {
  const rows=await rawSql`
    select i.id,i.file_name as "fileName",i.status,i.period_start::text as "periodStart",i.period_end::text as "periodEnd",
           i.row_count as "rowCount",i.auto_classified_count as "autoClassifiedCount",i.review_count as "reviewCount",
           i.created_at::text as "createdAt",a.name as "accountName",coalesce(a.bank_name,'') as "bankName"
    from public.bank_statement_imports i
    join public.accounts a on a.id=i.account_id
    where i.user_id=${userId}
    order by i.created_at desc
    limit 30
  `;
  return rows.map((row)=>({
    id:String(row.id),fileName:String(row.fileName),status:String(row.status),
    periodStart:row.periodStart==null?null:String(row.periodStart),periodEnd:row.periodEnd==null?null:String(row.periodEnd),
    rowCount:Number(row.rowCount??0),autoClassifiedCount:Number(row.autoClassifiedCount??0),reviewCount:Number(row.reviewCount??0),
    createdAt:String(row.createdAt),accountName:String(row.accountName),bankName:String(row.bankName??''),
  }));
}
