import pg from 'pg';

export function getPgPoolConfig(databaseUrl: string): pg.PoolConfig {
  const parsedUrl = new URL(databaseUrl);
  const sslMode = parsedUrl.searchParams.get('sslmode');
  const shouldUseSsl = Boolean(sslMode) || parsedUrl.hostname.includes('supabase.com');

  if (!shouldUseSsl) {
    return { connectionString: databaseUrl };
  }

  parsedUrl.searchParams.delete('sslmode');

  return {
    connectionString: parsedUrl.toString(),
    ssl: {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    },
  };
}

export function createPool(databaseUrl?: string): pg.Pool {
  const url = databaseUrl || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required. Configure it with your PostgreSQL connection string.');
  }
  return new pg.Pool(getPgPoolConfig(url));
}