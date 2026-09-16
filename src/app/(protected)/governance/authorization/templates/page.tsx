import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/auth/require-authenticated-user';
import { authorizationRepository } from '@/repositories/authorization-repository';
import { AUTHORIZATION_GRANT_TEMPLATES } from '@/governance/authorization-role-templates';
import { createGrantFromTemplateAction } from './actions';

function q(v:string|string[]|undefined):string|undefined { return Array.isArray(v)?v[0]:v; }

export default async function AuthorizationTemplatesPage({searchParams}:{searchParams?:Promise<Record<string,string|string[]|undefined>>}) {
  const user=await requireAuthenticatedUser();
  const query=searchParams?await searchParams:{};
  const access=await authorizationRepository.authorize({
    actorUserId:user.id,
    action:'ADMINISTER',
    resource:{objectType:'AUDIT_EVENT',objectId:'authorization-template-console'},
  });
  if(access.decision!=='ALLOW') notFound();

  return <main className="app-page p47-decision-page" dir="rtl">
    <div className="page-shell p47-analysis-shell">
      <header className="p47-analysis-header">
        <div>
          <p className="eyebrow">Authorization Templates</p>
          <h1>قوالب الصلاحيات المعتمدة</h1>
          <p className="muted">اختيار القالب لا يمنح الصلاحية مباشرة؛ بل ينشئ طلب Provisioning يخضع لاعتماد مستقل ثم تطبيق ذري.</p>
        </div>
        <Link className="secondary-button" href="/governance/authorization">العودة لإدارة الصلاحيات</Link>
      </header>

      {q(query.status)==='error'?<p role="alert" className="form-error">{q(query.message)??'تعذر إنشاء الطلب من القالب.'}</p>:null}

      <section className="p47-analysis-card">
        <div className="p47-section-heading"><div><span>Official Templates</span><h2>اختر القالب المناسب</h2></div><small>النطاقات BANK وCOMMITTEE إلزامية عند تطبيق القالب</small></div>
        <div className="p47-analysis-grid">
          {AUTHORIZATION_GRANT_TEMPLATES.map((template)=><details className="decision-details" key={template.key}>
            <summary>{template.role} — {template.action} / {template.objectType}</summary>
            <p>{template.description}</p>
            <div className="p74-inline-metrics">
              <span>النطاق <b>{template.scope}</b></span>
              <span>أقصى مخاطرة <b>{template.maxRisk??'—'}</b></span>
              <span>أقصى مادية <b>{template.maxMateriality??'—'}</b></span>
              <span>المعرف <b>{template.key}</b></span>
            </div>
            <form action={createGrantFromTemplateAction} className="ndos-form-grid">
              <input type="hidden" name="templateKey" value={template.key}/>
              {template.scope==='BANK'?<label><span>معرف البنك الداخلي</span><input name="bankKey" required placeholder="مثال: SOLVENCY"/></label>:null}
              {template.scope==='COMMITTEE'?<label><span>معرف اللجنة</span><input name="committeeId" required placeholder="معرف اللجنة"/></label>:null}
              <label><span>نوع القضية</span><input name="caseType" placeholder="اختياري"/></label>
              <label><span>أقصى مبلغ</span><input type="number" min="0" step="0.01" name="maxAmount" placeholder="اختياري"/></label>
              <label><span>المسوغ</span><textarea name="rationale" required minLength={20} placeholder="سبب الحاجة إلى هذا القالب ونطاق استخدامه"/></label>
              <div className="ndos-actions"><button className="primary-button" type="submit">إنشاء طلب من القالب</button></div>
            </form>
          </details>)}
        </div>
      </section>
    </div>
  </main>;
}
