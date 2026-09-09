import { rawSql, type SqlQuery } from '@/infrastructure/db/client';
import { Money, sumMoney } from '@/financial-engine/money';

function rateBasisPoints(value:unknown):bigint{
  const normalized=String(value??'0.10').trim();
  if(!/^\d+(?:\.\d{1,4})?$/.test(normalized)) throw new Error('معدل زيادة التمويل غير صالح.');
  const [whole='0',fraction='']=normalized.split('.');
  const points=BigInt(whole)*10_000n+BigInt(fraction.padEnd(4,'0'));
  return points>1000n?1000n:points;
}
function growthFor(amount:Money,basisPoints:bigint):Money{
  return Money.fromMinorUnits((amount.minorUnits*basisPoints+5000n)/10_000n);
}

/**
 * Allocates a confirmed POSTED expense across approved funding sources in priority order.
 * This command is idempotent per transaction: retries never increase used_amount twice.
 */
export async function linkFundedTransaction(
  userId:string,
  caseId:string,
  bankStatementRowId:string,
  transactionId:string,
  categoryId:string,
  amount:string,
){
  const requested=Money.parse(amount);
  if(!requested.isPositive()) throw new Error('مبلغ العملية الممولة غير صالح.');

  const existing=await rawSql`select coalesce(sum(amount),0)::text as total from public.internal_funding_expense_allocations where user_id=${userId} and transaction_id=${transactionId}`;
  if(Money.parse(String(existing[0]?.total??'0')).isPositive()) return {alreadyLinked:true};

  const cases=await rawSql`select id,growth_rate::text as "growthRate" from public.internal_funding_cases where id=${caseId} and user_id=${userId} and status in ('PLANNING','ACTIVE') limit 1`;
  const fundingCase=cases[0];
  if(!fundingCase) throw new Error('التمويل غير نشط أو غير موجود.');
  const growthRate=rateBasisPoints(fundingCase.growthRate);
  const sources=await rawSql`select id,approved_amount::text as "approvedAmount",used_amount::text as "usedAmount" from public.internal_funding_sources where case_id=${caseId} and user_id=${userId} order by priority asc,created_at asc`;
  if(!sources.length) throw new Error('لا يوجد مصدر تمويل معتمد لهذا التمويل.');

  const availableBySource=sources.map(source=>({source,available:Money.parse(String(source.approvedAmount??'0')).subtract(Money.parse(String(source.usedAmount??'0'))).max(Money.zero())}));
  const capacity=sumMoney(availableBySource.map(item=>item.available));
  if(capacity.compare(requested)<0) throw new Error(`المبلغ المتبقي في مصادر التمويل لا يغطي العملية. المتاح ${capacity.toString()} ريال.`);

  let remaining=requested;
  const statements:SqlQuery[]=[];
  for(const {source,available} of availableBySource){
    if(!remaining.isPositive()) break;
    const take=remaining.min(available);
    if(!take.isPositive()) continue;
    const growth=growthFor(take,growthRate);
    statements.push(rawSql`insert into public.internal_funding_expense_allocations(user_id,case_id,source_id,bank_statement_row_id,transaction_id,category_id,amount,growth_contribution)
      values(${userId},${caseId},${String(source.id)},${bankStatementRowId},${transactionId},${categoryId},${take.toString()},${growth.toString()})`);
    statements.push(rawSql`update public.internal_funding_sources set used_amount=used_amount+${take.toString()}::numeric,updated_at=now() where id=${String(source.id)} and user_id=${userId}`);
    remaining=remaining.subtract(take);
  }
  await rawSql.transaction(statements);
  await rawSql`update public.internal_funding_cases set status='ACTIVE',updated_at=now() where id=${caseId} and user_id=${userId} and status='PLANNING'`;
  return {alreadyLinked:false};
}
