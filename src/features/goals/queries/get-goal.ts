import { goalRepository } from '@/repositories/goal-repository';
export function getGoal(userId:string,id:string){return goalRepository.get(userId,id)}
