import Link from 'next/link';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { InvestmentActionDialogs } from './investment-action-dialogs';

export default function InvestmentsPage() {
  return (
    <main className="namaa-investments-page" dir="rtl">
      <section className="namaa-investments-shell namaa-wide-only">
        <header className="namaa-investments-header namaa-wide-card">
          <div>
            <p>بنك الأصول الاستثمارية</p>
            <h1>الاستثمارات</h1>
            <span>إدارة المحافظ، التقييم، المتابعة، والتحليل قبل أي توصية شراء أو خروج.</span>
          </div>
          <InvestmentActionDialogs />
        </header>

        <div className="namaa-investments-grid">
          <aside className="namaa-investments-chat namaa-wide-panel">
            <div className="namaa-investments-section-title">
              <div>
                <p>المناقشة الاستثمارية</p>
                <h2>فريق المحفظة</h2>
              </div>
              <LucideIcon name="messageSquareText" size={20} />
            </div>
            <div className="namaa-investments-participants">
              <span>مسؤول الاستثمار</span>
              <span>مدير بنك الأصول</span>
              <span>اللجنة المختصة عند الحاجة</span>
            </div>
            <div className="namaa-investments-chat-note">
              <strong>الدردشة مرتبطة بالمحفظة المختارة.</strong>
              <p>يمكن تحديث البيانات، طلب تقييم، أو مناقشة توصية مباشرة من هنا.</p>
            </div>
            <Link href="/conversations" className="namaa-wide-action">فتح الدردشة</Link>
          </aside>

          <section className="namaa-investments-dashboard namaa-wide-panel">
            <div className="namaa-investments-section-title">
              <div>
                <p>لوحة المتابعة</p>
                <h2>المحفظة الحالية</h2>
              </div>
              <LucideIcon name="chart" size={20} />
            </div>
            <div className="namaa-investments-empty">
              <LucideIcon name="landmark" size={32} />
              <strong>اختر محفظة أو أضف محفظة جديدة</strong>
              <p>بعد الربط ستظهر القيمة الحالية، الأداء، السيولة، توزيع الأصول، التركّز، المخاطر، والنتائج المحدثة.</p>
            </div>
            <div className="namaa-investments-dashboard-grid">
              <article><span>الأداء</span><strong>يظهر بعد اختيار المحفظة</strong></article>
              <article><span>المخاطر</span><strong>تقييم مستمر</strong></article>
              <article><span>السيولة</span><strong>حسب الأصول القابلة للتسييل</strong></article>
              <article><span>التوصيات</span><strong>تحتاج اعتماد المستخدم</strong></article>
            </div>
          </section>

          <aside className="namaa-investments-followup namaa-wide-panel">
            <div className="namaa-investments-section-title">
              <div>
                <p>العمل المطلوب</p>
                <h2>المتابعة والتوصيات</h2>
              </div>
              <LucideIcon name="listChecks" size={20} />
            </div>
            <div className="namaa-investments-followup-list">
              <article>
                <strong>إضافة منتج أو صندوق</strong>
                <p>يحلله النظام قبل إدخاله للمحفظة ويعرض الملاءمة والمخاطر والسيولة.</p>
              </article>
              <article>
                <strong>مراجعة أصل ضعيف</strong>
                <p>التوصية بالخروج لا تنفذ تلقائيًا؛ تعرض الأسباب ثم تنتظر موافقتك.</p>
              </article>
              <article>
                <strong>تحديث النتائج</strong>
                <p>التحديث يتم من الدردشة أو من واجهة الكمبيوتر واللابتوب والتابلت.</p>
              </article>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
