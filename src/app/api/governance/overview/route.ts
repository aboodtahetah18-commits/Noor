export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getGovernanceOverview } from '@/lib/governance/governance-overview';

export async function GET(){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({code:'AUTH_REQUIRED'},{status:401});
  try{
    return NextResponse.json(await getGovernanceOverview(user.id));
  }catch(error){
    console.error('[governance-overview]',{name:error instanceof Error?error.name:'UnknownError'});
    return NextResponse.json({code:'GOVERNANCE_OVERVIEW_UNAVAILABLE'},{status:503});
  }
}
