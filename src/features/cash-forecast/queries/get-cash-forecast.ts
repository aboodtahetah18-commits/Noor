import { calculateCashForecast } from '@/features/cash-forecast/services/cash-forecast-service';
export function getCashForecast(userId:string,cycleId:string){return calculateCashForecast(userId,cycleId);}
