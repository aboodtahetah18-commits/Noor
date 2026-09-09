import { expectedIncomeRepository } from '@/repositories/expected-income-repository';
export async function getExpectedIncome(userId:string,id:string){ return expectedIncomeRepository.getById(userId,id); }
