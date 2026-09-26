import Link from 'next/link';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { COMPACT_CORE_GOVERNANCE_DOCUMENTS } from '@/content/governance/compact-core-documents';
import { COMPACT_PROCEDURES, COMPACT_AUTHORITIES } from '@/lib/governance/compact-authority-model';
import { COMPACT_GOVERNANCE_STAGE_FORMS } from '@/lib/governance/compact-governance-forms';

export default function GovernancePage(){
  return <main className="namaa-governance-portal page-shell" dir="rtl">
    <header className="namaa-governance-portal-hero">
      <div>
        <span>الحوكمة المختصرة</span>
        <h1>مركز الحوكمة الجديد</h1>
        <p>تم استبدال مكتبات السياسات واللوائح القديمة بسبعة مراجع حاكمة وسبعة إجراءات وصلاحيات محددة ونموذج تشغيلي لكل مرحلة.</p>
      </div>
      <div className="namaa-governance-portal-total">
        <strong>{COMPACT_CORE_GOVERNANCE_DOCUMENTS.length}</strong>
        <span>مراجع حاكمة فقط</span>
      </div>
    </header>

    <section className="namaa-governance-portal-metrics" aria-label="ملخص الحوكمة المختصرة">
      <article className="tone-policy"><span>المراجع الحاكمة</span><strong>{COMPACT_CORE_GOVERNANCE_DOCUMENTS.length}</strong><small>بدل السياسات واللوائح المتفرقة</small></article>
      <article className="tone-procedure"><span>الإجراءات</span><strong>{COMPACT_PROCEDURES.length}</strong><small>مسارات تشغيل محددة</small></article>
      <article className="tone-auth"><span>الصلاحيات</span><strong>{COMPACT_AUTHORITIES.length}</strong><small>كلها بلا تنفيذ مالي خارجي</small></article>
      <article className="tone-regulation"><span>النماذج</span><strong>{COMPACT_GOVERNANCE_STAGE_FORMS.length}</strong><small>نموذج لكل مرحلة</small></article>
    </section>

    <section className="namaa-governance-portal-grid">
      <article className="namaa-governance-library-card card-policy">
        <header><div><span>المصدر الحاكم</span><h2>المراجع السبعة</h2></div><LucideIcon name="receiptText" size={24}/></header>
        <p>الحساب، الحماية، حالات المال، القرار، التعلم، الذاكرة، والصلاحيات في حزمة واحدة مختصرة.</p>
        <div className="namaa-governance-doc-preview">
          {COMPACT_CORE_GOVERNANCE_DOCUMENTS.slice(0,3).map(item=><Link key={item.referenceCode} href={'/governance/core?ref='+encodeURIComponent(item.referenceCode)}>
            <strong>{item.title}</strong><small>{item.referenceCode} · {item.version??'الحالي'}</small>
          </Link>)}
        </div>
        <Link className="namaa-governance-open-library" href="/governance/core">فتح المراجع الحاكمة</Link>
      </article>

      <article className="namaa-governance-library-card card-procedure">
        <header><div><span>المسار التشغيلي</span><h2>الإجراءات السبعة</h2></div><LucideIcon name="listChecks" size={24}/></header>
        <p>من مطابقة البيانات إلى التحقق من التنفيذ، دون تضخم في المسارات أو اللجان.</p>
        <div className="namaa-governance-doc-preview">
          {COMPACT_PROCEDURES.slice(0,3).map((item,index)=><div key={item.key}><strong>{index+1}. {item.arabicName}</strong><small>{item.purpose}</small></div>)}
        </div>
        <Link className="namaa-governance-open-library" href="/governance/procedures">فتح الإجراءات</Link>
      </article>

      <article className="namaa-governance-library-card card-regulation">
        <header><div><span>التشغيل والتوثيق</span><h2>نماذج المراحل</h2></div><LucideIcon name="receiptText" size={24}/></header>
        <p>كل مرحلة لها مدخلات ومخرج وقائمة تحقق ونموذج يمكن حفظه كسجل حوكمي.</p>
        <div className="namaa-governance-doc-preview">
          {COMPACT_GOVERNANCE_STAGE_FORMS.slice(0,3).map(form=><Link key={form.id} href={'/governance/forms?form='+encodeURIComponent(form.id)}>
            <strong>{form.title}</strong><small>{form.id} · المرحلة {form.stage}</small>
          </Link>)}
        </div>
        <Link className="namaa-governance-open-library" href="/governance/forms">فتح النماذج</Link>
      </article>

      <article className="namaa-governance-library-card card-auth">
        <header><div><span>حدود السلطة</span><h2>الصلاحيات المختصرة</h2></div><LucideIcon name="lockKeyhole" size={24}/></header>
        <p>سبع صلاحيات تشغيلية فقط، والتنفيذ المالي الخارجي يبقى بيد المستخدم.</p>
        <div className="namaa-governance-doc-preview">
          {COMPACT_AUTHORITIES.slice(0,3).map(item=><div key={item.action}><strong>{item.arabicName}</strong><small>{item.description}</small></div>)}
        </div>
        <Link className="namaa-governance-open-library" href="/governance/authorization-matrix">فتح مصفوفة الصلاحيات</Link>
      </article>
    </section>

    <section className="namaa-governance-portal-footer">
      <div><strong>لا توجد مكتبة سياسات أو لوائح موازية</strong><span>أي قاعدة حاكمة جديدة يجب أن تدخل ضمن المراجع السبعة أو تمر بمسار تعديل حوكمي موثق.</span></div>
      <Link href="/conversations">مناقشة تعديل مع الجهة المختصة</Link>
    </section>
  </main>;
}
