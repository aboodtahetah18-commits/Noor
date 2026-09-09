import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

export type SqlRow = Record<string, unknown>;
export type SqlRows = SqlRow[];
export type SqlQuery = Promise<SqlRows>;

/**
 * Narrow application-facing contract for Neon HTTP queries.
 *
 * @neondatabase/serverless exposes a broad union when `fullResults` is part of
 * its generic surface. This application never enables fullResults: every tagged
 * query consumes the default rows array. Keeping that invariant here prevents
 * the driver implementation type from leaking into every repository.
 */
export interface RawSqlClient {
  (strings: TemplateStringsArray, ...values: unknown[]): SqlQuery;
  transaction(queries: readonly SqlQuery[]): Promise<SqlRows[]>;
  unsafe(query: string, params?: readonly unknown[]): SqlQuery;
}

let sqlClient: ReturnType<typeof neon> | null = null;
let drizzleDb: ReturnType<typeof drizzle> | null = null;

function databaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim() || process.env.DATABASEURL?.trim();
  if (!value) throw new Error('DATABASE_URL/DATABASEURL is not configured');
  return value;
}

export function getRawSql(): RawSqlClient {
  if (!sqlClient) sqlClient = neon(databaseUrl());
  return sqlClient as unknown as RawSqlClient;
}

export function getDb(): ReturnType<typeof drizzle> {
  if (!drizzleDb) drizzleDb = drizzle(sqlClient ?? neon(databaseUrl()));
  return drizzleDb;
}

// Lazy proxy: importing repositories during `next build` does not require a live DATABASE_URL.
export const rawSql = new Proxy(function () {}, {
  apply(_target, _thisArg, args) {
    const callable = getRawSql() as unknown as (...params: unknown[]) => unknown;
    return Reflect.apply(callable, undefined, args);
  },
  get(_target, prop) {
    const client = getRawSql();
    const value = Reflect.get(client as object, prop);
    return typeof value === 'function' ? value.bind(client) : value;
  },
}) as unknown as RawSqlClient;
