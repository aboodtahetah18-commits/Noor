import { expectedIncomeRepository } from '@/repositories/expected-income-repository';
export async function listExpectedIncomes(userId:string,cycleId:string){ return expectedIncomeRepository.listByCycle(userId,cycleId); }
