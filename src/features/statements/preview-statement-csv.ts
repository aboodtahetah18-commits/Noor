/**
 * Deterministic CSV bank statement preview.
 * No uploads, persistence, AI calls or financial postings happen here.
 * Raw statement content remains in caller memory until a separate approval flow is added.
 */
export interface StatementRow {
  date: string;
  description: string;
  amountHalalas: number;
  direction: 'CREDIT' | 'DEBIT';
  reference: string;
  fingerprint: string;
}
export interface StatementPreview {
  accepted: StatementRow[];
  duplicates: StatementRow[];
  rejected: Array<{ line: number; reason: string }>;
}
function cells(line: string, separator: string): string[] {
  const out: string[] = [];
  let current = ''; let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === separator && !quoted) { out.push(current.trim()); current = ''; }
    else current += ch;
  }
  if (quoted) throw new Error('UNCLOSED_QUOTED_FIELD');
  out.push(current.trim());
  return out;
}
function splitRecords(text: string): string[] {
  const lines: string[] = [];
  let buffer = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i+1] === '"') { buffer += '""'; i++; }
      else { quoted = !quoted; buffer += ch; }
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (buffer.trim()) lines.push(buffer);
      buffer = '';
      if (ch === '\r' && text[i+1] === '\n') i++;
    } else buffer += ch;
  }
  if (quoted) throw new Error('UNCLOSED_QUOTED_FIELD');
  if (buffer.trim()) lines.push(buffer);
  return lines;
}
const aliases: Record<string, string[]> = {
  date:['date','transaction date','تاريخ','تاريخ العملية','تاريخ الحركة'],
  description:['description','details','narration','الوصف','البيان','تفاصيل العملية'],
  amount:['amount','المبلغ','قيمة العملية'],
  debit:['debit','withdrawal','مدين','سحب'],
  credit:['credit','deposit','دائن','إيداع'],
  reference:['reference','ref','رقم المرجع','مرجع العملية','رقم العملية'],
};
const normalizeHeader = (v: string) => v.trim().toLowerCase().replace(/\s+/g,' ');
const normalizedDigits = (v: string) => v.replace(/[٠-٩]/g,ch=>String(ch.charCodeAt(0)-0x0660)).replace(/[۰-۹]/g,ch=>String(ch.charCodeAt(0)-0x06f0));
function parseMinor(value: string): number | null {
  const str = normalizedDigits(value).replace(/[\s,٬]/g, '').replace('٫', '.').replace(/[−]/g,'-');
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(str)) return null;
  const negative = str.startsWith('-');
  const [whole, fraction = ''] = (negative ? str.slice(1) : str).split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount)) return null;
  return negative ? -amount : amount;
}
function parseDate(raw: string): string | null {
  const val = normalizedDigits(raw.trim());
  const match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(val);
  if (!match) return null;
  const y = Number(match[1]), m = Number(match[2]), d = Number(match[3]);
  const date = new Date(Date.UTC(y,m-1,d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m-1 || date.getUTCDate() !== d) return null;
  return [String(y).padStart(4,'0'),String(m).padStart(2,'0'),String(d).padStart(2,'0')].join('-');
}
export function previewStatementCsv(csv: string, accountKey: string, existingFingerprints: ReadonlySet<string> = new Set()): StatementPreview {
  if (!accountKey.trim()) throw new Error('ACCOUNT_REQUIRED');
  if (csv.length > 5_000_000) throw new Error('STATEMENT_TOO_LARGE');
  const records = splitRecords(csv.replace(/^\uFEFF/,''));
  if (!records.length) throw new Error('EMPTY_STATEMENT');
  const header = records[0];
  if (header === undefined) throw new Error('EMPTY_STATEMENT');
  const separator = (header.match(/;/g)?.length ?? 0) > (header.match(/,/g)?.length ?? 0) ? ';' : ',';
  const headers = cells(header,separator).map(normalizeHeader);
  const indexOf = (field: string) => headers.findIndex(header => aliases[field]?.includes(header));
  const dateIndex = indexOf('date'), descIndex = indexOf('description'), amountIndex = indexOf('amount');
  const debitIndex = indexOf('debit'), creditIndex = indexOf('credit'), referenceIndex = indexOf('reference');
  if (dateIndex < 0 || descIndex < 0 || (amountIndex < 0 && debitIndex < 0 && creditIndex < 0)) throw new Error('UNSUPPORTED_STATEMENT_COLUMNS');
  const result: StatementPreview = {accepted: [], duplicates: [], rejected: []};
  const seen = new Set(existingFingerprints);
  for (let i=1;i<records.length;i++) {
    let values: string[];
    const record = records[i];
    if (record === undefined) continue;
    try {values = cells(record,separator);} catch {result.rejected.push({line:i+1,reason:'INVALID_CSV_ROW'});continue;}
    const get=(index:number)=>index<0?'':(values[index]??'').trim();
    const date=parseDate(get(dateIndex)), description=get(descIndex), reference=get(referenceIndex);
    const rawAmount = amountIndex>=0 ? parseMinor(get(amountIndex)) : null;
    const debitText = get(debitIndex), creditText = get(creditIndex);
    const debit = debitText ? parseMinor(debitText) : null;
    const credit = creditText ? parseMinor(creditText) : null;
    if (!date || !description || (debitText && debit===null) || (creditText && credit===null) ||
        (amountIndex>=0 && rawAmount===null) || (debit!==null && debit<0) || (credit!==null && credit<0)) {
      result.rejected.push({line:i+1,reason:'INVALID_REQUIRED_FIELDS'});continue;
    }
    if ((debit!==null && debit>0) && (credit!==null && credit>0)) {
      result.rejected.push({line:i+1,reason:'AMBIGUOUS_DIRECTION'});continue;
    }
    const splitAmount = credit!==null && credit>0 ? credit : debit!==null && debit>0 ? -debit : null;
    const amount = amountIndex>=0 ? rawAmount : splitAmount;
    if (amount===null || amount===0) {result.rejected.push({line:i+1,reason:'INVALID_AMOUNT'});continue;}
    const direction=amount>0?'CREDIT':'DEBIT';
    // Fallback fingerprints may collapse legitimate identical transactions.
    // Mark these as reviewable duplicates, never discard them silently.
    const fingerprint=JSON.stringify([accountKey,date,description.toLowerCase().replace(/\s+/g,' '),Math.abs(amount),direction,reference]);
    const row:StatementRow={date,description,amountHalalas:Math.abs(amount),direction,reference,fingerprint};
    if (seen.has(fingerprint)) result.duplicates.push(row);
    else {seen.add(fingerprint);result.accepted.push(row);}
  }
  return result;
}
