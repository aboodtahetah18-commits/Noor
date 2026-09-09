import { savingRepository } from '@/repositories/saving-repository';
export function getSavingsSummary(userId:string,cycleId?:string){return savingRepository.getSummary(userId,cycleId);}
