export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getEntityOperationalDashboard } from '@/lib/conversations/entity-operational-dashboard';
import type { ConversationRoomKey } from '@/lib/conversations/store';

const allowed=new Set<ConversationRoomKey>(['central','operations','solvency','assets','hilal','advisor','secretary','council']);

export async function GET(_request:Request,{params}:{params:Promise<{roomKey:string}>}){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401,headers:{'Cache-Control':'no-store'}});
  const {roomKey}=await params;
  if(!allowed.has(roomKey as ConversationRoomKey)){
    return NextResponse.json({ok:false,error:'UNKNOWN_ROOM'},{status:404,headers:{'Cache-Control':'no-store'}});
  }
  try{
    const dashboard=await getEntityOperationalDashboard(user.id,roomKey as ConversationRoomKey);
    return NextResponse.json({ok:true,dashboard},{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    console.error('[entity-operational-dashboard]',{name:error instanceof Error?error.name:'UnknownError'});
    return NextResponse.json({ok:false,error:'ENTITY_DASHBOARD_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
