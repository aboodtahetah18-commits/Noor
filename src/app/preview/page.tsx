import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';

const summary = [
  ['السيولة الحالية', '8,420 ر.س'],
  ['المتبقي المخطط', '3,180 ر.س'],
  ['المصروف هذا الشهر', '2,760 ر.س'],
  ['الالتزامات القادمة', '1,450 ر.س'],
];
const transactions = [
  ['راتب', '+ 9,500 ر.س', 'دخل'],
  ['مشتريات منزلية', '- 420 ر.س', 'مصروف'],
  ['تحويل إلى الادخار', '1,000 ر.س', 'تحويل'],
  ['وقود', '- 180 ر.س', 'مصروف'],
];

export default async function PreviewPage() {
  await requireAuthenticatedUser();
  // Development-only design reference. Fake financial data must never be exposed
  // as an operational route in staging or production.
  if (process.env.APP_ENV !== 'development') redirect('/');

  return <main className="preview-shell" dir="rtl">
    <header className="preview-topbar"><div><p className="preview-kicker">مرجع تصميم محلي</p><h1>مستقبلي</h1></div><span className="preview-badge">Development only</span></header>
    <section className="preview-hero"><div><p>بيانات تجريبية محلية فقط</p><h2>سبتمبر 2026</h2><span>لا تمثل بيانات المستخدم ولا تتصل بالمسار التشغيلي.</span></div><Link href="/">العودة للتطبيق</Link></section>
    <section className="preview-grid" aria-label="المؤشرات المالية التجريبية">{summary.map(([label,value])=><article className="preview-stat" key={label}><span>{label}</span><strong>{value}</strong></article>)}</section>
    <section className="preview-two-column"><article className="preview-panel"><div className="preview-section-title"><div><p>مرجع بصري</p><h2>الميزانية</h2></div><span>68٪ مستخدم</span></div><div className="preview-progress"><i/></div><div className="preview-budget-row"><span>الاحتياجات الأساسية</span><strong>1,980 / 2,600 ر.س</strong></div><div className="preview-budget-row"><span>المرن</span><strong>780 / 1,300 ر.س</strong></div><div className="preview-budget-row"><span>الادخار</span><strong>1,000 / 1,500 ر.س</strong></div></article><article className="preview-panel"><div className="preview-section-title"><div><p>بيانات وهمية</p><h2>العمليات المالية</h2></div></div><div className="preview-list">{transactions.map(([name,amount,type])=><div className="preview-transaction" key={`${name}-${amount}`}><div><strong>{name}</strong><span>{type}</span></div><b>{amount}</b></div>)}</div></article></section>
  </main>;
}
