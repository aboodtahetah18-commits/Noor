import { COMPACT_GOVERNANCE_STAGE_FORMS } from '@/lib/governance/compact-governance-forms';
import { CompactGovernanceFormWorkspace } from '@/components/governance/compact-governance-form-workspace';

export default async function GovernanceFormsPage({searchParams}:{searchParams:Promise<{form?:string}>}){
  const query=await searchParams;
  return <main className="namaa-policy-library page-shell" dir="rtl">
    <header className="namaa-policy-library-header">
      <div>
        <span className="namaa-policy-eyebrow">النماذج التشغيلية الجديدة</span>
        <h1>نماذج مراحل الحوكمة</h1>
        <p>نموذج واحد لكل إجراء حاكم، من مطابقة البيانات حتى التحقق من تنفيذ المستخدم.</p>
      </div>
      <div className="namaa-policy-library-summary"><span><strong>{COMPACT_GOVERNANCE_STAGE_FORMS.length}</strong> نماذج</span></div>
    </header>
    <CompactGovernanceFormWorkspace forms={COMPACT_GOVERNANCE_STAGE_FORMS} initialFormId={query.form}/>
  </main>;
}
