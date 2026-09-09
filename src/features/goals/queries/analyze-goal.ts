import { goalRepository } from '@/repositories/goal-repository';
import { validateAnalyzeGoal,type AnalyzeGoalInput } from '../schemas/goal';
export async function analyzeGoal(userId:string,input:AnalyzeGoalInput){const p=validateAnalyzeGoal(input);if(!p.success)return p;return{success:true as const,data:await goalRepository.analyze(userId,p.data.targetAmount,p.data.currentBalance,p.data.targetDate)}}
