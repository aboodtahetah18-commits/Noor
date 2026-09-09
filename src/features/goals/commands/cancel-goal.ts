import { goalRepository } from '@/repositories/goal-repository';
export async function cancelGoal(userId:string,goalId:string,reason?:string){try{return{success:true as const,data:{status:await goalRepository.applyEvent(userId,goalId,'CANCEL_GOAL',reason)}}}catch{return{success:false as const,message:'تعذر إلغاء الهدف.'}}}
