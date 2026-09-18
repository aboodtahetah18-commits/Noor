import { getRawSql } from '@/infrastructure/db/client';

export type HilalExecutionEvidence = {
  reference: string | null;
  amount: number | null;
  date: string | null;
  account_ref: string | null;
  statement_row_id: string | null;
};

export type HilalExecutionEvidenceVerification =
  | {
      status: 'VERIFIED';
      matched_statement_row_id: string;
      matched_import_id: string;
      matched_transaction_date: string;
      matched_amount: number;
      matched_account_id: string;
      matched_account_name: string;
      matched_reference: string | null;
    }
  | {
      status: 'MISSING_FIELDS';
      missing_fields: string[];
    }
  | {
      status: 'NOT_FOUND' | 'AMBIGUOUS' | 'CASE_LINK_REQUIRED';
      candidate_count: number;
    };

const arabicDigits: Record<string, string> = {
  '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
  '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
};

function normalizeDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => arabicDigits[digit] ?? digit);
}

function parseAmount(text: string) {
  const match = /(?:المبلغ|دفعت|سددت|تم\s+سداد|قيمة\s+العملية)[^\d٠-٩۰-۹]{0,20}([\d٠-٩۰-۹,.]+)/i.exec(text);
  if (!match?.[1]) return null;
  const value = Number(normalizeDigits(match[1]).replace(/,/g, ''));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parseDate(text: string) {
  const match = /(20\d{2})[\/-](\d{1,2})[\/-](\d{1,2})/.exec(normalizeDigits(text));
  if (!match) return null;
  const month = String(match[2]).padStart(2, '0');
  const day = String(match[3]).padStart(2, '0');
  const value = `${match[1]}-${month}-${day}`;
  return Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ? null : value;
}

function parseReference(text: string) {
  const match = /(?:رقم\s+المرجع|مرجع\s+العملية|المرجع|reference)\s*[:#\-]?\s*([A-Za-z0-9\-_/]{3,120})/i.exec(text);
  return match?.[1]?.trim() ?? null;
}

function parseAccountRef(text: string) {
  const match = /(?:الحساب|حساب\s+السداد|من\s+حساب)\s*[:\-]?\s*([^،,\n]{2,120})/i.exec(text);
  return match?.[1]?.trim().replace(/\s+/g, ' ') ?? null;
}

function parseStatementRowId(text: string) {
  const match = /(?:صف\s+الكشف|statement\s*row)\s*[:#\-]?\s*([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i.exec(text);
  return match?.[1] ?? null;
}

export function parseHilalExecutionEvidence(text: string): HilalExecutionEvidence {
  return {
    reference: parseReference(text),
    amount: parseAmount(text),
    date: parseDate(text),
    account_ref: parseAccountRef(text),
    statement_row_id: parseStatementRowId(text),
  };
}

export function isHilalExecutionEvidenceIntent(text: string) {
  return /(نفذت|تم\s+التنفيذ|سددت|دفعت|إثبات|اثبات|مرجع\s+العملية|رقم\s+المرجع)/i.test(text);
}

export async function verifyHilalExecutionEvidence(
  userId: string,
  caseId: string,
  evidence: HilalExecutionEvidence,
): Promise<HilalExecutionEvidenceVerification> {
  const sql = getRawSql();

  if (evidence.statement_row_id) {
    const rows = await sql`
      select
        r.id::text as row_id,
        r.import_id::text as import_id,
        r.transaction_date::text as transaction_date,
        r.amount::text as amount,
        i.account_id::text as account_id,
        a.name as account_name,
        r.description,
        r.funding_case_id::text as funding_case_id
      from public.bank_statement_rows r
      join public.bank_statement_imports i on i.id=r.import_id and i.user_id=r.user_id
      join public.accounts a on a.id=i.account_id and a.user_id=i.user_id
      where r.id=${evidence.statement_row_id}::uuid
        and r.user_id=${userId}
        and i.status='APPROVED'
        and r.review_status in ('AUTO','CONFIRMED')
      limit 1
    `;
    const row = rows[0];
    if (!row) return { status: 'NOT_FOUND', candidate_count: 0 };
    if (String(row.funding_case_id ?? '') !== caseId) return { status: 'CASE_LINK_REQUIRED', candidate_count: 1 };

    const amount = Number(row.amount ?? 0);
    if (evidence.amount !== null && Math.abs(amount - evidence.amount) > 0.009) return { status: 'NOT_FOUND', candidate_count: 0 };
    if (evidence.date && String(row.transaction_date) !== evidence.date) return { status: 'NOT_FOUND', candidate_count: 0 };
    if (evidence.account_ref) {
      const accountRef = evidence.account_ref.trim().toLowerCase();
      const accountMatches = String(row.account_id).toLowerCase() === accountRef || String(row.account_name).trim().toLowerCase() === accountRef;
      if (!accountMatches) return { status: 'NOT_FOUND', candidate_count: 0 };
    }

    return {
      status: 'VERIFIED',
      matched_statement_row_id: String(row.row_id),
      matched_import_id: String(row.import_id),
      matched_transaction_date: String(row.transaction_date),
      matched_amount: amount,
      matched_account_id: String(row.account_id),
      matched_account_name: String(row.account_name),
      matched_reference: evidence.reference,
    };
  }

  const missing = [
    ...(evidence.reference ? [] : ['reference']),
    ...(evidence.amount !== null ? [] : ['amount']),
    ...(evidence.date ? [] : ['date']),
    ...(evidence.account_ref ? [] : ['account']),
  ];
  if (missing.length) return { status: 'MISSING_FIELDS', missing_fields: missing };

  const rows = await sql`
    select
      r.id::text as row_id,
      r.import_id::text as import_id,
      r.transaction_date::text as transaction_date,
      r.amount::text as amount,
      i.account_id::text as account_id,
      a.name as account_name,
      r.description,
      r.funding_case_id::text as funding_case_id
    from public.bank_statement_rows r
    join public.bank_statement_imports i on i.id=r.import_id and i.user_id=r.user_id
    join public.accounts a on a.id=i.account_id and a.user_id=i.user_id
    where r.user_id=${userId}
      and i.status='APPROVED'
      and r.review_status in ('AUTO','CONFIRMED')
      and r.direction='DEBIT'
      and r.transaction_date=${evidence.date}::date
      and abs(r.amount-${evidence.amount}) < 0.01
      and (
        lower(a.name)=lower(${evidence.account_ref})
        or i.account_id::text=${evidence.account_ref}
      )
      and position(lower(${evidence.reference}) in lower(r.description)) > 0
    order by r.created_at desc
    limit 5
  `;

  const linked = rows.filter((row) => String(row.funding_case_id ?? '') === caseId);
  if (linked.length === 0 && rows.length > 0) return { status: 'CASE_LINK_REQUIRED', candidate_count: rows.length };
  if (linked.length === 0) return { status: 'NOT_FOUND', candidate_count: 0 };
  if (linked.length > 1) return { status: 'AMBIGUOUS', candidate_count: linked.length };

  const row = linked[0]!;
  return {
    status: 'VERIFIED',
    matched_statement_row_id: String(row.row_id),
    matched_import_id: String(row.import_id),
    matched_transaction_date: String(row.transaction_date),
    matched_amount: Number(row.amount ?? 0),
    matched_account_id: String(row.account_id),
    matched_account_name: String(row.account_name),
    matched_reference: evidence.reference,
  };
}
