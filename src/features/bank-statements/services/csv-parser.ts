import type { ParsedStatementRow, DetectedKind, StatementDirection } from '../types/bank-statement';

const DATE_NAMES = ['date','transaction date','posting date','value date','book date','تاريخ','التاريخ','تاريخ العملية','تاريخ الحركة','تاريخ القيد','تاريخ التنفيذ','تاريخ القيمة'];
const DESCRIPTION_NAMES = ['description','details','merchant','narrative','memo','transaction details','transaction description','البيان','الوصف','التفاصيل','اسم التاجر','العملية','وصف العملية','تفاصيل العملية','وصف الحركة','بيان العملية'];
const AMOUNT_NAMES = ['amount','value','transaction amount','المبلغ','قيمة','مبلغ العملية','قيمة العملية'];
const DEBIT_NAMES = ['debit','withdrawal','debit amount','مدين','خصم','سحب','مبلغ مدين','المبلغ المدين','مسحوبات'];
const CREDIT_NAMES = ['credit','deposit','credit amount','دائن','إيداع','ايداع','مبلغ دائن','المبلغ الدائن','إيداعات','ايداعات'];

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ');
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let quoted = false;
  for (let i=0;i<line.length;i+=1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i+1] === '"') { current += '"'; i+=1; }
      else quoted = !quoted;
    } else if (ch === delimiter && !quoted) { values.push(current.trim()); current=''; }
    else current += ch;
  }
  values.push(current.trim());
  return values.map((v)=>v.replace(/^"|"$/g,'').trim());
}

function detectDelimiter(header: string): string {
  const candidates = [',',';','\t'];
  return candidates.sort((a,b)=>header.split(b).length-header.split(a).length)[0] ?? ',';
}

function indexOfAny(headers: string[], names: string[]): number {
  return headers.findIndex((h)=>names.some((n)=>h===n || h.includes(n)));
}

function numberValue(input: string): number | null {
  if (!input) return null;
  const western = input
    .replace(/[٠-٩]/g,(d)=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[٬,\s]/g,'')
    .replace('٫','.');
  const negativeByParens = /^\(.*\)$/.test(western.trim());
  const cleaned = western.replace(/[()]/g,'').replace(/[^0-9.\-]/g,'');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return negativeByParens ? -Math.abs(parsed) : parsed;
}

function isoDate(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  const normalizedDigits = value.replace(/[٠-٩]/g,(d)=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  const direct = normalizedDigits.match(/^(\d{4})[-\/]([01]?\d)[-\/]([0-3]?\d)/);
  if (direct) {
    const year = direct[1] ?? '';
    const month = direct[2] ?? '';
    const day = direct[3] ?? '';
    if (year && month && day) return `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
  }
  const dmy = normalizedDigits.match(/^([0-3]?\d)[-\/]([01]?\d)[-\/](\d{4})/);
  if (dmy) {
    const day = dmy[1] ?? '';
    const month = dmy[2] ?? '';
    const year = dmy[3] ?? '';
    if (year && month && day) return `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
  }
  const parsed = new Date(normalizedDigits);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0,10);
}

function normalizeMerchant(description: string): string | null {
  const cleaned = description
    .toLowerCase()
    .replace(/[0-9٠-٩]{3,}/g,' ')
    .replace(/\b(pos|mada|visa|mastercard|purchase|payment|عملية|شراء|مدى|بطاقة)\b/gi,' ')
    .replace(/[^\p{L}\s]/gu,' ')
    .replace(/\s+/g,' ')
    .trim();
  return cleaned.length >= 2 ? cleaned.slice(0,160) : null;
}

