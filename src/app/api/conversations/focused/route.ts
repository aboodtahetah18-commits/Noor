export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getRawSql } from '@/infrastructure/db/client';

export async function GET(){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({code:'AUTH_REQUIRED'},{status:401});
  try{
    const sql=getRawSql();
    const rows=await sql`
      with scoped as (
        select
          t.room_key,
          m.body,
          m.created_at,
          m.structured_data,
          coalesce(m.structured_data->>'scope_kind','') as scope_kind,
          case
            when m.structured_data->>'scope_kind'='role' then m.structured_data->>'role_key'
            when m.structured_data->>'scope_kind'='meeting' then m.structured_data->>'meeting_id'
            else null
          end as scope_key,
          case
            when m.structured_data->>'scope_kind'='role' then coalesce(m.structured_data->>'role_name',m.sender_name)
            when m.structured_data->>'scope_kind'='meeting' then coalesce(m.structured_data->>'meeting_title','اجتماع')
            else null
          end as scope_title,
          row_number() over(
            partition by
              t.room_key,
              coalesce(m.structured_data->>'scope_kind',''),
              case
                when m.structured_data->>'scope_kind'='role' then m.structured_data->>'role_key'
                when m.structured_data->>'scope_kind'='meeting' then m.structured_data->>'meeting_id'
                else null
              end
            order by m.created_at desc
          ) as rn,
          count(*) over(
            partition by
              t.room_key,
              coalesce(m.structured_data->>'scope_kind',''),
              case
                when m.structured_data->>'scope_kind'='role' then m.structured_data->>'role_key'
                when m.structured_data->>'scope_kind'='meeting' then m.structured_data->>'meeting_id'
                else null
              end
          ) as message_count
        from public.conversation_messages m
        join public.conversation_threads t on t.id=m.thread_id
        where m.user_id=${user.id}::uuid
          and t.user_id=${user.id}::uuid
          and m.structured_data->>'scope_kind' in ('role','meeting')
      )
      select room_key,scope_kind,scope_key,scope_title,body as last_message,created_at as last_message_at,message_count
      from scoped
      where rn=1 and scope_key is not null
      order by created_at desc
      limit 80
    `;
    return NextResponse.json({chats:rows});
  }catch(error){
    console.error('[focused-conversations-index]',{name:error instanceof Error?error.name:'UnknownError'});
    return NextResponse.json({code:'FOCUSED_CONVERSATIONS_UNAVAILABLE'},{status:503});
  }
}
