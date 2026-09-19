export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { getRawSql } from '@/infrastructure/db/client';

export async function GET(){
  const user=await getAuthenticatedUser();
  if(!user) return NextResponse.json({code:'AUTH_REQUIRED'},{status:401});
  try{
    const sql=getRawSql();
    const rows=await sql`
      select m.id,m.sender_name,m.message_kind,m.body,m.structured_data,m.created_at,
             t.room_key,t.title as room_title
      from public.conversation_messages m
      join public.conversation_threads t on t.id=m.thread_id
      where m.user_id=${user.id}::uuid
        and t.user_id=${user.id}::uuid
        and t.room_key in ('council','secretary')
        and (
          m.message_kind in ('decision','recommendation','followup','request')
          or coalesce(m.structured_data->>'minutes','false')='true'
          or coalesce(m.structured_data->>'meeting','false')='true'
        )
      order by m.created_at desc
      limit 100
    `;
    return NextResponse.json({records:rows});
  }catch(error){
    console.error('[governance-records]',{name:error instanceof Error?error.name:'UnknownError'});
    return NextResponse.json({code:'RECORDS_UNAVAILABLE'},{status:503});
  }
}
