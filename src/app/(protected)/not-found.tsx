import Link from 'next/link';
import { LucideIcon } from '@/components/ui/lucide-icon';

export default function ProtectedNotFound() {
  return (
    <main className="app-page" dir="rtl">
      <div className="page-shell">
        <section className="functional-state-card" role="status" aria-live="polite">
          <LucideIcon name="searchX" size={32}/>
          <h1>الصفحة غير موجودة</h1>
          <p>الرابط غير متاح أو أن السجل لم يعد موجودًا.</p>
          <div className="button-row">
            <Link className="primary-link" href="/workspace">فتح مركز النظام</Link>
            <Link className="secondary-link" href="/dashboard">العودة للرئيسية</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
