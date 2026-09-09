export function normalizeMerchantIdentity(value:string):string|null {
  const normalized=value
    .toLowerCase()
    .replace(/[0-9٠-٩]{3,}/g,' ')
    .replace(/[^\p{L}\s]/gu,' ')
    .replace(/\s+/g,' ')
    .trim();
  return normalized.length>1 ? normalized.slice(0,160) : null;
}
