import Link from 'next/link';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getCurrentFinancialCycle } from '@/features/cycles/queries/get-current-cycle';
import { getCycleReport } from '@/features/reports/queries/get-cycle-report';
import { CycleReportView } from '@/features/reports/components/cycle-report-view';

export default async function ReportsPage() {
  const user = await requireAuthenticatedUser();
  const cycle = await getCurrentFinancialCycle(user.id);
  if (!cycle) return <main className="app-page reports-page p47-analysis-page" dir="rtl"><div className="page-shell p47-analysis-shell"><section className="empty-state"><p className="eyebrow">التقارير</p><div className="title-with-help"><h1>لا توجد دورة تشغيلية</h1></div><div className="dashboard-header-actions"><Link className="primary-link" href="/cycles/new">بدء دورة</Link><Link className="secondary-link" href="/reports/history">الدورات السابقة</Link><Link className="secondary-link" href="/reports/learning">تعلم النظام</Link><Link className="secondary-link" href="/reports/future-pressure">الضغط المالي القادم</Link></div></section></div></main>;
  const report = await getCycleReport(user.id, cycle.id);
  if (!report) return null;
  return <CycleReportView report={report} />;
}
