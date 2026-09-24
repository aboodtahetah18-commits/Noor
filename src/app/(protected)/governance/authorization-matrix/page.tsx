import { CENTRAL_AUTHORIZATION_DOCUMENTS } from '@/content/governance/central-authorization-documents';
import { GovernanceDocumentLibrary } from '@/components/governance/governance-document-library';

export default async function AuthorizationMatrixPage({searchParams}:{searchParams:Promise<{ref?:string}>}){
  const query=await searchParams;
  return <GovernanceDocumentLibrary
    documents={CENTRAL_AUTHORIZATION_DOCUMENTS}
    selectedReference={query.ref}
    title="مصفوفة الصلاحيات"
    subtitle="صفحة للاطلاع على الصلاحيات والاعتمادات المركزية. إدارة الصلاحيات التشغيلية تبقى في وحدة منفصلة للمخولين."
    documentLabel="وثيقة صلاحيات"
    basePath="/governance/authorization-matrix"
    icon="lockKeyhole"
  />;
}
