import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'dotenv';

const envFiles = Array.from(new Set([
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'apps/api/.env'),
  path.resolve(process.cwd(), '../..', '.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), 'apps/api/.env.local'),
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
