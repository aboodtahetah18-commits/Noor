import { reportRepository } from '@/repositories/report-repository';
export function getHistoricalCycles(userId: string, window: 3 | 6 = 3) { return reportRepository.historical(userId, window); }
