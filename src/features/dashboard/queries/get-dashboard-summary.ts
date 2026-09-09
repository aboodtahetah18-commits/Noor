import { dashboardRepository } from '@/repositories/dashboard-repository';

export function getDashboardSummary(userId: string, cycleId?: string) {
  return dashboardRepository.get(userId, cycleId);
}
