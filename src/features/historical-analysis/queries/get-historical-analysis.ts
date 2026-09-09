import { reportRepository } from '@/repositories/report-repository';
import { analyzeClosedCycles } from '@/features/historical-analysis/services/analyze-closed-cycles';

export async function getHistoricalAnalysis(userId: string, window: 3 | 6 = 3) {
  const history = await reportRepository.historical(userId, window);
  return analyzeClosedCycles(history.items, window);
}
