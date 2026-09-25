export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { assertTrustedMutationOrigin } from '@/security/request-origin';
import { enforceRateLimit } from '@/security/rate-limit';
import {
  addGovernanceAmendmentDiscussion,
  advanceGovernanceAmendment,
  createGovernanceAmendmentRequest,
  createGovernanceDirectChange,
  createGovernanceTypoCorrection,
  governanceAmendmentAvailableActions,
  listGovernanceAmendments,
  listGovernanceDirectChanges,
  listGovernanceTypoCorrections,
} from '@/lib/governance/governance-amendments';


const directChangeSchema=z.object({
  operation:z.literal('DIRECT_CHANGE'),
  documentRef:z.string().trim().min(3).max(120),
  documentTitle:z.string().trim().min(3).max(300),
  roomKey:z.string().trim().min(2).max(40),
  unitRef:z.string().trim().min(1).max(120),
  parentRef:z.string().trim().max(120).optional().nullable(),
  changeAction:z.enum(['ADD','EDIT','DELETE']),
  unitType:z.enum(['article','clause','paragraph','step','stage','category','reason','method','calculation','input','output','condition','validation','limit','example']),
  currentRule:z.string().trim().max(4000).optional().nullable(),
  proposedRule:z.string().trim().min(1).max(4000),
  rationale:z.string().trim().min(1).max(1000),
});

const typoCorrectionSchema=z.object({
  operation:z.literal('TYPO_CORRECTION'),
  documentRef:z.string().trim().min(3).max(120),
  documentTitle:z.string().trim().min(3).max(300),
  roomKey:z.string().trim().min(2).max(40),
  clauseRef:z.string().trim().max(120).optional().nullable(),
  currentRule:z.string().trim().min(3).max(4000),
  correctedRule:z.string().trim().min(3).max(4000),
  rationale:z.string().trim().min(2).max(1000),
});
const createSchema=z.object({
  operation:z.literal('CREATE'),
  documentRef:z.string().trim().min(3).max(120),
  documentTitle:z.string().trim().min(3).max(300),
  roomKey:z.string().trim().min(2).max(40),
  clauseRef:z.string().trim().max(120).optional().nullable(),
  parentRef:z.string().trim().max(120).optional().nullable(),
  changeAction:z.enum(['ADD','EDIT','DELETE']).default('EDIT'),
  unitType:z.enum(['article','clause','paragraph','step','stage','category','reason','method','calculation','input','output','condition','validation','limit','example']).default('paragraph'),
  currentRule:z.string().trim().max(4000).optional().nullable(),
  proposedRule:z.string().trim().min(3).max(4000),
  rationale:z.string().trim().min(3).max(4000),
  priority:z.enum(['NORMAL','NEXT_MEETING','URGENT']),
});
const discussSchema=z.object({
  operation:z.literal('DISCUSS'),
  requestId:z.string().trim().min(3).max(120),
  actor:z.enum(['GOVERNOR','SECRETARY','COUNCIL']),
  note:z.string().trim().min(2).max(4000),
});
const advanceSchema=z.object({
  operation:z.literal('ADVANCE'),
  requestId:z.string().trim().min(3).max(120),
  action:z.enum(['GOVERNOR_ACCEPT','GOVERNOR_REJECT','SECRETARY_ACCEPT','COUNCIL_APPROVE','COUNCIL_REJECT','MARK_EFFECTIVE']),
  note:z.string().trim().max(4000).optional().nullable(),
  decisionId:z.string().trim().max(160).optional().nullable(),
  effectiveAt:z.string().trim().max(40).optional().nullable(),
  nextVersion:z.string().trim().max(80).optional().nullable(),
});
const bodySchema=z.discriminatedUnion('operation',[createSchema,directChangeSchema,typoCorrectionSchema,discussSchema,advanceSchema]);
const headers={'Cache-Control':'no-store'};

export async function GET(){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401,headers});
  try{
    const [amendments,directChanges,corrections]=await Promise.all([
      listGovernanceAmendments(user.id),
      listGovernanceDirectChanges(user.id),
      listGovernanceTypoCorrections(user.id),
    ]);
    return NextResponse.json({
      ok:true,
      amendments:amendments.map(item=>({
        ...item,
        availableActions:governanceAmendmentAvailableActions(item),
      })),
      directChanges,
      corrections,
    },{headers});
  }catch(error){
    console.error('[governance-amendments-get]',{name:error instanceof Error?error.name:'UnknownError'});
    return NextResponse.json({ok:false,error:'GOVERNANCE_AMENDMENTS_UNAVAILABLE'},{status:503,headers});
  }
}

export async function POST(request:Request){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401,headers});
  try{
    await assertTrustedMutationOrigin();
    enforceRateLimit(`governance-amendments:${user.id}`);
    const parsed=bodySchema.safeParse(await request.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({ok:false,error:'INVALID_REQUEST'},{status:422,headers});
    const body=parsed.data;
    const result=body.operation==='CREATE'
      ?await createGovernanceAmendmentRequest({userId:user.id,...body})
      :body.operation==='DIRECT_CHANGE'
        ?await createGovernanceDirectChange({userId:user.id,...body})
        :body.operation==='TYPO_CORRECTION'
          ?await createGovernanceTypoCorrection({userId:user.id,...body})
          :body.operation==='DISCUSS'
          ?await addGovernanceAmendmentDiscussion({userId:user.id,requestId:body.requestId,note:body.note,actor:body.actor})
          :await advanceGovernanceAmendment({
          userId:user.id,requestId:body.requestId,action:body.action,note:body.note,
          decisionId:body.decisionId,effectiveAt:body.effectiveAt,nextVersion:body.nextVersion,
        });
    return NextResponse.json({ok:true,...result},{status:body.operation==='CREATE'||body.operation==='DIRECT_CHANGE'||body.operation==='TYPO_CORRECTION'?201:200,headers});
  }catch(error){
    const code=error instanceof Error?error.message:'GOVERNANCE_AMENDMENT_FAILED';
    const status=code==='GOVERNANCE_AMENDMENT_NOT_FOUND'
      ?404
      :code==='GOVERNANCE_AUTHORITY_DENIED'
        ?403
        :['GOVERNANCE_AMENDMENT_INVALID_TRANSITION','GOVERNANCE_DISCUSSION_ACTOR_INVALID'].includes(code)
          ?409
          :['GOVERNANCE_EFFECTIVE_DATE_AND_VERSION_REQUIRED','GOVERNANCE_EFFECTIVE_DATE_NOT_REACHED','GOVERNANCE_EFFECTIVE_DATE_INVALID'].includes(code)
            ?422
            :500;
    console.error('[governance-amendments-post]',{name:error instanceof Error?error.name:'UnknownError',code});
    return NextResponse.json({ok:false,error:code},{status,headers});
  }
}
