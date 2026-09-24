import Link from 'next/link';
import { LucideIcon } from '@/components/ui/lucide-icon';
import { CENTRAL_ACTIVE_POLICIES } from '@/content/governance/central-active-policies';

function renderPolicyContent(content:string){
  return content.split(/\r?\n/).map((raw,index)=>{
    const line=raw.trim();
    if(!line)return <div key={index} className="namaa-policy-reader-gap" aria-hidden="true"/>;
    if(line.startsWith('# '))return <h1 key={index}>{line.slice(2)}</h1>;
    if(line.startsWith('## '))return <h2 key={index}>{line.slice(3)}</h2>;
    if(line.startsWith('### '))return <h3 key={index}>{line.slice(4)}</h3>;
    if(line.startsWith('- '))return <div key={index} className="namaa-policy-reader-bullet"><span aria-hidden="true">•</span><p>{line.slice(2)}</p></div>;
    const numbered=line.match(/^(\d+)\.\s+(.*)$/u);
    if(numbered)return <div key={index} className="namaa-policy-reader-bullet"><span>{numbered[1]}</span><p>{numbered[2]}</p></div>;
    if(/^\*\*.+\*\*/u.test(line)){
      const plain=line.replace(/\*\*/g,'');
      const [label,...rest]=plain.split(':');
      return <div key={index} className="namaa-policy-meta-line"><strong>{label}</strong><span>{rest.join(':').trim()}</span></div>;
    }
    return <p key={index}>{line.replace(/\*\*/g,'')}</p>;
  });
}

export default async function PoliciesPage({searchParams}:{searchParams:Promise<{ref?:string}>}){
  const query=await searchParams;
  const selected=CENTRAL_ACTIVE_POLICIES.find(item=>item.referenceCode===query.ref)??CENTRAL_ACTIVE_POLICIES[0];
  return <main className="namaa-policy-library page-shell" dir="rtl">
    <header className="namaa-policy-library-header">
      <div>
        <span className="namaa-policy-eyebrow">المعرفة المؤسسية</span>
        <h1>السياسات</h1>
        <p>مكتبة الاطلاع على السياسات المعتمدة. اختر وثيقة من القائمة لقراءتها كاملة داخل المنصة.</p>
      </div>
      <div className="namaa-policy-library-summary">
        <span><strong>{CENTRAL_ACTIVE_POLICIES.length}</strong> وثائق</span>
        <Link href="/governance">العودة إلى المعرفة</Link>
      </div>
    </header>

    <section className="namaa-policy-library-layout">
      <aside className="namaa-policy-index" aria-label="قائمة السياسات">
        <div className="namaa-policy-index-head">
          <LucideIcon name="receiptText" size={24}/>
          <div><strong>فهرس السياسات</strong><span>اختر الوثيقة للاطلاع</span></div>
        </div>
        <nav>
          {CENTRAL_ACTIVE_POLICIES.map((policy,index)=>{
            const active=policy.referenceCode===selected.referenceCode;
            return <Link key={policy.referenceCode} className={active?'is-active':''} href={'/governance/policies?ref='+encodeURIComponent(policy.referenceCode)}>
              <span className="namaa-policy-index-number">{String(index+1).padStart(2,'0')}</span>
              <span className="namaa-policy-index-copy"><strong>{policy.title}</strong><small>{policy.referenceCode} · {policy.version??'المعتمد'}</small></span>
            </Link>;
          })}
        </nav>
      </aside>

      <article className="namaa-policy-reader">
        <header className="namaa-policy-reader-head">
          <div>
            <span>وثيقة سياسة</span>
            <h2>{selected.title}</h2>
            <div className="namaa-policy-reader-meta">
              <span>المرجع <strong>{selected.referenceCode}</strong></span>
              <span>الإصدار <strong>{selected.version??'المعتمد'}</strong></span>
              <span>الحالة <strong>معتمدة للاطلاع</strong></span>
            </div>
          </div>
          <span className="namaa-policy-reader-mark"><LucideIcon name="receiptText" size={24}/></span>
        </header>
        <section className="namaa-policy-reader-body">{renderPolicyContent(selected.content)}</section>
      </article>
    </section>
  </main>;
}
