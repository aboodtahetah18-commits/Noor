import { getRawSql } from '@/infrastructure/db/client';

export async function enqueueCycleRecalcForMatchedTransaction(input:{
  userId:string;
  executionEventId:string;
  transactionId:string;
}){
  const sql=getRawSql();
  const rows=await sql`
    select id::text,cycle_id::text,status
    from public.transactions
    where id=${input.transactionId}::uuid
      and user_id=${input.userId}::uuid
    limit 1
  `;
  const transaction=rows[0];
  if(!transaction) return {queued:false,reason:'TRANSACTION_NOT_FOUND' as const,cycleId:null};
  if(String(transaction.status)!=='POSTED'){
    return {queued:false,reason:'TRANSACTION_NOT_POSTED' as const,cycleId:transaction.cycle_id?String(transaction.cycle_id):null};
  }
  if(!transaction.cycle_id){
    return {queued:false,reason:'TRANSACTION_CYCLE_REQUIRED' as const,cycleId:null};
  }

  const cycleId=String(transaction.cycle_id);
  await sql`
    insert into public.cycle_engine_recalc_requests(
      user_id,cycle_id,source_table,source_id,event_action,reason_code,status,requested_at
    ) values(
      ${input.userId}::uuid,${cycleId}::uuid,'execution_events',${input.executionEventId}::uuid,
      'UPDATE','FINAL_MATCHED_EXECUTION','PENDING',now()
    )
    on conflict (user_id,cycle_id,source_table,source_id,event_action)
      where status='PENDING'
    do update set requested_at=excluded.requested_at,reason_code=excluded.reason_code
  `;

  return {queued:true,reason:'FINAL_MATCHED_EXECUTION' as const,cycleId};
}
