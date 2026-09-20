export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { governedRoomDetails } from '@/lib/conversations/governed-room-details';
import { embeddedGovernanceContent, splitGovernanceContent } from '@/lib/governance/embedded-governance-content';

const headers={'Cache-Control':'private, max-age=300'};

export async function GET(request:Request){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({ok:false,error:'غير مصرح'},{status:401,headers});
  const url=new URL(request.url);
  const reference=url.searchParams.get('reference')?.trim()??'';
  if(!reference)return NextResponse.json({ok:false,error:'المرجع مطلوب'},{status:400,headers});

  const documents=Object.values(governedRoomDetails).flatMap(detail=>[...detail.records,...detail.policies]);
  const document=documents.find(item=>item.referenceCode===reference);
  if(!document)return NextResponse.json({ok:false,error:'المرجع غير موجود'},{status:404,headers});

  const content=embeddedGovernanceContent(document.sourceUrl);
  return NextResponse.json({
    ok:true,
    title:document.title,
    sections:content?splitGovernanceContent(content):[],
    archivedSourceAvailable:Boolean(document.sourceUrl),
  },{headers});
}
