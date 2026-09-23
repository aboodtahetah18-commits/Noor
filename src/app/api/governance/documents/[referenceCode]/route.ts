export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getLocalGovernanceDocument } from '@/content/governance';
import {
  applyEffectiveGovernanceAmendments,
  applyGovernanceDirectChanges,
  applyGovernanceTypoCorrections,
} from '@/lib/governance/governance-amendments';

const headers={'Cache-Control':'private, no-store, max-age=0'};

export async function GET(_request:Request,{params}:{params:Promise<{referenceCode:string}>}){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401,headers});
  const {referenceCode}=await params;
  const decodedReference=decodeURIComponent(referenceCode);
  const document=getLocalGovernanceDocument(decodedReference);
  if(!document)return NextResponse.json({ok:false,error:'DOCUMENT_NOT_FOUND'},{status:404,headers});
  let content=await applyGovernanceDirectChanges(user.id,decodedReference,document.content);
  content=await applyGovernanceTypoCorrections(user.id,decodedReference,content);
  content=await applyEffectiveGovernanceAmendments(user.id,decodedReference,content);
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
