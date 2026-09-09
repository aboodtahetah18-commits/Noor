import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getOnboardingStatus } from '@/features/onboarding/queries/get-onboarding-status';
import { resolveOnboardingRoute } from '@/features/onboarding/queries/resolve-onboarding-route';
import { startOnboardingAction } from './actions';

export default async function OnboardingPage() {
  const user = await requireAuthenticatedUser();
  const status = await getOnboardingStatus(user.id);
  const route = resolveOnboardingRoute(status);
  if (route !== '/onboarding') redirect(route);

  return (
    <main className="onboarding-page p47-closure-page" dir="rtl">
      <section className="onboarding-welcome">
        <p className="eyebrow">بدء الاستخدام</p>
        <h1>جهّز الأساس المالي أولًا، ثم أضف التفاصيل الاختيارية</h1>
        <p>سنطلب الحد الأدنى اللازم لبناء أول خطة مالية. إعداد الطوارئ والأهداف وبعض التفاصيل الإضافية يمكن تخطيه والعودة إليه لاحقًا.</p>
        <div className="onboarding-checklist onboarding-checklist-refined">
          <span><b>مطلوب</b> الحسابات والأرصدة الافتتاحية</span>
          <span><b>مطلوب</b> الدخل وتاريخ الراتب القادم</span>
          <span><b>مراجعة</b> الالتزامات الحالية</span>
          <span><b>اختياري</b> الطوارئ والأهداف</span>
          <span><b>مطلوب</b> إنشاء واعتماد الخطة الأولى</span>
        </div>
        <p className="onboarding-note">يمكنك الرجوع إلى الخطوات السابقة قبل إنهاء الإعداد.</p>
        <form action={startOnboardingAction}><button className="primary-button" type="submit">ابدأ الإعداد</button></form>
      </section>
    </main>
  );
}
