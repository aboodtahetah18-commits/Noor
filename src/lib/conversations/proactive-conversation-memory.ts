import { getRawSql } from '@/infrastructure/db/client';
import type { ConversationRoomKey } from './store';

export type ProactivePromptMemory={
  promptCount:number;
  lastPromptAt:string|null;
  lastAnswerAt:string|null;
  lastAnswerExcerpt:string|null;
  unansweredStreak:number;
  averageResponseHours:number|null;
};

export type RoomLearningMemory={
  userTurns:number;
  lastUserAt:string|null;
  lastPromptAnsweredAt:string|null;
};

export type ProactiveConversationMemory={
  version:1;
  prompts:Record<string,ProactivePromptMemory>;
  rooms:Partial<Record<ConversationRoomKey,RoomLearningMemory>>;
  updatedAt:string|null;
};

const MEMORY_FACT_KEY='conversation_learning_memory';

function emptyMemory():ProactiveConversationMemory{
  return {version:1,prompts:{},rooms:{},updatedAt:null};
}

function asRecord(value:unknown):Record<string,unknown>{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
}

function readPrompt(value:unknown):ProactivePromptMemory{
  const row=asRecord(value);
  return {
    promptCount:Number.isFinite(Number(row.promptCount))?Math.max(0,Number(row.promptCount)):0,
    lastPromptAt:typeof row.lastPromptAt==='string'?row.lastPromptAt:null,
    lastAnswerAt:typeof row.lastAnswerAt==='string'?row.lastAnswerAt:null,
    lastAnswerExcerpt:typeof row.lastAnswerExcerpt==='string'?row.lastAnswerExcerpt:null,
    unansweredStreak:Number.isFinite(Number(row.unansweredStreak))?Math.max(0,Number(row.unansweredStreak)):0,
    averageResponseHours:Number.isFinite(Number(row.averageResponseHours))?Math.max(0,Number(row.averageResponseHours)):null,
  };
}

function readRoom(value:unknown):RoomLearningMemory{
  const row=asRecord(value);
  return {
    userTurns:Number.isFinite(Number(row.userTurns))?Math.max(0,Number(row.userTurns)):0,
    lastUserAt:typeof row.lastUserAt==='string'?row.lastUserAt:null,
    lastPromptAnsweredAt:typeof row.lastPromptAnsweredAt==='string'?row.lastPromptAnsweredAt:null,
  };
}

export function normalizeProactiveConversationMemory(value:unknown):ProactiveConversationMemory{
  const source=asRecord(value);
  const promptsSource=asRecord(source.prompts);
  const roomsSource=asRecord(source.rooms);
  const prompts:Record<string,ProactivePromptMemory>={};
  for(const [key,item] of Object.entries(promptsSource)) prompts[key]=readPrompt(item);
  const rooms:Partial<Record<ConversationRoomKey,RoomLearningMemory>>={};
  for(const [key,item] of Object.entries(roomsSource)){
    if(['central','operations','solvency','assets','hilal','advisor','secretary','council'].includes(key)){
      rooms[key as ConversationRoomKey]=readRoom(item);
    }
  }
  return {
    version:1,
    prompts,
    rooms,
    updatedAt:typeof source.updatedAt==='string'?source.updatedAt:null,
  };
}

export async function readProactiveConversationMemory(userId:string):Promise<ProactiveConversationMemory>{
  const sql=getRawSql();
  const rows=await sql`
    select value_json
    from public.user_foundation_facts
    where user_id=${userId}::uuid
      and fact_key=${MEMORY_FACT_KEY}
      and status='ACTIVE'
    limit 1
  `;
  return normalizeProactiveConversationMemory(rows[0]?.value_json);
}

export async function writeProactiveConversationMemory(userId:string,memory:ProactiveConversationMemory){
  const sql=getRawSql();
  const next={...memory,version:1 as const,updatedAt:new Date().toISOString()};
  await sql`
    insert into public.user_foundation_facts(
      user_id,fact_key,category,value_json,source,confidence,verified_at,uses,requires_confirmation,status
    ) values(
      ${userId}::uuid,${MEMORY_FACT_KEY},'learning',${JSON.stringify(next)}::jsonb,
      'SYSTEM_DERIVED',1,now(),ARRAY['conversations','proactive_planning','learning'],false,'ACTIVE'
    )
    on conflict(user_id,fact_key) do update set
      value_json=excluded.value_json,
      source=excluded.source,
      confidence=excluded.confidence,
      verified_at=excluded.verified_at,
      uses=excluded.uses,
      requires_confirmation=false,
      status='ACTIVE',
      updated_at=now()
  `;
  return next;
}

export function registerPrompt(
  memory:ProactiveConversationMemory,
  promptKey:string,
  at:string,
):ProactiveConversationMemory{
  const current=memory.prompts[promptKey]??{promptCount:0,lastPromptAt:null,lastAnswerAt:null,lastAnswerExcerpt:null,unansweredStreak:0,averageResponseHours:null};
  const priorPromptUnanswered=Boolean(current.lastPromptAt)&&(!current.lastAnswerAt||new Date(current.lastAnswerAt).getTime()<new Date(current.lastPromptAt??0).getTime());
  return {
    ...memory,
    prompts:{
      ...memory.prompts,
      [promptKey]:{
        ...current,
        promptCount:current.promptCount+1,
        lastPromptAt:at,
        unansweredStreak:priorPromptUnanswered?current.unansweredStreak+1:current.unansweredStreak,
      },
    },
  };
}

