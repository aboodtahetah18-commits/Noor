export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { getRawSql } from '@/infrastructure/db/client';
import {
  processGovernorStructuredOnboarding,
  type OnboardingStep,
} from '@/lib/conversations/governor-onboarding';
import { appendUserMessage, getConversationRoom } from '@/lib/conversations/store';

const STRUCTURED_STEPS=new Set<OnboardingStep>(['dependents','income','accounts','obligations','goals']);

function summaryForPayload(payload:Record<string,unknown>){
  const step=String(payload.step??'');
  if(step==='dependents'){
    const count=Array.isArray(payload.items)?payload.items.length:0;
    return count ? `أضفت ${count} من أفراد الأسرة أو المعالين إلى ملف التأسيس.` : 'أكدت أنه لا يوجد أشخاص أعولهم ماليًا.';
  }
  if(step==='income') return 'أدخلت تفاصيل الراتب والدخل والصافي الفعلي للمراجعة.';
  if(step==='accounts'){
    const count=Array.isArray(payload.items)?payload.items.length:0;
    return `أضفت ${count} من الحسابات المالية وراجعت المجموعة.`;
  }
  if(step==='obligations'){
    const count=Array.isArray(payload.items)?payload.items.length:0;
    return count ? `أضفت ${count} من الالتزامات القائمة وراجعت المجموعة.` : 'أكدت أنه لا توجد التزامات مالية قائمة معروفة.';
  }
  if(step==='goals'){
    const count=Array.isArray(payload.items)?payload.items.length:0;
    return count ? `أضفت ${count} من الأهداف المالية وراجعت المجموعة.` : 'أكدت أنه لا توجد أهداف مالية تريد تسجيلها الآن.';
  }
  return 'تم تحديث بيانات التأسيس.';
}

export async function POST(request:Request){
  const user=await requireAuthenticatedMutationUser('onboarding-structured-intake');
  try{
    const payload=await request.json() as Record<string,unknown>;
    const step=typeof payload.step==='string'?payload.step as OnboardingStep:null;
    if(!step||!STRUCTURED_STEPS.has(step)){
      return NextResponse.json({code:'ONBOARDING_STRUCTURED_STEP_INVALID'},{status:400});
    }

    const message=await appendUserMessage(user.id,user.name||'أنت','central',summaryForPayload(payload));
    const result=await processGovernorStructuredOnboarding(user.id,payload as Parameters<typeof processGovernorStructuredOnboarding>[1]);
    const thread=await getConversationRoom(user.id,'central');
    const agent=thread.room.participants[0];
    const sql=getRawSql();
    const nextQuestion=result.next_question;
    const replyBody=nextQuestion
      ? `تم حفظ المجموعة. ${nextQuestion}`
      : 'تم حفظ المجموعة. ننتقل الآن إلى مراجعة ملف التأسيس.';

    const rows=await sql`
      insert into public.conversation_messages(
        id,thread_id,user_id,sender_type,sender_key,sender_name,message_kind,body,structured_data
      ) values(
        gen_random_uuid(),${thread.threadId}::uuid,${user.id}::uuid,'agent',
        ${agent?.key??'central-governor'},${agent?.name??'محافظ بنك نماء المركزي'},'request',
        ${replyBody},
        ${JSON.stringify({
          onboarding:true,
          onboarding_step:result.current_step,
          onboarding_complete:false,
          next_question:result.next_question,
          structured_intake:true,
          execution_boundary:'advisory_only',
        })}::jsonb
      )
      returning id,sender_type,sender_key,sender_name,message_kind,body,structured_data,created_at
    `;

    return NextResponse.json({message,reply:rows[0]??null,onboarding:result},{status:201});
  }catch(error){
    const code=error instanceof Error?error.message:'ONBOARDING_STRUCTURED_FAILED';
    const badRequest=new Set([
      'ONBOARDING_ALREADY_COMPLETED','ONBOARDING_STEP_MISMATCH','ONBOARDING_STRUCTURED_DATE_INVALID',
      'ONBOARDING_DEPENDENT_INVALID','ONBOARDING_INCOME_INVALID',
      'ONBOARDING_INCOME_DIFFERENCE_EXPLANATION_REQUIRED','ONBOARDING_ACCOUNTS_REQUIRED',
      'ONBOARDING_ACCOUNT_INVALID','ONBOARDING_OBLIGATION_INVALID','ONBOARDING_GOAL_INVALID',
    ]);
    if(badRequest.has(code)) return NextResponse.json({code},{status:400});
    console.error('[onboarding-structured-intake]',{name:error instanceof Error?error.name:'UnknownError'});
    return NextResponse.json({code:'ONBOARDING_STRUCTURED_FAILED'},{status:503});
  }
}
