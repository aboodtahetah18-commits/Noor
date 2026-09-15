import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/require-authenticated-user';
import { listOpenExecutionTasks } from '@/features/financial-engine/services/execution-service';
import { logServerError } from '@/security/safe-logging';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};

export async function GET(){
  const user=await getAuthenticatedUser();
  if(!user)return NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401,headers});
  try{
    const tasks=await listOpenExecutionTasks(user.id);
    return NextResponse.json({ok:true,tasks},{status:200,headers});
  }catch{
    const requestId=logServerError('execution-tasks-api-failed',{endpoint:'/api/execution/tasks',userId:user.id});
    return NextResponse.json({ok:false,error:'EXECUTION_TASKS_UNAVAILABLE',requestId},{status:500,headers});
  }
}
