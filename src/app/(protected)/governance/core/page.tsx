import { COMPACT_CORE_GOVERNANCE_DOCUMENTS } from '@/content/governance/compact-core-documents';
import { GovernanceDocumentLibrary } from '@/components/governance/governance-document-library';

export default async function CoreGovernancePage({searchParams}:{searchParams:Promise<{ref?:string}>}){
  const query=await searchParams;
  return <GovernanceDocumentLibrary
    documents={COMPACT_CORE_GOVERNANCE_DOCUMENTS}
    selectedReference={query.ref}
    title="المراجع الحاكمة الجديدة"
    subtitle="سبعة مراجع مختصرة هي المصدر الحاكم الحالي بدل مكتبات السياسات واللوائح القديمة."
    documentLabel="مرجع حاكم"
    basePath="/governance/core"
    icon="receiptText"
  />;
}
