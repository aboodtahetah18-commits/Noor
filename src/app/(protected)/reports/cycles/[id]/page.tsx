import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getCycleReport } from '@/features/reports/queries/get-cycle-report';
import { CycleReportView } from '@/features/reports/components/cycle-report-view';

export default async function CycleReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();
  const { id } = await params;
  const report = await getCycleReport(user.id, id);
  if (!report) return notFound();
  return <CycleReportView report={report} />;
}