function classify(description: string, direction: StatementDirection): {kind:DetectedKind;confidence:number} {
  const d = description.toLowerCase();
  if (/استرداد|مرتجع|refund|reversal/.test(d)) return {kind:'REFUND',confidence:94};
  if (/رسوم|عمولة|fee|charge/.test(d)) return {kind:'FEE',confidence:96};
  if (/تحويل|transfer|حوالة/.test(d)) return {kind:'TRANSFER',confidence:88};
  if (direction === 'CREDIT' && /راتب|salary|payroll/.test(d)) return {kind:'INCOME',confidence:98};
  if (direction === 'CREDIT') return {kind:'INCOME',confidence:80};
  if (direction === 'DEBIT') return {kind:'EXPENSE',confidence:84};
  return {kind:'UNKNOWN',confidence:30};
}

export function parseBankStatementCsv(text: string): ParsedStatementRow[] {
  const lines = text.replace(/^\uFEFF/,'').split(/\r?\n/).filter((line)=>line.trim().length>0);
  if (lines.length < 2) throw new Error('كشف الحساب لا يحتوي صفوف بيانات كافية.');
  const headerLine = lines[0];
  if (!headerLine) throw new Error('كشف الحساب لا يحتوي على صف عناوين صالح.');
  const delimiter = detectDelimiter(headerLine);
  const rawHeaders = parseDelimitedLine(headerLine, delimiter);
  const headers = rawHeaders.map(normalizeHeader);
  const dateIndex = indexOfAny(headers, DATE_NAMES);
  const descriptionIndex = indexOfAny(headers, DESCRIPTION_NAMES);
  const amountIndex = indexOfAny(headers, AMOUNT_NAMES);
  const debitIndex = indexOfAny(headers, DEBIT_NAMES);
  const creditIndex = indexOfAny(headers, CREDIT_NAMES);
  if (descriptionIndex < 0 || (amountIndex < 0 && debitIndex < 0 && creditIndex < 0)) {
    throw new Error('لم أتعرف على أعمدة البيان والمبلغ في الملف. استخدم CSV يحتوي على التاريخ والبيان والمبلغ، أو عمودي مدين/دائن.');
  }

  const result: ParsedStatementRow[] = [];
  for (let i=1;i<lines.length;i+=1) {
    const line = lines[i];
    if (!line) continue;
    const cells = parseDelimitedLine(line, delimiter);
    const description = (cells[descriptionIndex] ?? '').trim();
    if (!description) continue;
    let direction: StatementDirection = 'DEBIT';
    let amount = 0;
    if (amountIndex >= 0) {
      const rawAmount = numberValue(cells[amountIndex] ?? '') ?? 0;
      direction = rawAmount < 0 ? 'DEBIT' : 'CREDIT';
      amount = Math.abs(rawAmount);
      // Many Saudi exports represent purchases as positive amounts in a generic Amount column.
      if (rawAmount >= 0 && /شراء|pos|mada|purchase|سحب|withdrawal|رسوم|fee/i.test(description)) direction = 'DEBIT';
    } else {
      const debit = Math.abs(numberValue(cells[debitIndex] ?? '') ?? 0);
      const credit = Math.abs(numberValue(cells[creditIndex] ?? '') ?? 0);
      if (credit > 0) { direction='CREDIT'; amount=credit; }
      else { direction='DEBIT'; amount=debit; }
    }
    if (!(amount > 0)) continue;
    const classified = classify(description,direction);
    const confidence = classified.confidence;
    result.push({
      rowNumber:i,
      transactionDate: dateIndex >= 0 ? isoDate(cells[dateIndex] ?? '') : null,
      description:description.slice(0,500),
      amount:amount.toFixed(2),
      direction,
      detectedKind:classified.kind,
      normalizedMerchant:normalizeMerchant(description),
      confidence,
      reviewStatus: confidence >= 95 ? 'AUTO':'NEEDS_REVIEW',
      rawPayload: JSON.stringify(Object.fromEntries(rawHeaders.map((h,idx)=>[h,cells[idx] ?? '']))).slice(0,4000),
    });
  }
  if (result.length === 0) throw new Error('لم أتمكن من استخراج أي عملية مالية صالحة من الملف.');
  if (result.length > 3000) throw new Error('الملف يحتوي أكثر من 3000 عملية. قسّم الكشف إلى ملفات أصغر.');
  return result;
}
