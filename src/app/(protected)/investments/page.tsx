import Image from 'next/image';
import Link from 'next/link';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { InvestmentActionDialogs } from './investment-action-dialogs';
import { NAMAA_PERSONA_ASSETS } from '@/components/conversations/persona-assets';

export default function InvestmentsPage() {
  return (
    <main className="namaa-investments-page" dir="rtl">
      <section className="namaa-investments-shell namaa-wide-only">
        <header className="namaa-investments-header namaa-wide-card">
          <div className="namaa-investments-hero-copy">
            <p>بنك الأصول الاستثمارية</p>
            <h1>الاستثمارات</h1>
          </div>
          <span className="namaa-investments-building" aria-hidden="true">
            <Image src="/brand/ndos/banks/investment-assets-bank.jpg" alt="" fill priority sizes="(min-width: 1024px) 42vw, 80vw" />
            <span className="namaa-investments-building-shade" />
          </span>
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
            <div className="namaa-investments-chat-preview">
              <div className="namaa-investments-chat-people">
                <span><Image src={NAMAA_PERSONA_ASSETS['investment-owner']!} alt="" width={42} height={42} unoptimized/><strong>مسؤول الاستثمار</strong></span>
                <span><Image src={NAMAA_PERSONA_ASSETS['assets-manager']!} alt="" width={42} height={42} unoptimized/><strong>مدير بنك الأصول</strong></span>
              </div>
              <div className="namaa-investments-chat-window">
                <div className="namaa-investments-chat-placeholder"><LucideIcon name="messageSquareText" size={24}/><span>المحادثة الاستثمارية</span></div>
                <Link href="/conversations" className="namaa-investments-chat-composer"><span>اكتب رسالة...</span><LucideIcon name="messageSquareText" size={20}/></Link>
              </div>
            </div>
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
            </div>
            <div className="namaa-investments-dashboard-grid">
              <article><span className="namaa-investment-tile-icon"><LucideIcon name="chart" size={24}/></span><div><span>الأداء</span><strong>يظهر بعد اختيار المحفظة</strong></div></article>
              <article><span className="namaa-investment-tile-icon"><LucideIcon name="triangleAlert" size={24}/></span><div><span>المخاطر</span><strong>تقييم مستمر</strong></div></article>
              <article><span className="namaa-investment-tile-icon"><LucideIcon name="walletCards" size={24}/></span><div><span>السيولة</span><strong>حسب الأصول القابلة للتسييل</strong></div></article>
              <article><span className="namaa-investment-tile-icon"><LucideIcon name="listChecks" size={24}/></span><div><span>التوصيات</span><strong>تحتاج اعتماد المستخدم</strong></div></article>
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
                
              </article>
              <article>
                <strong>مراجعة أصل ضعيف</strong>
                
              </article>
              <article>
                <strong>تحديث النتائج</strong>
                
              </article>
            </div>
          </aside>
        </div>
      </section>
      <section className="namaa-mobile-only namaa-investments-mobile">
        <header className="p47-page-heading">
          <div>
            <p className="p47-kicker">بنك الأصول الاستثمارية</p>
            <h1>الاستثمارات</h1>
            <p className="p47-cycle-line">إدارة المحافظ والمنتجات الاستثمارية ومراجعة الأداء والمخاطر.</p>
          </div>
        </header>
        <section className="p47-panel">
          <div className="p47-section-heading">
            <div><p className="p47-kicker">المحفظة الحالية</p><h2>لم يتم اختيار محفظة</h2></div>
          </div>
          <div className="p47-soft-empty is-info">
            <strong>ابدأ بإضافة محفظة أو منتج استثماري</strong>
            <span>بعد الإضافة ستظهر هنا مؤشرات الأداء والمخاطر والسيولة والتوصيات المرتبطة بها.</span>
          </div>
          <div className="p47-inline-actions">
            <Link href="/conversations" className="p47-secondary-action">فتح فريق المحفظة</Link>
          </div>
        </section>
      </section>
    </main>
  );
}
