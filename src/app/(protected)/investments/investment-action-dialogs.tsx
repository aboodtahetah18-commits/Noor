'use client';

import Link from 'next/link';
import { ActionDialog } from '@/components/overlays/action-dialog';
import { LucideIcon } from '@/components/ui/lucide-icon';

export function InvestmentActionDialogs() {
  return (
    <div className="namaa-investments-actions" aria-label="إجراءات الاستثمار">
      <ActionDialog title="إضافة محفظة استثمارية" description="أدخل تعريف المحفظة وبياناتها الأساسية دون مغادرة صفحة الاستثمارات." size="xl" triggerClassName="namaa-wide-action-secondary" trigger="إضافة محفظة">
        <div className="namaa-investment-dialog-content">
          <section className="namaa-investment-dialog-intro">
            <div><span>تعريف المحفظة</span><strong>بيانات المحفظة الأساسية</strong><p>هذه النافذة مخصصة لإضافة المحفظة نفسها، وليس للانتقال إلى مختبر الخوارزميات.</p></div>
            <LucideIcon name="plus" size={28} />
          </section>
          <form className="form-grid" onSubmit={(event)=>event.preventDefault()}>
            <label>اسم المحفظة<input name="portfolioName" placeholder="مثال: محفظة النمو طويلة الأجل" /></label>
            <label>الجهة أو المنصة<input name="provider" placeholder="اسم البنك أو المنصة المرخصة" /></label>
            <label>نوع المحفظة<select name="portfolioType" defaultValue="MIXED"><option value="EQUITY">أسهم</option><option value="FUNDS">صناديق</option><option value="DEBT">أدوات دين</option><option value="REAL_ASSETS">أصول حقيقية</option><option value="MIXED">متنوعة</option><option value="OTHER">أخرى</option></select></label>
            <label>العملة<select name="currency" defaultValue="SAR"><option value="SAR">ريال سعودي</option><option value="USD">دولار أمريكي</option><option value="OTHER">أخرى</option></select></label>
            <label>القيمة الحالية<input name="currentValue" inputMode="decimal" placeholder="0.00" /></label>
            <label>السيولة المتاحة<input name="cashValue" inputMode="decimal" placeholder="0.00" /></label>
            <label>رقم/مرجع المحفظة<input name="portfolioReference" placeholder="اختياري" /></label>
            <label>درجة المخاطر<select name="riskLevel" defaultValue="MEDIUM"><option value="LOW">منخفضة</option><option value="MEDIUM">متوسطة</option><option value="HIGH">مرتفعة</option></select></label>
            <label className="namaa-investment-dialog-full">ملاحظات<textarea name="notes" rows={4} placeholder="أي تفاصيل مهمة عن المحفظة أو القيود الاستثمارية" /></label>
            <div className="p49-dialog-actions namaa-investment-dialog-full"><button type="button" className="primary-button">حفظ بيانات المحفظة</button></div>
          </form>
        </div>
      </ActionDialog>

      <ActionDialog title="طلب تحليل استثماري" description="حدد ما تريد تحليله قبل إرسال الطلب إلى فريق التحليل." size="lg" triggerClassName="namaa-wide-action-secondary" trigger="طلب تحليل">
        <div className="namaa-investment-dialog-content">
          <section className="namaa-investment-dialog-intro">
            <div><span>تحليل موجه</span><strong>حدد نطاق التحليل أولًا</strong><p>يمكن طلب تحليل محفظة كاملة أو أصل محدد، مع توضيح الأفق والمخاطر المطلوب التركيز عليها.</p></div>
            <LucideIcon name="chart" size={28} />
          </section>
          <form className="form-grid" onSubmit={(event)=>event.preventDefault()}>
            <label>المحفظة أو الأصل<input name="target" placeholder="اسم المحفظة أو الأصل" /></label>
            <label>نوع التحليل<select name="analysisType" defaultValue="FULL"><option value="FULL">تحليل شامل</option><option value="RISK">مخاطر</option><option value="LIQUIDITY">سيولة</option><option value="PERFORMANCE">أداء</option><option value="EXIT">جدوى الخروج</option><option value="ENTRY">جدوى الدخول</option></select></label>
            <label>الأفق الزمني<select name="horizon" defaultValue="MEDIUM"><option value="SHORT">قصير</option><option value="MEDIUM">متوسط</option><option value="LONG">طويل</option></select></label>
            <label>الأولوية<select name="priority" defaultValue="NORMAL"><option value="NORMAL">عادية</option><option value="HIGH">مرتفعة</option><option value="URGENT">عاجلة</option></select></label>
            <label className="namaa-investment-dialog-full">السؤال أو الهدف<textarea name="question" rows={5} placeholder="مثال: هل مستوى المخاطر الحالي مناسب؟ وما الأصول التي تحتاج مراجعة؟" /></label>
            <div className="p49-dialog-actions namaa-investment-dialog-full"><Link href="/advisor" className="primary-link">فتح التحليل في مختبر الخوارزميات</Link></div>
          </form>
        </div>
      </ActionDialog>

      <ActionDialog title="تحديث المحفظة عبر الدردشة" description="اختر سياق التحديث ثم افتح محادثة الفريق المرتبطة بالمحفظة." size="lg" triggerClassName="namaa-wide-action-secondary" trigger="التحديث عبر الدردشة">
        <div className="namaa-investment-dialog-content">
          <section className="namaa-investment-dialog-intro">
            <div><span>محادثة مرتبطة بالمحفظة</span><strong>تحديث البيانات مع الفريق المختص</strong><p>يشارك مسؤول الاستثمار ومدير بنك الأصول واللجنة المختصة عند الحاجة.</p></div>
            <LucideIcon name="messageSquareText" size={28} />
          </section>
          <div className="namaa-investment-dialog-grid">
            <article><span>نوع التحديث</span><strong>قيمة أو رصيد أو أصل جديد</strong><p>استخدم الدردشة لإرسال التغيير مع الإثباتات أو الملاحظات.</p></article>
            <article><span>قرار استثماري</span><strong>مراجعة توصية أو مخاطرة</strong><p>المناقشة لا تنفذ أي شراء أو بيع تلقائيًا.</p></article>
            <article><span>متابعة</span><strong>نتائج أداء أو تنبيه</strong><p>يمكن طلب تفسير نتيجة أو متابعة توصية سابقة.</p></article>
          </div>
          <div className="p49-dialog-actions"><Link href="/conversations" className="primary-link">فتح محادثة المحفظة</Link></div>
        </div>
      </ActionDialog>

      <ActionDialog title="متابعة المحافظ والاستثمارات" description="راجع ما يحتاج انتباهًا قبل الانتقال إلى التقارير التفصيلية." size="lg" triggerClassName="namaa-wide-action-secondary" trigger="عرض المتابعة">
        <div className="namaa-investment-dialog-content">
          <section className="namaa-investment-dialog-intro">
            <div><span>المتابعة</span><strong>حالة المحافظ والتوصيات</strong><p>تعرض هذه النافذة نقاط المتابعة التشغيلية، ثم يمكنك فتح المرصد للتفاصيل التاريخية.</p></div>
            <LucideIcon name="listChecks" size={28} />
          </section>
          <div className="namaa-investment-dialog-grid">
            <article><span>المحافظ</span><strong>تظهر بعد الربط</strong><p>عدد المحافظ النشطة وقيمتها المجمعة.</p></article>
            <article><span>تنبيهات المخاطر</span><strong>تظهر عند وجود حالة</strong><p>أي أصل أو محفظة تجاوزت حدود المتابعة.</p></article>
            <article><span>التوصيات المفتوحة</span><strong>بانتظار قرار المستخدم</strong><p>لا يتم تنفيذ أي توصية تلقائيًا.</p></article>
          </div>
          <div className="p49-dialog-actions"><Link href="/reports" className="primary-link">فتح المرصد والتقارير</Link></div>
        </div>
      </ActionDialog>
    </div>
  );
}
