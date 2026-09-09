import { goalRepository } from '@/repositories/goal-repository';
export async function resumeGoal(userId:string,goalId:string){try{return{success:true as const,data:{status:await goalRepository.applyEvent(userId,goalId,'RESUME_GOAL')}}}catch{return{success:false as const,message:'تعذر استئناف الهدف.'}}}
