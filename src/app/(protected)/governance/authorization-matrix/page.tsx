import { COMPACT_CORE_GOVERNANCE_DOCUMENTS } from '@/content/governance/compact-core-documents';
import { GovernanceDocumentLibrary } from '@/components/governance/governance-document-library';

const AUTHORIZATION_GOVERNANCE_DOCUMENTS=COMPACT_CORE_GOVERNANCE_DOCUMENTS.filter(
  (document)=>document.referenceCode==='NMC-CORE-07',
);

export default async function AuthorizationMatrixPage({searchParams}:{searchParams:Promise<{ref?:string}>}){
  const query=await searchParams;
  return <GovernanceDocumentLibrary
    documents={AUTHORIZATION_GOVERNANCE_DOCUMENTS}
    selectedReference={query.ref}
    title="مصفوفة الصلاحيات"
    subtitle="صفحة للاطلاع على الصلاحيات والاعتمادات المركزية. إدارة الصلاحيات التشغيلية تبقى في وحدة منفصلة للمخولين."
    documentLabel="وثيقة صلاحيات"
    basePath="/governance/authorization-matrix"
    icon="lockKeyhole"
  />;
}
