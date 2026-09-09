import { goalRepository } from '@/repositories/goal-repository';
export async function pauseGoal(userId:string,goalId:string){try{return{success:true as const,data:{status:await goalRepository.applyEvent(userId,goalId,'PAUSE_GOAL')}}}catch{return{success:false as const,message:'تعذر إيقاف الهدف مؤقتًا.'}}}
