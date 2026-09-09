import { reportRepository } from '@/repositories/report-repository';
export function getCycleReport(userId: string, cycleId: string) { return reportRepository.cycleReport(userId, cycleId); }
