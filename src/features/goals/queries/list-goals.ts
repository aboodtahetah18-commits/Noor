import { goalRepository } from '@/repositories/goal-repository';
export function listGoals(userId:string){return goalRepository.list(userId)}
