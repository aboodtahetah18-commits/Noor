import { financialCycleRepository } from '@/repositories/financial-cycle-repository';
import { getActiveFinancialBufferPolicy } from '@/features/financial-buffer/services/financial-buffer-service';
import { transition } from '@/state-machines';

export async function completeCycleClosing(userId:string,cycleId:string){
  const cycle=await financialCycleRepository.getById(userId,cycleId);
  if(!cycle)return{success:false as const,code:'NOT_FOUND' as const,message:'الدورة غير موجودة'};
  const policy=await getActiveFinancialBufferPolicy(userId);
  try{
    transition({entityType:'FINANCIAL_CYCLE',entityId:cycle.id,currentState:cycle.status,event:'COMPLETE_CLOSING',actorUserId:userId,preconditions:[{code:'FINAL_SAFE_TO_SPEND_AVAILABLE',satisfied:Boolean(policy)}]});
  }catch{
    if(cycle.status==='CLOSING'&&!policy)return{success:false as const,code:'BUFFER_POLICY_REQUIRED' as const,message:'اعتمد قاعدة الاحتياطي المالي قبل إغلاق الدورة.',blockers:[{issue:'BUFFER_POLICY_REQUIRED',field:'safe_to_spend_final',reason:'No active financial buffer policy.'}]};
    return{success:false as const,code:'INVALID_STATE_TRANSITION' as const,message:'لا يمكن إكمال الإغلاق من الحالة الحالية'};
  }
  return{success:true as const,code:'READY' as const,message:'قاعدة Safe To Spend مكتملة؛ يمكن تنفيذ الإغلاق التشغيلي.'};
}
