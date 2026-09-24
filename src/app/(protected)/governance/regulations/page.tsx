import { CENTRAL_ACTIVE_REGULATIONS } from '@/content/governance/central-active-regulations';
import { GovernanceDocumentLibrary } from '@/components/governance/governance-document-library';

export default async function RegulationsPage({searchParams}:{searchParams:Promise<{ref?:string}>}){
  const query=await searchParams;
  return <GovernanceDocumentLibrary
    documents={CENTRAL_ACTIVE_REGULATIONS}
    selectedReference={query.ref}
    title="اللوائح"
    subtitle="مكتبة الاطلاع على اللوائح التنظيمية المعتمدة ومسارات التطبيق المرتبطة بها."
    documentLabel="وثيقة لائحة"
    basePath="/governance/regulations"
    icon="receiptText"
  />;
}
