export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { syncGovernanceMeetingInvitations } from '@/lib/governance/governance-meeting-scheduler';

export async function GET(){
  const user=await getAuthenticatedUser();
  if(!user) return NextResponse.json({code:'AUTH_REQUIRED'},{status:401});
  try{
    const schedule=await syncGovernanceMeetingInvitations(user.id);
    return NextResponse.json(schedule);
  }catch(error){
    console.error('[governance-meetings]',{name:error instanceof Error?error.name:'UnknownError'});
    return NextResponse.json({code:'MEETINGS_UNAVAILABLE'},{status:503});
  }
}