export function registerUserLearning(
  memory:ProactiveConversationMemory,
  roomKey:ConversationRoomKey,
  userText:string,
  at:string,
  promptKey?:string|null,
):ProactiveConversationMemory{
  const room=memory.rooms[roomKey]??{userTurns:0,lastUserAt:null,lastPromptAnsweredAt:null};
  const next:ProactiveConversationMemory={
    ...memory,
    rooms:{
      ...memory.rooms,
      [roomKey]:{
        ...room,
        userTurns:room.userTurns+1,
        lastUserAt:at,
        lastPromptAnsweredAt:promptKey?at:room.lastPromptAnsweredAt,
      },
    },
  };
  if(!promptKey)return next;
  const current=next.prompts[promptKey]??{promptCount:0,lastPromptAt:null,lastAnswerAt:null,lastAnswerExcerpt:null,unansweredStreak:0,averageResponseHours:null};
  const promptAt=current.lastPromptAt?new Date(current.lastPromptAt):null;
  const answeredAt=new Date(at);
  const responseHours=promptAt&&!Number.isNaN(promptAt.getTime())&&!Number.isNaN(answeredAt.getTime())
    ?Math.max(0,(answeredAt.getTime()-promptAt.getTime())/(60*60*1000))
    :null;
  const averageResponseHours=responseHours===null
    ?current.averageResponseHours
    :current.averageResponseHours===null
      ?responseHours
      :(current.averageResponseHours*0.7)+(responseHours*0.3);
  return {
    ...next,
    prompts:{
      ...next.prompts,
      [promptKey]:{
        ...current,
        lastAnswerAt:at,
        lastAnswerExcerpt:userText.trim().slice(0,280)||null,
        unansweredStreak:0,
        averageResponseHours,
      },
    },
  };
}

export async function captureProactiveConversationLearning(
  userId:string,
  roomKey:ConversationRoomKey,
  userText:string,
  scope?:{kind:'role'|'meeting';key:string}|null,
){
  const text=userText.trim();
  if(!text)return;
  const sql=getRawSql();
  const threadRows=await sql`
    select id
    from public.conversation_threads
    where user_id=${userId}::uuid and room_key=${roomKey}
    limit 1
  `;
  const threadId=threadRows[0]?.id?String(threadRows[0].id):null;
  if(!threadId)return;

  const promptRows=scope
    ?await sql`
      select structured_data,created_at
      from public.conversation_messages
      where user_id=${userId}::uuid
        and thread_id=${threadId}::uuid
        and sender_type='agent'
        and coalesce(structured_data->>'proactive_prompt','false')='true'
        and structured_data->>'scope_kind'=${scope.kind}
        and (
          (${scope.kind}='role' and structured_data->>'role_key'=${scope.key})
          or (${scope.kind}='meeting' and structured_data->>'meeting_id'=${scope.key})
        )
      order by created_at desc
      limit 1
    `
    :await sql`
      select structured_data,created_at
      from public.conversation_messages
      where user_id=${userId}::uuid
        and thread_id=${threadId}::uuid
        and sender_type='agent'
        and coalesce(structured_data->>'proactive_prompt','false')='true'
        and structured_data->>'scope_kind' is null
      order by created_at desc
      limit 1
    `;
  const promptData=asRecord(promptRows[0]?.structured_data);
  const promptKey=typeof promptData.proactive_key==='string'?promptData.proactive_key:null;
  const promptAt=promptRows[0]?.created_at?new Date(String(promptRows[0].created_at)):null;
  let recentPrompt:string|null=null;
  if(promptKey&&promptAt&&!Number.isNaN(promptAt.getTime())&&(Date.now()-promptAt.getTime())<=14*24*60*60*1000){
    const userRows=scope
      ?await sql`
        select count(*)::int as count
        from public.conversation_messages
        where user_id=${userId}::uuid
          and thread_id=${threadId}::uuid
          and sender_type='user'
          and created_at>${promptAt.toISOString()}::timestamptz
          and structured_data->>'scope_kind'=${scope.kind}
          and (
            (${scope.kind}='role' and structured_data->>'role_key'=${scope.key})
            or (${scope.kind}='meeting' and structured_data->>'meeting_id'=${scope.key})
          )
      `
      :await sql`
        select count(*)::int as count
        from public.conversation_messages
        where user_id=${userId}::uuid
          and thread_id=${threadId}::uuid
          and sender_type='user'
          and created_at>${promptAt.toISOString()}::timestamptz
          and structured_data->>'scope_kind' is null
      `;
    if(Number(userRows[0]?.count??0)===1) recentPrompt=promptKey;
  }

  const memory=await readProactiveConversationMemory(userId);
  const now=new Date().toISOString();
  const learned=registerUserLearning(memory,roomKey,text,now,recentPrompt);
  await writeProactiveConversationMemory(userId,learned);
}
