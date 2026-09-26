import Link from 'next/link';
import { COMPACT_PROCEDURES } from '@/lib/governance/compact-authority-model';
import { COMPACT_GOVERNANCE_STAGE_FORMS } from '@/lib/governance/compact-governance-forms';

export default function ProceduresPage(){
  return <main className="namaa-governance-portal page-shell" dir="rtl">
    <header className="namaa-governance-portal-hero">
      <div>
        <span>المسار التشغيلي الجديد</span>
        <h1>الإجراءات المختصرة</h1>
        <p>سبعة إجراءات فقط، وكل إجراء له نموذج تشغيل واضح ومخرج محدد.</p>
      </div>
      <div className="namaa-governance-portal-total">
        <strong>{COMPACT_PROCEDURES.length}</strong>
        <span>إجراءات حاكمة</span>
      </div>
    </header>

    <section className="namaa-governance-portal-grid">
      {COMPACT_PROCEDURES.map((procedure,index)=>{
        const form=COMPACT_GOVERNANCE_STAGE_FORMS.find(item=>item.procedureKey===procedure.key);
        return <article className="namaa-governance-library-card card-procedure" key={procedure.key}>
          <header><div><span>المرحلة {String(index+1).padStart(2,'0')}</span><h2>{procedure.arabicName}</h2></div></header>
          <p>{procedure.purpose}</p>
          <div className="namaa-governance-doc-preview">
            {procedure.steps.map((step,stepIndex)=><div key={step}><strong>{stepIndex+1}. {step}</strong></div>)}
          </div>
          {form?<Link className="namaa-governance-open-library" href={'/governance/forms?form='+encodeURIComponent(form.id)}>فتح النموذج التشغيلي</Link>:null}
        </article>;
      })}
    </section>
  </main>;
}
