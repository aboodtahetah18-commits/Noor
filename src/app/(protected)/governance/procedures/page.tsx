import { LOCAL_GOVERNANCE_DOCUMENTS } from '@/content/governance';
import { GovernanceDocumentLibrary } from '@/components/governance/governance-document-library';

const PROCEDURE_DOCUMENTS=LOCAL_GOVERNANCE_DOCUMENTS.filter((item)=>{
  const haystack=(item.referenceCode+' '+item.title+' '+item.url).toLowerCase();
  return haystack.includes('إجراء')||haystack.includes('procedure')||haystack.includes('op01')||haystack.includes('op02')||haystack.includes('op03')||haystack.includes('/الإجراءات/');
});

export default async function ProceduresPage({searchParams}:{searchParams:Promise<{ref?:string}>}){
  const query=await searchParams;
  return <GovernanceDocumentLibrary
    documents={PROCEDURE_DOCUMENTS}
    selectedReference={query.ref}
    title="الإجراءات"
    subtitle="مكتبة الاطلاع على الإجراءات التشغيلية وحزم الخطوات المرتبطة بالسياسات واللوائح."
    documentLabel="وثيقة إجراء"
    basePath="/governance/procedures"
    icon="listChecks"
  />;
}
