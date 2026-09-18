import { rawSql } from '@/infrastructure/db/client';
import { runGovernedCycleRecalculationForUser } from '@/features/financial-engine/services/run-governed-cycle-recalculation';

export type FinancialEngineRecalcJobResult={
  userId:string;
  cycleId:string;
  status:'SUCCESS'|'FAILED';
  errorCode:string|null;
};

export async function runFinancialEngineRecalcJob():Promise<FinancialEngineRecalcJobResult[]>{
  const cycles=await rawSql`
    SELECT DISTINCT r.user_id::text AS user_id,r.cycle_id::text AS cycle_id
    FROM public.cycle_engine_recalc_requests r
    JOIN public.financial_cycles c ON c.id=r.cycle_id AND c.user_id=r.user_id
    WHERE r.status IN ('PENDING','PROCESSING')
      AND c.status IN ('ACTIVE','CLOSING')
    ORDER BY r.user_id::text,r.cycle_id::text
  `;
  const results:FinancialEngineRecalcJobResult[]=[];
  for(const raw of cycles){
    const userId=String(raw.user_id);
    const cycleId=String(raw.cycle_id);
    try{
      await runGovernedCycleRecalculationForUser(userId,cycleId);
      results.push({userId,cycleId,status:'SUCCESS',errorCode:null});
    }catch(error){
      const code=error&&typeof error==='object'&&'code' in error?String((error as {code:unknown}).code):'FINANCIAL_ENGINE_RECALC_FAILED';
      results.push({userId,cycleId,status:'FAILED',errorCode:code.slice(0,120)});
    }
  }
  return results;
}
