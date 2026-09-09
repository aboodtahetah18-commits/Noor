import { financialCycleRepository } from '@/repositories/financial-cycle-repository';
export function getCurrentFinancialCycle(userId:string){ return financialCycleRepository.getCurrent(userId); }
