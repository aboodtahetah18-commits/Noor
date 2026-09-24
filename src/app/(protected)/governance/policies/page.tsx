import { CENTRAL_ACTIVE_POLICIES } from '@/content/governance/central-active-policies';
import { GovernanceDocumentLibrary } from '@/components/governance/governance-document-library';

export default async function PoliciesPage({searchParams}:{searchParams:Promise<{ref?:string}>}){
  const query=await searchParams;
  return <GovernanceDocumentLibrary
    documents={CENTRAL_ACTIVE_POLICIES}
    selectedReference={query.ref}
    title="السياسات"
    subtitle="مكتبة الاطلاع على السياسات المعتمدة. اختر وثيقة من القائمة لقراءتها كاملة داخل المنصة."
    documentLabel="وثيقة سياسة"
    basePath="/governance/policies"
    icon="receiptText"
  />;
}
