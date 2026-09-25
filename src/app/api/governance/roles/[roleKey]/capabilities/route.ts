export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import {
  algorithmRoleByKey,
  compactAuthoritiesForRole,
} from '@/lib/governance/algorithm-role-registry';
import { COMPACT_AUTHORITIES, COMPACT_PROCEDURES } from '@/lib/governance/compact-authority-model';

const headers={'Cache-Control':'private, no-store, max-age=0'};

export async function GET(_request:Request,context:{params:Promise<{roleKey:string}>}){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401,headers});

  const {roleKey}=await context.params;
  const role=algorithmRoleByKey(roleKey);
  if(!role)return NextResponse.json({ok:false,error:'GOVERNANCE_ROLE_NOT_FOUND'},{status:404,headers});

  const authorityKeys=compactAuthoritiesForRole(role.key);
  const authorities=COMPACT_AUTHORITIES
    .filter(item=>authorityKeys.includes(item.action))
    .map(item=>({
      key:item.action,
      arabicName:item.arabicName,
      description:item.description,
      externalExecution:item.externalExecution,
    }));
  const procedures=COMPACT_PROCEDURES
    .filter(item=>item.ownerKinds.includes(role.kind))
    .map(item=>({
      key:item.key,
      arabicName:item.arabicName,
      purpose:item.purpose,
      steps:item.steps,
    }));

  return NextResponse.json({
    ok:true,
    role:{
      key:role.key,
      name:role.name,
      kind:role.kind,
      homeRoom:role.homeRoom,
    },
    authorityKeys,
    authorities,
    procedures,
    externalExecution:false,
  },{headers});
}
