export const MATCHING_TOLERANCE_POLICY_REF='POL-RC-001' as const;
export const MATCHING_TOLERANCE_ALLOWED_DAYS=[2,3] as const;

export function normalizeMatchingToleranceDays(value:unknown){
  const number=Number(value);
  if(!Number.isInteger(number)||!MATCHING_TOLERANCE_ALLOWED_DAYS.includes(number as 2|3)){
    throw new Error('MATCHING_TOLERANCE_INVALID');
  }
  return number as 2|3;
}
