import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

type AuthUser = {
  id: string;
  role: 'admin' | 'creator' | 'learner';
  creatorId?: string;
};

const pricingTierSchema = z.object({
  label: z.string().trim().min(1).max(100).default('Standard'),
  price: z.number().int().min(0).default(0),
  currency: z.string().length(3).default('GNF'),
  isActive: z.boolean().default(true),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  sortOrder: z.number().int().default(0),
});

const updatePricingTierSchema = pricingTierSchema.partial();

async function requireCreatorOrAdmin(request: FastifyRequest, reply: FastifyReply): Promise<AuthUser | null> {
  try {
    await request.jwtVerify();
    const user = request.user as AuthUser;
    const activeResult = await request.server.pg.query(
      'SELECT is_active FROM users WHERE id = $1',
      [user.id]
    );
    if (activeResult.rows.length === 0 || activeResult.rows[0].is_active !== true) {
      reply.status(403).send({ error: 'Compte inactif ou bloque' });
      return null;
    }
    if (user.role !== 'creator' && user.role !== 'admin') {
      reply.status(403).send({ error: 'Acces reserve aux createurs' });
      return null;
    }
    if (user.role === 'creator' && !user.creatorId) {
      reply.status(403).send({ error: 'Profil createur incomplet' });
      return null;
    }
    return user;
  } catch {
    reply.status(401).send({ error: 'Non autorise' });
    return null;
  }
}

async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<AuthUser | null> {
  try {
    await request.jwtVerify();
    const user = request.user as AuthUser;
    const result = await request.server.pg.query(
      'SELECT id FROM users WHERE id = $1 AND role = $2 AND is_active = true',
      [user.id, 'admin']
    );
    if (result.rows.length === 0) {
      reply.status(403).send({ error: 'Acces reserve a l administration' });
      return null;
    }
    return user;
  } catch {
    reply.status(401).send({ error: 'Non autorise' });
    return null;
  }
}

async function ownsCourse(fastify: FastifyInstance, user: AuthUser, courseId: string): Promise<boolean> {
  if (user.role === 'admin') return true;
  if (user.role !== 'creator') return false;
  const result = await fastify.pg.query(
    'SELECT id FROM courses WHERE id = $1 AND creator_id = $2',
    [courseId, user.creatorId]
  );
  return result.rows.length > 0;
}

