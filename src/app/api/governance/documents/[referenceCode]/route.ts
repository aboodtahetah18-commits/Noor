export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getLocalGovernanceDocument } from '@/content/governance';

const headers={'Cache-Control':'private, max-age=300'};

export async function GET(_request:Request,{params}:{params:Promise<{referenceCode:string}>}){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401,headers});
  const {referenceCode}=await params;
  const document=getLocalGovernanceDocument(decodeURIComponent(referenceCode));
  if(!document)return NextResponse.json({ok:false,error:'DOCUMENT_NOT_FOUND'},{status:404,headers});
  return NextResponse.json({
    ok:true,
    document:{
      title:document.title,
      kind:document.kind,
      version:document.version,
      content:document.content,
    },
  },{headers});
}
