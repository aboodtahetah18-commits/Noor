import { getRawSql } from '@/infrastructure/db/client';

export type HilalPolicyCapEvidence = {
  status: 'READY_FOR_CALIBRATION' | 'CATEGORY_REQUIRED' | 'CATEGORY_NOT_IN_ACTIVE_PLAN';
  category_id: string | null;
  category_name: string | null;
  category_group: string | null;
  is_essential: boolean | null;
  expense_nature_default: string | null;
  planned_amount_current_cycle: number | null;
  actual_spend_current_cycle: number | null;
  remaining_current_cycle: number | null;
  historical_cycle_count: number;
  historical_average_spend: number | null;
  historical_max_spend: number | null;
  financing_history_available: false;
  policy_cap: null;
  policy_cap_status: 'NUMERIC_CALIBRATION_REQUIRED';
  policy_reference: 'HILAL_POLICY_1.0_SECTIONS_12_13_14';
};

function normalizeArabic(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[إأآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^؀-ۿa-z0-9s]/g, ' ')
    .replace(/s+/g, ' ');
}

function categoryScore(purpose: string, categoryName: string) {
  const p = normalizeArabic(purpose);
  const c = normalizeArabic(categoryName);
  if (!p || !c) return 0;
  if (p === c) return 100;
  if (p.includes(c)) return 80;
  const categoryTokens = c.split(' ').filter(Boolean);
  const hits = categoryTokens.filter((token) => p.includes(token)).length;
  return categoryTokens.length ? Math.round((hits / categoryTokens.length) * 60) : 0;
}

export function resolveHilalCategoryFromPurpose(
  purpose: string,
  categories: Array<{ id: string; name: string }>,
) {
  const ranked = categories
    .map((category) => ({ ...category, score: categoryScore(purpose, category.name) }))
    .filter((category) => category.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'ar'));

  const first = ranked[0];
  const second = ranked[1];
  if (!first || first.score < 60) return null;
  if (second && second.score === first.score) return null;
  return first;
}

export async function getHilalPolicyCapEvidence(userId: string, financingPurpose: string): Promise<HilalPolicyCapEvidence> {
  const sql = getRawSql();

  const categoryRows = await sql`
    select id::text,name
    from public.budget_categories
    where user_id=${userId} and is_active=true
    order by name
  `;
  const categories = categoryRows.map((row) => ({ id: String(row.id), name: String(row.name) }));
  const resolved = resolveHilalCategoryFromPurpose(financingPurpose, categories);

  if (!resolved) {
    return {
      status: 'CATEGORY_REQUIRED',
      category_id: null,
      category_name: null,
      category_group: null,
      is_essential: null,
      expense_nature_default: null,
      planned_amount_current_cycle: null,
      actual_spend_current_cycle: null,
      remaining_current_cycle: null,
      historical_cycle_count: 0,
      historical_average_spend: null,
      historical_max_spend: null,
      financing_history_available: false,
      policy_cap: null,
      policy_cap_status: 'NUMERIC_CALIBRATION_REQUIRED',
      policy_reference: 'HILAL_POLICY_1.0_SECTIONS_12_13_14',
    };
  }

  const [currentRows, historyRows] = await Promise.all([
    sql`
      select
        bc.id::text as category_id,
        bc.name as category_name,
        bc.category_group,
        bc.is_essential,
        bc.expense_nature_default,
        ba.planned_amount::text as planned_amount,
        coalesce(sum(t.amount) filter (
          where t.transaction_type='EXPENSE' and t.status='POSTED'
        ),0)::text as actual_spend
      from public.financial_plans p
      join public.financial_cycles c
        on c.id=p.cycle_id and c.user_id=p.user_id and c.status='ACTIVE'
      join public.plan_versions pv
        on pv.id=p.current_version_id and pv.user_id=p.user_id and pv.is_current=true
      join public.budget_allocations ba
        on ba.plan_version_id=pv.id and ba.user_id=p.user_id and ba.category_id=${resolved.id}
      join public.budget_categories bc
        on bc.id=ba.category_id and bc.user_id=p.user_id
      left join public.transactions t
        on t.user_id=p.user_id and t.cycle_id=p.cycle_id and t.category_id=bc.id
      where p.user_id=${userId} and p.status='ACTIVE_PLAN'
      group by bc.id,bc.name,bc.category_group,bc.is_essential,bc.expense_nature_default,ba.planned_amount
      limit 1
    `,
    sql`
      select
        count(*)::int as cycle_count,
        coalesce(avg(actual_spend),0)::text as average_spend,
        coalesce(max(actual_spend),0)::text as max_spend
      from (
        select c.id,
          coalesce(sum(t.amount) filter (
            where t.transaction_type='EXPENSE' and t.status='POSTED'
          ),0) as actual_spend
        from public.financial_cycles c
        left join public.transactions t
          on t.user_id=c.user_id and t.cycle_id=c.id and t.category_id=${resolved.id}
        where c.user_id=${userId}
          and c.status in ('ACTIVE','CLOSING','CLOSED')
        group by c.id,c.start_date
        order by c.start_date desc
        limit 12
      ) history
    `,
  ]);

  const current = currentRows[0];
  const history = historyRows[0];

  if (!current) {
    return {
      status: 'CATEGORY_NOT_IN_ACTIVE_PLAN',
      category_id: resolved.id,
      category_name: resolved.name,
      category_group: null,
      is_essential: null,
      expense_nature_default: null,
      planned_amount_current_cycle: null,
      actual_spend_current_cycle: null,
      remaining_current_cycle: null,
      historical_cycle_count: Number(history?.cycle_count ?? 0),
      historical_average_spend: Number(history?.average_spend ?? 0),
      historical_max_spend: Number(history?.max_spend ?? 0),
      financing_history_available: false,
      policy_cap: null,
      policy_cap_status: 'NUMERIC_CALIBRATION_REQUIRED',
      policy_reference: 'HILAL_POLICY_1.0_SECTIONS_12_13_14',
    };
  }

  const planned = Number(current.planned_amount ?? 0);
  const actual = Number(current.actual_spend ?? 0);

  return {
    status: 'READY_FOR_CALIBRATION',
    category_id: String(current.category_id),
    category_name: String(current.category_name),
    category_group: String(current.category_group),
    is_essential: Boolean(current.is_essential),
    expense_nature_default: current.expense_nature_default ? String(current.expense_nature_default) : null,
    planned_amount_current_cycle: planned,
    actual_spend_current_cycle: actual,
    remaining_current_cycle: Math.max(planned - actual, 0),
    historical_cycle_count: Number(history?.cycle_count ?? 0),
    historical_average_spend: Number(history?.average_spend ?? 0),
    historical_max_spend: Number(history?.max_spend ?? 0),
    financing_history_available: false,
    policy_cap: null,
    policy_cap_status: 'NUMERIC_CALIBRATION_REQUIRED',
    policy_reference: 'HILAL_POLICY_1.0_SECTIONS_12_13_14',
  };
}
