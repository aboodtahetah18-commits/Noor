import { describe, expect, it } from 'vitest';
import { parseStatementCsv } from '@/lib/conversations/statement-intake';

describe('parseStatementCsv',()=>{
  it('parses English debit and credit columns into review rows',()=>{
    const rows=parseStatementCsv([
      'date,description,debit,credit',
      '2026-09-01,Coffee,25.50,',
      '2026-09-02,Salary,,10000',
    ].join('\n'));

    expect(rows).toEqual([
      {
        date:'2026-09-01',
        description:'Coffee',
        amount:25.5,
        direction:'DEBIT',
        raw:'2026-09-01,Coffee,25.50,',
      },
      {
        date:'2026-09-02',
        description:'Salary',
        amount:10000,
        direction:'CREDIT',
        raw:'2026-09-02,Salary,,10000',
      },
    ]);
  });

  it('parses Arabic headers and Arabic digits',()=>{
    const rows=parseStatementCsv([
      'تاريخ العملية;البيان;المبلغ;الاتجاه',
      '٠١/٠٩/٢٠٢٦;مطعم;٧٥.٥٠;خصم',
      '٠٢/٠٩/٢٠٢٦;تحويل راتب;١٠٠٠٠;إيداع',
    ].join('\n'));

    expect(rows.map(row=>({
      date:row.date,
      description:row.description,
      amount:row.amount,
      direction:row.direction,
    }))).toEqual([
      {date:'2026-09-01',description:'مطعم',amount:75.5,direction:'DEBIT'},
      {date:'2026-09-02',description:'تحويل راتب',amount:10000,direction:'CREDIT'},
    ]);
  });

  it('requires an explicit direction when only a positive amount column exists',()=>{
    expect(()=>parseStatementCsv([
      'date,description,amount',
      '2026-09-01,Coffee,25',
    ].join('\n'))).toThrow('STATEMENT_DIRECTION_COLUMN_REQUIRED');
  });

  it('does not silently accept a file without descriptions',()=>{
    expect(()=>parseStatementCsv([
      'date,amount,direction',
      '2026-09-01,25,debit',
    ].join('\n'))).toThrow('STATEMENT_DESCRIPTION_COLUMN_REQUIRED');
  });
});