export async function pricingRoutes(fastify: FastifyInstance) {
  fastify.get('/:courseId/tiers', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try { await request.jwtVerify(); } catch { return reply.status(401).send({ error: 'Non autorise' }); }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { courseId } = request.params as { courseId: string };
    const user = request.user as AuthUser;

    if (!(await ownsCourse(fastify, user, courseId))) {
      return reply.status(404).send({ error: 'Cours introuvable' });
    }

    const result = await fastify.pg.query(
      'SELECT * FROM pricing_tiers WHERE course_id = $1 ORDER BY sort_order, created_at',
      [courseId]
    );

    return reply.send({ tiers: result.rows });
  });

  fastify.post('/:courseId/tiers', {
    preHandler: [requireCreatorOrAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { courseId } = request.params as { courseId: string };
      const user = request.user as AuthUser;
      const data = pricingTierSchema.parse(request.body);

      if (!(await ownsCourse(fastify, user, courseId))) {
        return reply.status(404).send({ error: 'Cours introuvable' });
      }

      const result = await fastify.pg.query(
        `INSERT INTO pricing_tiers (course_id, label, price, currency, is_active, valid_from, valid_to, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          courseId,
          data.label,
          data.price,
          data.currency,
          data.isActive,
          data.validFrom ? new Date(data.validFrom) : null,
          data.validTo ? new Date(data.validTo) : null,
          data.sortOrder,
        ]
      );

      return reply.status(201).send({ tier: result.rows[0] });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Donnees invalides',
          details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        });
      }
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Erreur serveur',
        ...(process.env.NODE_ENV !== 'production' && error instanceof Error ? { details: [{ message: error.message }] } : {}),
      });
    }
  });

  fastify.put('/:courseId/tiers/:tierId', {
    preHandler: [requireCreatorOrAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { courseId, tierId } = request.params as { courseId: string; tierId: string };
      const user = request.user as AuthUser;
      const data = updatePricingTierSchema.parse(request.body);

      if (!(await ownsCourse(fastify, user, courseId))) {
        return reply.status(404).send({ error: 'Cours introuvable' });
      }

      const result = await fastify.pg.query(
        `UPDATE pricing_tiers SET
          label = COALESCE($1, label),
          price = COALESCE($2, price),
          currency = COALESCE($3, currency),
          is_active = COALESCE($4, is_active),
          valid_from = COALESCE($5, valid_from),
          valid_to = COALESCE($6, valid_to),
          sort_order = COALESCE($7, sort_order),
          updated_at = NOW()
         WHERE id = $8 AND course_id = $9
         RETURNING *`,
        [
          data.label,
          data.price,
          data.currency,
          data.isActive,
          data.validFrom ? new Date(data.validFrom) : null,
          data.validTo ? new Date(data.validTo) : null,
          data.sortOrder,
          tierId,
          courseId,
        ]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Palier introuvable' });
      }

      return reply.send({ tier: result.rows[0] });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Donnees invalides',
          details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        });
      }
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Erreur serveur',
        ...(process.env.NODE_ENV !== 'production' && error instanceof Error ? { details: [{ message: error.message }] } : {}),
      });
    }
  });

  fastify.delete('/:courseId/tiers/:tierId', {
    preHandler: [requireCreatorOrAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { courseId, tierId } = request.params as { courseId: string; tierId: string };
    const user = request.user as AuthUser;

    if (!(await ownsCourse(fastify, user, courseId))) {
      return reply.status(404).send({ error: 'Cours introuvable' });
    }

    const result = await fastify.pg.query(
      'DELETE FROM pricing_tiers WHERE id = $1 AND course_id = $2 RETURNING id',
      [tierId, courseId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Palier introuvable' });
    }

    return reply.send({ message: 'Palier supprime' });
  });

  fastify.get('/:courseId/history', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try { await request.jwtVerify(); } catch { return reply.status(401).send({ error: 'Non autorise' }); }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { courseId } = request.params as { courseId: string };
    const user = request.user as AuthUser;

    if (!(await ownsCourse(fastify, user, courseId))) {
      return reply.status(404).send({ error: 'Cours introuvable' });
    }

    const result = await fastify.pg.query(
      `SELECT h.*, u.name AS changed_by_name
       FROM course_price_history h
       LEFT JOIN users u ON u.id = h.changed_by
       WHERE h.course_id = $1
       ORDER BY h.created_at DESC
       LIMIT 50`,
      [courseId]
    );

    return reply.send({ history: result.rows });
  });

  fastify.get('/commission-rates', {
    preHandler: [requireAdmin],
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await fastify.pg.query(
      'SELECT * FROM commission_rates ORDER BY plan'
    );
    return reply.send({ rates: result.rows });
  });

  fastify.put('/commission-rates/:plan', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { plan } = request.params as { plan: string };
      const user = request.user as AuthUser;
      const schema = z.object({ rate: z.number().int().min(0).max(100) });
      const data = schema.parse(request.body);

      if (!['free', 'pro', 'enterprise'].includes(plan)) {
        return reply.status(400).send({ error: 'Plan invalide' });
      }

      const result = await fastify.pg.query(
        `INSERT INTO commission_rates (plan, rate, updated_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (plan)
         DO UPDATE SET rate = EXCLUDED.rate, updated_by = EXCLUDED.updated_by, updated_at = NOW()
         RETURNING *`,
        [plan, data.rate, user.id]
      );

      const previousResult = await fastify.pg.query(
        `SELECT rate FROM commission_rates WHERE plan = $1`,
        [plan]
      );
      const previousRate = previousResult.rows.length > 0 ? Number(previousResult.rows[0].rate) : null;

      await fastify.pg.query(
        `INSERT INTO commission_rate_history (scope, category, old_rate, new_rate, changed_by, reason)
         VALUES ('global', NULL, $1, $2, $3, 'plan_rate_update')`,
        [previousRate, data.rate, user.id]
      );

      return reply.send({ rate: result.rows[0] });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Donnees invalides',
          details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur serveur' });
    }
  });
}
