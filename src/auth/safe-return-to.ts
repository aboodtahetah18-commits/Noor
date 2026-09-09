const AUTH_PUBLIC_PREFIXES = ['/login', '/auth'];

export function safeReturnTo(value: string | null | undefined, fallback = '/dashboard') {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  if (value.includes('\\')) return fallback;
  if (AUTH_PUBLIC_PREFIXES.some((prefix) => value === prefix || value.startsWith(`${prefix}/`) || value.startsWith(`${prefix}?`))) {
    return fallback;
  }
  return value;
}
