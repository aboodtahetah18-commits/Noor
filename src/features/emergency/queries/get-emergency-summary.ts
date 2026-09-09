import { emergencyRepository } from '@/repositories/emergency-repository';
export async function getEmergencySummary(userId:string){return emergencyRepository.summary(userId)}
