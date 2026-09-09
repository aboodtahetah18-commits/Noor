import type { AdvisorStructuredFacts } from '@/ai/types';

const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
function normalizeDigits(value: string) {
  return value.replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)));
}
function canonicalNumber(value: string): string {
  const normalized = value.replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? String(n) : normalized;
}
function numbers(value: string): string[] {
  return normalizeDigits(value).match(/\d+(?:[.,]\d+)?/g)?.map(canonicalNumber) ?? [];
}
function factNumbers(facts: AdvisorStructuredFacts): Set<string> {
  const set = new Set<string>();
  for (const value of Object.values(facts.reason_data)) {
    if (typeof value === 'number' || typeof value === 'string') for (const n of numbers(String(value))) set.add(n);
  }
  return set;
}

export function validateAiExplanation(text: string, facts: AdvisorStructuredFacts): boolean {
  const cleaned = text.trim();
  if (!cleaned || cleaned.length > 1800) return false;
  if (/<\/?[a-z][\s\S]*>/i.test(cleaned)) return false;
  const allowed = factNumbers(facts);
  for (const n of numbers(cleaned)) if (!allowed.has(n)) return false;
  return true;
}
