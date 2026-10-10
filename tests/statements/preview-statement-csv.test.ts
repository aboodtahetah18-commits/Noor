import { describe, expect, it } from 'vitest';
import { previewStatementCsv } from '@/features/statements/preview-statement-csv';

describe('statement import preview', () => {
  it('parses Arabic headers and Western numerals and recognizes repeated rows', () => {
    const csv = 'تاريخ العملية,البيان,المبلغ,رقم المرجع\n2026-10-01,مشتريات,-125.50,A1\n2026-10-02,راتب,8000,B2\n2026-10-01,مشتريات,-125.50,A1';
    const result = previewStatementCsv(csv, 'account-1');
    expect(result.accepted).toHaveLength(2);
    expect(result.duplicates).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
    expect(result.accepted[0]).toMatchObject({ amountHalalas:12550, direction:'DEBIT', date:'2026-10-01' });
    expect(result.accepted[1]).toMatchObject({ amountHalalas:800000, direction:'CREDIT' });
  });
  it('supports quoted commas and split debit/credit columns', () => {
    const result = previewStatementCsv('date;description;debit;credit\n2026-10-01;"Store; branch";15.25;\n2026-10-02;Salary;;900', 'a');
    expect(result.accepted).toHaveLength(2);
    expect(result.accepted[0]!.description).toBe('Store; branch');
    expect(result.accepted[0]!.direction).toBe('DEBIT');
    expect(result.accepted[1]!.direction).toBe('CREDIT');
  });
  it('rejects invalid dates and does not silently import invalid values', () => {
    const result = previewStatementCsv('date,description,amount\n2026-02-30,test,15\n2026-02-28,valid,19.99','a');
    expect(result.rejected).toHaveLength(1);
    expect(result.accepted).toHaveLength(1);
  });
  it('treats zero debit or credit as an empty side, not a zero transaction', () => {
    const csv = 'date,description,debit,credit\\n2026-10-01,Salary,0,900\\n2026-10-02,Purchase,45,0';
    const result = previewStatementCsv(csv, 'a');
    expect(result.accepted).toHaveLength(2);
    expect(result.accepted[0]).toMatchObject({direction:'CREDIT', amountHalalas:90000});
    expect(result.accepted[1]).toMatchObject({direction:'DEBIT', amountHalalas:4500});
  });
  it('rejects malformed nonempty financial values instead of treating them as missing', () => {
    const csv = 'date,description,debit,credit\\n2026-10-01,Unknown,abc,\\n2026-10-02,Unknown,,1.234\\n2026-10-03,Valid,,10';
    const result = previewStatementCsv(csv, 'a');
    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toHaveLength(2);
  });
  it('does not fall back to debit when the specified amount column is malformed', () => {
    const csv = 'date,description,amount,debit\\n2026-10-01,Malformed,abc,25';
    const result = previewStatementCsv(csv, 'a');
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
  });
  it('rejects unrecognized formats rather than inventing a mapping', () => {
    expect(()=>previewStatementCsv('something,else\nx,y','a')).toThrow('UNSUPPORTED_STATEMENT_COLUMNS');
  });
  it('distinguishes imports across accounts', () => {
    const csv='date,description,amount\n2026-10-01,test,-10';
    expect(previewStatementCsv(csv,'a').accepted[0]!.fingerprint).not.toBe(previewStatementCsv(csv,'b').accepted[0]!.fingerprint);
  });
});
