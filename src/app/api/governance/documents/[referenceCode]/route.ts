export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getLocalGovernanceDocument } from '@/content/governance';
import { applyGovernanceTypoCorrections } from '@/lib/governance/governance-amendments';

const headers={'Cache-Control':'private, max-age=300'};

export async function GET(_request:Request,{params}:{params:Promise<{referenceCode:string}>}){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401,headers});
  const {referenceCode}=await params;
  const decodedReference=decodeURIComponent(referenceCode);
  const document=getLocalGovernanceDocument(decodedReference);
  if(!document)return NextResponse.json({ok:false,error:'DOCUMENT_NOT_FOUND'},{status:404,headers});
  const content=await applyGovernanceTypoCorrections(user.id,decodedReference,document.content);
  return NextResponse.json({
    ok:true,
    document:{
      title:document.title,
      kind:document.kind,
      version:document.version,
      content,
    },
  },{headers});
}
