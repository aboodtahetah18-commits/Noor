import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getOnboardingStatus } from '@/features/onboarding/queries/get-onboarding-status';
import { continueFromControlsAction } from '../actions';
import { OnboardingStepNav } from '@/features/onboarding/components/onboarding-step-nav';

export default async function Page(){
 const u=await requireAuthenticatedUser();const s=await getOnboardingStatus(u.id);if(s.completed)redirect('/dashboard');if(!s.cycleId||s.expectedIncomeCount<1)redirect('/onboarding/income');if(!s.obligationsReviewed)redirect('/onboarding/obligations');
 return <main className="app-page onboarding-page" dir="rtl"><div className="page-shell narrow-shell p47-closure-page"><div className="onboarding-progress"><span>5 من 6</span><strong>الحماية والأهداف</strong></div><OnboardingStepNav current="/onboarding/controls"/><header className="page-header p47-closure-header"><div><p className="eyebrow">خطوة اختيارية</p><div className="title-with-help"><h1>يمكنك تجهيز الحماية والأهداف الآن أو لاحقًا</h1></div></div></header>
 <section className="card onboarding-review-card"><div><h2>الحد الأدنى مكتمل</h2><p className="muted">الحسابات والدخل والالتزامات تمت مراجعتها. يمكنك الانتقال مباشرة لإنشاء الخطة الأولى.</p></div><form action={continueFromControlsAction}><button className="primary-button" type="submit">متابعة إلى الخطة</button></form></section>
 <details className="onboarding-optional-details" open={s.emergencyConfigured||s.goalsCount>0}><summary>إعدادات اختيارية للحماية والنمو</summary><div className="onboarding-option-grid onboarding-details-body"><article className="card"><h2>الادخار</h2><p>سيتم تحديد مبلغ الادخار داخل الخطة الأولى، ولا تحتاج إلى إعداد منفصل هنا.</p><Link className="secondary-link" href="/budget">عرض الميزانية</Link></article><article className="card"><h2>صندوق الطوارئ</h2><p>{s.emergencyConfigured?'تم إعداد صندوق الطوارئ.':'يمكنك تحديد هدف صندوق الطوارئ الآن أو لاحقًا.'}</p><Link className="secondary-link" href="/emergency/configure">{s.emergencyConfigured?'تعديل الإعداد':'إعداد الصندوق'}</Link></article><article className="card"><h2>الأهداف</h2><p>{s.goalsCount>0?`لديك ${s.goalsCount} هدف/أهداف.`:'إضافة الهدف اختيارية ويمكن تأجيلها.'}</p><Link className="secondary-link" href="/goals/new">إضافة هدف</Link></article></div></details>
 </div></main>}
