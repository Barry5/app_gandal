import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { handleSubscriptionExpirations } from '../jobs/handle-expirations.js';

export async function jobRoutes(fastify: FastifyInstance) {
  // POST /api/jobs/handle-expirations - Declencheur protégé par CRON_SECRET (cron Vercel, tests manuels)
  fastify.post('/handle-expirations', async (request: FastifyRequest, reply: FastifyReply) => {
    const secret = request.headers['x-cron-secret'];
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return reply.status(401).send({ error: 'Non autorise' });
    }

    try {
      await handleSubscriptionExpirations(fastify.pg);
      return reply.send({ ok: true, at: new Date().toISOString() });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Job en erreur' });
    }
  });
}