import { describe, expect, it } from 'vitest';
import { resolveHilalCategoryFromPurpose } from '@/lib/conversations/hilal-policy-cap';

describe('Hilal policy-cap category resolver', () => {
  const categories = [
    { id: '1', name: 'وقود' },
    { id: '2', name: 'مطاعم' },
    { id: '3', name: 'احتياجات منزلية' },
  ];

  it('resolves an explicit budget category named in financing purpose', () => {
    expect(resolveHilalCategoryFromPurpose('تمويل بند الوقود بسبب سفر عمل', categories)).toMatchObject({
      id: '1',
      name: 'وقود',
    });
  });

  it('returns null when no governed category can be identified', () => {
    expect(resolveHilalCategoryFromPurpose('تمويل احتياج شخصي غير محدد', categories)).toBeNull();
  });

  it('does not force a category when candidates are equally ambiguous', () => {
    const ambiguous = [
      { id: '1', name: 'مصروف' },
      { id: '2', name: 'شخصي' },
    ];
    expect(resolveHilalCategoryFromPurpose('تمويل مصروف شخصي', ambiguous)).toBeNull();
  });
});
