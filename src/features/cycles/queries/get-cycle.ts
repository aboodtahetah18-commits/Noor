import { financialCycleRepository } from '@/repositories/financial-cycle-repository';
export function getFinancialCycle(userId:string,id:string){ return financialCycleRepository.getById(userId,id); }
