import './config/env.js';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { authRoutes } from './routes/auth.js';
import { courseRoutes } from './routes/courses.js';
import { userRoutes } from './routes/users.js';
import { paymentRoutes } from './routes/payments.js';
import { mediaRoutes } from './routes/media.js';
import { certificateRoutes } from './routes/certificates.js';
import { gamificationRoutes } from './routes/gamification.js';
import { aiRoutes } from './routes/ai.js';
import { pricingRoutes } from './routes/pricing.js';
import { analyticsRoutes } from './routes/analytics.js';
import { financeRoutes } from './routes/finances.js';
import { monetizationRoutes } from './routes/monetization.js';
import { adminMonetizationRoutes } from './routes/adminMonetization.js';
import { jobRoutes } from './routes/jobs.js';
import { createPool } from './config/pool.js';

declare module 'fastify' {
  interface FastifyInstance {
    pg: import('pg').Pool;
  }
}

const server = Fastify({
  logger: true,
});

async function start() {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET is required in production');
      }
      throw new Error('JWT_SECRET is required. Set it in .env.local for development.');
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required. Configure it with your Supabase PostgreSQL connection string.');
    }

    const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5174,http://127.0.0.1:5174')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    const pool = createPool(databaseUrl);
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
      secret: jwtSecret,
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
    server.register(pricingRoutes, { prefix: '/api/pricing' });
    server.register(analyticsRoutes, { prefix: '/api/analytics' });
    server.register(financeRoutes, { prefix: '/api/finances' });
    server.register(monetizationRoutes, { prefix: '/api/monetization' });
    server.register(adminMonetizationRoutes, { prefix: '/api' });
    server.register(jobRoutes, { prefix: '/api/jobs' });

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
