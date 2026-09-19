export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { getGovernanceOversightDashboard } from '@/lib/governance/governance-oversight-dashboard';
import {
  FOLLOWUP_EVIDENCE_MAX_BYTES,
  recordFollowupUserResponse,
} from '@/lib/governance/governance-followup-user-response';

export async function POST(request:Request){
  const user=await requireAuthenticatedMutationUser('conversation-followup-user-response');
  try{
    const contentType=request.headers.get('content-type')??'';
    let roomKey='central';
    let registryId='';
    let followupId='';
    let responseText='';
    let file:File|null=null;

    if(contentType.includes('multipart/form-data')){
      const form=await request.formData();
      roomKey=String(form.get('room_key')??'central');
      registryId=String(form.get('registry_id')??'').trim();
      followupId=String(form.get('followup_id')??'').trim();
      responseText=String(form.get('response_text')??'');
      const candidate=form.get('file');
      file=candidate instanceof File?candidate:null;
    }else{
      const body=await request.json() as Record<string,unknown>;
      roomKey=String(body.room_key??'central');
      registryId=String(body.registry_id??'').trim();
      followupId=String(body.followup_id??'').trim();
      responseText=String(body.response_text??'');
    }

    if(roomKey!=='central'&&roomKey!=='secretary'){
      return NextResponse.json({code:'FOLLOWUP_RESPONSE_ROOM_INVALID'},{status:400});
    }
    if(!registryId||!followupId){
      return NextResponse.json({code:'FOLLOWUP_RESPONSE_TARGET_REQUIRED'},{status:400});
    }
    if(file&&file.size>FOLLOWUP_EVIDENCE_MAX_BYTES){
      return NextResponse.json({code:'FOLLOWUP_EVIDENCE_FILE_SIZE_INVALID',max_bytes:FOLLOWUP_EVIDENCE_MAX_BYTES},{status:413});
    }

    const result=await recordFollowupUserResponse({
      userId:user.id,
      userName:user.name,
      roomKey,
      registryId,
      followupId,
      responseText,
      file:file?{
        name:file.name,
        type:file.type,
        bytes:new Uint8Array(await file.arrayBuffer()),
      }:null,
    });

    return NextResponse.json({
      ...result,
      oversight_dashboard:await getGovernanceOversightDashboard(user.id),
      external_execution:false,
    },{status:201});
  }catch(error){
    const code=error instanceof Error?error.message:'FOLLOWUP_RESPONSE_FAILED';
    const clientErrors=[
      'FOLLOWUP_USER_RESPONSE_REQUIRED',
      'FOLLOWUP_USER_RESPONSE_TOO_LONG',
      'FOLLOWUP_EVIDENCE_FILE_NAME_REQUIRED',
      'FOLLOWUP_EVIDENCE_FILE_SIZE_INVALID',
      'FOLLOWUP_EVIDENCE_FILE_TYPE_INVALID',
      'DECISION_FOLLOWUP_NOT_FOUND',
      'DECISION_FOLLOWUP_ALREADY_COMPLETED',
      'FOLLOWUP_NOT_WAITING_USER',
      'FOLLOWUP_RESPONSE_THREAD_NOT_FOUND',
    ];
    if(clientErrors.includes(code)) return NextResponse.json({code},{status:400});
    console.error('[followup-user-response]',{name:error instanceof Error?error.name:'UnknownError'});
    return NextResponse.json({code:'FOLLOWUP_RESPONSE_FAILED'},{status:503});
  }
}
