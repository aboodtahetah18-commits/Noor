import { goalRepository } from '@/repositories/goal-repository';
export async function activateGoal(userId:string,goalId:string){try{return{success:true as const,data:{status:await goalRepository.applyEvent(userId,goalId,'ACTIVATE_GOAL')}}}catch{return{success:false as const,message:'تعذر تفعيل الهدف.'}}}
