export const runtime='nodejs';
export const dynamic='force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireAuthenticatedMutationUser } from '@/auth/require-authenticated-user';
import { getRawSql } from '@/infrastructure/db/client';
import { getGovernorOnboardingStatus } from '@/lib/conversations/governor-onboarding';
import { MATCHING_TOLERANCE_ALLOWED_DAYS, MATCHING_TOLERANCE_POLICY_REF, normalizeMatchingToleranceDays } from '@/lib/settings/user-preferences';

export async function GET(){
  const user=await getAuthenticatedUser();
  if(!user) return NextResponse.json({code:'AUTH_REQUIRED'},{status:401});

  const sql=getRawSql();
  const onboarding=await getGovernorOnboardingStatus(user.id);

  const [profileRows,authProfileRows]=await Promise.all([
    sql`
      select display_name,base_currency,timezone
      from public.profiles
      where id=${user.id}::uuid
      limit 1
    `,
    sql`
      select first_name,last_name,phone,city
      from auth.user_profile
      where user_id=${user.id}::uuid
      limit 1
    `,
  ]);

  if(!onboarding.complete){
    return NextResponse.json({
      user,
      onboarding_complete:false,
      profile:profileRows[0]??null,
      contact_profile:authProfileRows[0]??null,
      operational_settings:null,
      accounts:[],
    });
  }

  await sql`
    insert into public.user_preferences(user_id)
    values(${user.id}::uuid)
    on conflict(user_id) do nothing
  `;

  const [preferences,accounts]=await Promise.all([
    sql`
      select matching_tolerance_days
      from public.user_preferences
      where user_id=${user.id}::uuid
      limit 1
    `,
    sql`
      select a.id,a.name,a.account_type,a.bank_name,a.financial_role,a.currency,a.is_active,
             b.amount as opening_balance,b.effective_date as opening_balance_date
      from public.accounts a
      left join lateral (
        select amount,effective_date
        from public.account_opening_balances
        where user_id=${user.id}::uuid and account_id=a.id
        order by effective_date desc,created_at desc
        limit 1
      ) b on true
      where a.user_id=${user.id}::uuid
      order by a.is_active desc,a.created_at asc
      limit 100
    `,
  ]);

  return NextResponse.json({
    user,
    onboarding_complete:true,
    profile:profileRows[0]??null,
    contact_profile:authProfileRows[0]??null,
    operational_settings:{
      matching_tolerance_days:Number(preferences[0]?.matching_tolerance_days??2),
      policy_ref:MATCHING_TOLERANCE_POLICY_REF,
      allowed_values:MATCHING_TOLERANCE_ALLOWED_DAYS,
    },
    accounts,
  });
}

export async function PATCH(request:Request){
  const user=await requireAuthenticatedMutationUser('account-settings');
  const onboarding=await getGovernorOnboardingStatus(user.id);
  if(!onboarding.complete){
    return NextResponse.json({code:'ONBOARDING_SETTINGS_RESTRICTED'},{status:403});
  }

  try{
    const body=await request.json() as Record<string,unknown>;
    let tolerance:2|3;
    try{
      tolerance=normalizeMatchingToleranceDays(body.matching_tolerance_days);
    }catch{
      return NextResponse.json({code:'MATCHING_TOLERANCE_INVALID'},{status:400});
    }

    const sql=getRawSql();
    const rows=await sql`
      insert into public.user_preferences(user_id,matching_tolerance_days)
      values(${user.id}::uuid,${tolerance})
      on conflict(user_id) do update set
        matching_tolerance_days=excluded.matching_tolerance_days,
        updated_at=now()
      returning matching_tolerance_days,updated_at
    `;

    return NextResponse.json({
      ok:true,
      matching_tolerance_days:Number(rows[0]?.matching_tolerance_days??tolerance),
      policy_ref:MATCHING_TOLERANCE_POLICY_REF,
    });
  }catch{
    return NextResponse.json({code:'ACCOUNT_SETTINGS_UPDATE_FAILED'},{status:503});
  }
}
