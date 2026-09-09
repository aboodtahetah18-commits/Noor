export function getDatabaseUrl(source: NodeJS.ProcessEnv = process.env): string | undefined {
  const underscored = source.DATABASE_URL?.trim();
  if (underscored) return underscored;

  const compact = source.DATABASEURL?.trim();
  if (compact) return compact;

  return undefined;
}
