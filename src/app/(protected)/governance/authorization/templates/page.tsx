import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { authorizationRepository } from '@/repositories/authorization-repository';
import { listAuthorizationDirectoryUsers } from '@/repositories/authorization-directory-repository';
import { AUTHORIZATION_ROLE_TEMPLATES, AUTHORIZATION_TEMPLATE_VERSION } from '@/governance/authorization-role-templates';
import { requestAuthorizationAdministratorGrantAction, requestAuthorizationTemplateAction } from './actions';

function q(value: string | string[] | undefined): string | undefined { return Array.isArray(value) ? value[0] : value; }
const MESSAGE: Record<string,string> = {
  AUTHORIZATION_TEMPLATE_REQUESTED: 'تم إنشاء حزمة طلبات الدور والصلاحيات. لا يصبح أي منها فعالًا قبل اعتماد مستقل ثم تطبيق بواسطة شخص ثالث.',
  AUTHORIZATION_ADMIN_GRANT_REQUESTED: 'تم إنشاء طلب ADMINISTER مقيّد بالمستخدم المحدد. يحتاج اعتماد شخص ثانٍ وتطبيق شخص ثالث.',
  AUTHORIZATION_TEMPLATE_BANK_SCOPE_REQUIRED: 'هذا القالب يتطلب نطاق بنك محدد.',
  AUTHORIZATION_TEMPLATE_COMMITTEE_SCOPE_REQUIRED: 'هذا القالب يتطلب لجنة محددة.',
  AUTHORIZATION_TEMPLATE_NOT_FOUND: 'قالب الصلاحيات غير معروف.',
  ADMINISTER_GRANT_REQUIRES_PRINCIPAL: 'صلاحية ADMINISTER يجب أن تكون مرتبطة بمستخدم محدد.',
  PROVISIONING_RATIONALE_REQUIRED: 'المسوغ يجب أن يكون واضحًا وقابلًا للتدقيق.',
  AUTHORIZATION_TEMPLATE_REQUEST_FAILED: 'تعذر إنشاء حزمة القالب.',
};

export default async function AuthorizationTemplatesPage({ searchParams }: { searchParams?: Promise<Record<string,string|string[]|undefined>> }) {
  const user = await requireAuthenticatedUser();
  const access = await authorizationRepository.authorize({
    actorUserId: user.id,
    action: 'ADMINISTER',
    resource: { objectType: 'AUDIT_EVENT', objectId: 'authorization-template-console' },
  });
  if (access.decision !== 'ALLOW') notFound();
  const directory = await listAuthorizationDirectoryUsers();
  const query = searchParams ? await searchParams : {};
  const code = q(query.message);
  const feedback = code?.startsWith('AUTHORIZATION_DENIED:') ? 'لا تسمح صلاحياتك الحالية بهذا الإجراء.' : code ? (MESSAGE[code] ?? code) : null;
  const templateEntries = Object.entries(AUTHORIZATION_ROLE_TEMPLATES);

  return <main className="app-page p47-decision-page" dir="rtl">
    <div className="page-shell p47-analysis-shell">
      <header className="p47-analysis-header">
        <div>
          <p className="eyebrow">Authorization Templates</p>
          <h1>قوالب الأدوار والصلاحيات</h1>
          <p className="muted">القالب ينشئ Role Assignment وGrants كطلبات حوكمية فقط. لا يوجد اعتماد أو تطبيق تلقائي، ولا يحتوي أي قالب على ADMINISTER.</p>
        </div>
        <Link className="secondary-link" href="/governance/authorization">إدارة الصلاحيات</Link>
      </header>

      <div className="p74-inline-metrics">
        <span>نسخة القوالب <b>{AUTHORIZATION_TEMPLATE_VERSION}</b></span>
        <span>عدد القوالب <b>{templateEntries.length}</b></span>
        <span>فصل الواجبات <b>Requester ≠ Approver ≠ Applier</b></span>
      </div>

      {feedback ? <p role="status" className={q(query.status)==='error'?'form-error':'muted'}>{feedback}</p> : null}

      <section className="p47-analysis-card">
        <div className="p47-section-heading"><div><span>Provision Template</span><h2>إنشاء حزمة طلبات من قالب</h2></div><small>اختيار النطاق إلزامي للقوالب المتخصصة</small></div>
        <form action={requestAuthorizationTemplateAction} className="ndos-form-grid">
          <label><span>المستخدم المستفيد</span><select name="targetUserId" required>{directory.map((entry)=><option key={entry.id} value={entry.id}>{entry.displayName}</option>)}</select></label>
          <label><span>القالب</span><select name="templateKey" required>{templateEntries.map(([key,template])=><option key={key} value={key}>{key} — {template.scopeMode}</option>)}</select></label>
          <label><span>نطاق البنك</span><input name="bankKey" placeholder="مطلوب لقالب BANK_MANAGER" /></label>
          <label><span>اللجنة</span><input name="committeeId" placeholder="مطلوب لقوالب اللجان" /></label>
          <label><span>المسوغ</span><textarea name="rationale" required minLength={20} maxLength={4000} placeholder="لماذا يحتاج هذا المستخدم هذا الدور وهذا النطاق؟" /></label>
          <div className="ndos-actions"><button className="primary-button" type="submit">إنشاء حزمة الطلبات</button></div>
        </form>
      </section>

      <section className="p47-analysis-card">
        <div className="p47-section-heading"><div><span>Principal Admin</span><h2>طلب إدارة الصلاحيات لمستخدم محدد</h2></div><small>ليست جزءًا من أي قالب تشغيلي</small></div>
        <p className="muted">يجب أن يكون المستفيد صاحب دور CENTRAL_BANK_MANAGER فعّال. الطلب لا يمنحه ADMINISTER مباشرة؛ يحتاج اعتماد مدير مختلف ثم تطبيق مدير ثالث.</p>
        <form action={requestAuthorizationAdministratorGrantAction} className="ndos-form-grid">
          <label><span>المستخدم المحدد</span><select name="targetUserId" required>{directory.map((entry)=><option key={entry.id} value={entry.id}>{entry.displayName}</option>)}</select></label>
          <label><span>المسوغ</span><textarea name="rationale" required minLength={20} maxLength={4000} placeholder="لماذا يحتاج هذا المستخدم تحديدًا إلى إدارة نظام الصلاحيات؟" /></label>
          <div className="ndos-actions"><button className="secondary-button" type="submit">إنشاء طلب ADMINISTER المقيّد</button></div>
        </form>
      </section>

      <section className="p47-analysis-card">
        <div className="p47-section-heading"><div><span>Template Matrix</span><h2>محتوى القوالب المعتمدة</h2></div></div>
        {templateEntries.map(([key,template])=><details className="decision-details" key={key}>
          <summary>{key} — {template.scopeMode}</summary>
          <div className="p74-inline-metrics"><span>الدور <b>{template.role}</b></span><span>عدد Grants <b>{template.grants.length}</b></span></div>
          <ul>{template.grants.map((grant,index)=><li key={`${key}-${index}`}>{grant.action} / {grant.objectType}</li>)}</ul>
        </details>)}
      </section>
    </div>
  </main>;
}
