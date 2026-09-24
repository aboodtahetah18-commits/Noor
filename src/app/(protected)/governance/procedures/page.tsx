import { CENTRAL_ACTIVE_PROCEDURES } from '@/content/governance/central-active-procedures';
import { GovernanceDocumentLibrary } from '@/components/governance/governance-document-library';

export default async function ProceduresPage({searchParams}:{searchParams:Promise<{ref?:string}>}){
  const query=await searchParams;
  return <GovernanceDocumentLibrary
    documents={CENTRAL_ACTIVE_PROCEDURES}
    selectedReference={query.ref}
    title="الإجراءات"
    subtitle="مكتبة الاطلاع على الإجراءات التشغيلية وحزم الخطوات المرتبطة بالسياسات واللوائح."
    documentLabel="وثيقة إجراء"
    basePath="/governance/procedures"
    icon="listChecks"
  />;
}
