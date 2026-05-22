import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Config } from 'drizzle-kit';
import { parse } from 'dotenv';

const envFiles = Array.from(new Set([
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'packages/db/.env'),
  path.resolve(process.cwd(), '../..', '.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), 'packages/db/.env.local'),
  path.resolve(process.cwd(), '../..', '.env.local'),
]));

const loadedEnv: Record<string, string> = {};

for (const envFile of envFiles) {
  if (existsSync(envFile)) {
    Object.assign(loadedEnv, parse(readFileSync(envFile)));
  }
}

for (const [key, value] of Object.entries(loadedEnv)) {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required. Configure it with your Supabase PostgreSQL connection string.');
}

if (process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const parsedDatabaseUrl = new URL(databaseUrl);
const databaseName = parsedDatabaseUrl.pathname.replace(/^\//, '') || 'postgres';
const dbCredentials = parsedDatabaseUrl.hostname.includes('supabase.com')
  ? {
      host: parsedDatabaseUrl.hostname,
      port: Number(parsedDatabaseUrl.port || 5432),
      user: decodeURIComponent(parsedDatabaseUrl.username),
      password: decodeURIComponent(parsedDatabaseUrl.password),
      database: databaseName,
      ssl: true,
    }
  : {
      url: databaseUrl,
    };

export default {
  schema: './src/schema.ts',
  schemaFilter: ['public'],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials,
} satisfies Config;
