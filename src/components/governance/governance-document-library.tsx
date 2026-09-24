import Link from 'next/link';
import { LucideIcon } from '@/components/ui/lucide-icon';

export type GovernanceLibraryDocument={
  referenceCode:string;
  title:string;
  version:string|null;
  content:string;
};

function renderDocumentContent(content:string){
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

export function GovernanceDocumentLibrary({
  documents,
  selectedReference,
  title,
  subtitle,
  documentLabel,
  basePath,
  icon='receiptText',
}:{
  documents:readonly GovernanceLibraryDocument[];
  selectedReference?:string;
  title:string;
  subtitle:string;
  documentLabel:string;
  basePath:string;
  icon?:'receiptText'|'listChecks'|'lockKeyhole';
}){
  const selected=documents.find(item=>item.referenceCode===selectedReference)??documents[0]??null;
  return <main className="namaa-policy-library page-shell" dir="rtl">
    <header className="namaa-policy-library-header">
      <div>
        <span className="namaa-policy-eyebrow">المعرفة المؤسسية</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="namaa-policy-library-summary">
        <span><strong>{documents.length}</strong> وثائق</span>
        <Link href="/governance">العودة إلى المعرفة</Link>
      </div>
    </header>

    {selected?<section className="namaa-policy-library-layout">
      <aside className="namaa-policy-index" aria-label={'قائمة '+title}>
        <div className="namaa-policy-index-head">
          <LucideIcon name={icon} size={24}/>
          <div><strong>فهرس {title}</strong><span>اختر الوثيقة للاطلاع</span></div>
        </div>
        <nav>
          {documents.map((document,index)=>{
            const active=document.referenceCode===selected.referenceCode;
            return <Link key={document.referenceCode} className={active?'is-active':''} href={basePath+'?ref='+encodeURIComponent(document.referenceCode)}>
              <span className="namaa-policy-index-number">{String(index+1).padStart(2,'0')}</span>
              <span className="namaa-policy-index-copy"><strong>{document.title}</strong><small>{document.referenceCode} · {document.version??'المعتمد'}</small></span>
            </Link>;
          })}
        </nav>
      </aside>

      <article className="namaa-policy-reader">
        <header className="namaa-policy-reader-head">
          <div>
            <span>{documentLabel}</span>
            <h2>{selected.title}</h2>
            <div className="namaa-policy-reader-meta">
              <span>المرجع <strong>{selected.referenceCode}</strong></span>
              <span>الإصدار <strong>{selected.version??'المعتمد'}</strong></span>
              <span>الحالة <strong>للاطلاع</strong></span>
            </div>
          </div>
          <span className="namaa-policy-reader-mark"><LucideIcon name={icon} size={24}/></span>
        </header>
        <section className="namaa-policy-reader-body">{renderDocumentContent(selected.content)}</section>
      </article>
    </section>:<section className="namaa-policy-library-empty">
      <LucideIcon name={icon} size={24}/>
      <div><strong>لا توجد وثائق ضمن هذا القسم</strong><p>لا توجد مادة مرجعية مرتبطة بهذا النوع في المصدر المحلي الحالي.</p></div>
    </section>}
  </main>;
}
