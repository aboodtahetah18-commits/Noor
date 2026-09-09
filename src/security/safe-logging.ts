import { randomUUID } from 'node:crypto';

const SECRET_KEY = /(authorization|cookie|token|secret|password|api[_-]?key|database[_-]?url|service[_-]?role)/i;
const FINANCIAL_KEY = /(amount|balance|salary|income|expense|reason_data|snapshot|description)/i;

export function createRequestId(): string {
  return randomUUID();
}

export function sanitizeMetadata(input: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SECRET_KEY.test(key)) {
      result[key] = '[REDACTED]';
      continue;
    }
    if (FINANCIAL_KEY.test(key)) {
      result[key] = '[SENSITIVE]';
      continue;
    }
    if (typeof value === 'string') result[key] = value.slice(0, 200);
    else if (typeof value === 'number' || typeof value === 'boolean' || value == null) result[key] = value;
    else result[key] = '[STRUCTURED]';
  }
  return result;
}

export function logServerError(event: string, metadata: Record<string, unknown> = {}): string {
  const requestId = createRequestId();
  console.error(event, { requestId, ...sanitizeMetadata(metadata) });
  return requestId;
}
