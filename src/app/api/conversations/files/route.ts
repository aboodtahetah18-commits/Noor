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
      select a.id,a.file_name,a.content_type,a.verification_status,a.created_at,
             t.room_key,t.title as room_title
      from public.conversation_attachments a
      join public.conversation_threads t on t.id=a.thread_id
      where a.user_id=${user.id}::uuid and t.user_id=${user.id}::uuid
      order by a.created_at desc
      limit 200
    `;
    return NextResponse.json({files:rows});
  }catch(error){
    console.error('[conversation-files]',{name:error instanceof Error?error.name:'UnknownError'});
    return NextResponse.json({code:'FILES_UNAVAILABLE'},{status:503});
  }
}
