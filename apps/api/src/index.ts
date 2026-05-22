import './config/env.js';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import pg from 'pg';
import { authRoutes } from './routes/auth.js';
import { courseRoutes } from './routes/courses.js';
import { userRoutes } from './routes/users.js';
import { paymentRoutes } from './routes/payments.js';
import { mediaRoutes } from './routes/media.js';
import { certificateRoutes } from './routes/certificates.js';
import { gamificationRoutes } from './routes/gamification.js';
import { aiRoutes } from './routes/ai.js';

declare module 'fastify' {
  interface FastifyInstance {
    pg: pg.Pool;
  }
}

const server = Fastify({
  logger: true,
});

function getPgPoolConfig(databaseUrl: string): pg.PoolConfig {
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

async function start() {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret && process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production');
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required. Configure it with your Supabase PostgreSQL connection string.');
    }

    const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5174,http://127.0.0.1:5174')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    const pool = new pg.Pool(getPgPoolConfig(databaseUrl));
    server.decorate('pg', pool);
    server.addHook('onClose', async () => {
      await pool.end();
    });

    await server.register(cors, {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Origin not allowed'), false);
      },
      credentials: true,
    });

    await server.register(jwt, {
      secret: jwtSecret || 'development-only-secret-change-me',
    });

    await server.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    });

    await server.register(multipart, {
      limits: {
        fileSize: 500 * 1024 * 1024,
      },
    });

    server.register(authRoutes, { prefix: '/api/auth' });
    server.register(courseRoutes, { prefix: '/api/courses' });
    server.register(userRoutes, { prefix: '/api/users' });
    server.register(paymentRoutes, { prefix: '/api/payments' });
    server.register(mediaRoutes, { prefix: '/api/media' });
    server.register(certificateRoutes, { prefix: '/api/certificates' });
    server.register(gamificationRoutes, { prefix: '/api/gamification' });
    server.register(aiRoutes, { prefix: '/api/ai' });

    server.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

    const port = Number(process.env.PORT || 3001);
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`Savoir-App API running on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
