import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

type AuthUser = {
  id: string;
  role: 'admin' | 'creator' | 'learner';
};

async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<AuthUser | null> {
  try {
    await request.jwtVerify();
    const tokenUser = request.user as AuthUser;
    const result = await request.server.pg.query(
      'SELECT id FROM users WHERE id = $1 AND role = $2 AND is_active = true',
      [tokenUser.id, 'admin'],
    );
    if (result.rows.length === 0) {
      reply.status(403).send({ error: "Acces reserve a l'administration" });
      return null;
    }
    return tokenUser;
  } catch {
    reply.status(401).send({ error: 'Non autorise' });
    return null;
  }
}

const planSchema = z.object({
  name: z.string().min(3),
  price_gnf: z.number().int().min(0),
  trial_period_days: z.number().int().min(0).default(0),
  features: z.array(z.string()).min(1),
  is_active: z.boolean(),
  is_public: z.boolean(),
});

const creatorOverrideSchema = z.object({
  monetization_model: z.enum(['commission', 'subscription']),
  custom_commission_rate: z.number().min(0).max(100).nullable(),
});

const ruleSchema = z.object({
  scope: z.enum(['global', 'category', 'creator']),
  creatorId: z.string().uuid().optional(),
  category: z.string().trim().min(1).max(100).optional(),
  rate: z.number().int().min(0).max(100),
  minCommissionAmount: z.number().int().min(0).nullable().optional(),
  maxCommissionAmount: z.number().int().min(0).nullable().optional(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  isPromo: z.boolean().default(false),
  promoLabel: z.string().trim().max(100).optional(),
});

const confirmSchema = z.object({
  paymentMethod: z.string().trim().max(50).optional(),
  transactionRef: z.string().trim().max(255).optional(),
});

const rejectSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

const grantSchema = z.object({
  planId: z.string().uuid(),
  months: z.number().int().min(1).max(12).default(1),
});

async function insertRateHistory(
  fastify: FastifyInstance,
  input: {
    scope: string;
    creatorId?: string | null;
    category?: string | null;
    oldRate: number | null;
    newRate: number;
    changedBy: string;
    reason?: string | null;
  },
): Promise<void> {
  await fastify.pg.query(
    `INSERT INTO commission_rate_history (rule_id, scope, creator_id, category, old_rate, new_rate, changed_by, reason)
     VALUES (NULL, $1, $2, $3, $4, $5, $6, $7)`,
    [
      input.scope,
      input.creatorId || null,
      input.category || null,
      input.oldRate,
      input.newRate,
      input.changedBy,
      input.reason || null,
    ],
  );
}

async function insertMonetizationHistory(
  fastify: FastifyInstance,
  input: {
    creatorId: string;
    previousMode: string;
    newMode: string;
    subscriptionId?: string | null;
    reason?: string | null;
    changedBy?: string | null;
    metadata?: Record<string, unknown> | null;
  },
): Promise<void> {
  await fastify.pg.query(
    `INSERT INTO creator_monetization_history
       (creator_id, previous_mode, new_mode, subscription_id, reason, changed_by, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      input.creatorId,
      input.previousMode,
      input.newMode,
      input.subscriptionId || null,
      input.reason || null,
      input.changedBy || null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ],
  );
}

async function notifyCreator(fastify: FastifyInstance, userId: string, title: string, message: string, data?: Record<string, unknown>) {
  await fastify.pg.query(
    `INSERT INTO notifications (user_id, type, title, message, data)
     VALUES ($1, 'subscription', $2, $3, $4)`,
    [userId, title, message, data ? JSON.stringify(data) : null],
  );
}

export async function adminMonetizationRoutes(fastify: FastifyInstance) {
  const V1_ADMIN_PREFIX = '/admin/monetization';

  // ============ PARAMETRES PLATEFORME ============
  const SETTING_SCHEMAS: Record<string, (v: unknown) => number | null> = {
    break_even_reference_plan_price: (v) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
    },
    grace_period_days: (v) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 && n <= 60 ? Math.round(n) : null;
    },
  };

  fastify.get(`${V1_ADMIN_PREFIX}/settings`, { preHandler: [requireAdmin] }, async (_req, reply) => {
    const result = await fastify.pg.query(
      `SELECT key, value, updated_at FROM platform_settings ORDER BY key`,
    );
    return reply.send({ settings: result.rows });
  });

  fastify.put(`${V1_ADMIN_PREFIX}/settings/:key`, { preHandler: [requireAdmin] }, async (request, reply) => {
    const admin = request.user as AuthUser;
    const { key } = request.params as { key: string };
    const validator = SETTING_SCHEMAS[key];
    if (!validator) {
      return reply.status(400).send({ error: 'Parametre inconnu' });
    }
    const body = request.body as { value?: unknown };
    const value = validator(body?.value);
    if (value === null) {
      return reply.status(400).send({ error: 'Valeur invalide pour ce parametre' });
    }

    const result = await fastify.pg.query(
      `INSERT INTO platform_settings (key, value, updated_by, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()
       RETURNING key, value, updated_at`,
      [key, value, admin.id],
    );

    await fastify.pg.query(
      `INSERT INTO admin_activity_logs (actor_user_id, action, reason, metadata)
       VALUES ($1, 'update_platform_setting', $2, $3)`,
      [admin.id, 'Modification du parametre de monetisation', JSON.stringify({ key, value })],
    );

    return reply.send({ setting: result.rows[0] });
  });

  // ============ PLANS ============
  fastify.get(`${V1_ADMIN_PREFIX}/plans`, { preHandler: [requireAdmin] }, async (_req, reply) => {
    const result = await fastify.pg.query('SELECT * FROM subscription_plans ORDER BY price_gnf ASC');
    return reply.send(result.rows);
  });

  fastify.post(`${V1_ADMIN_PREFIX}/plans`, { preHandler: [requireAdmin] }, async (req, reply) => {
    const data = planSchema.parse(req.body);
    const result = await fastify.pg.query(
      `INSERT INTO subscription_plans (name, price_gnf, trial_period_days, features, is_active, is_public)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.name, data.price_gnf, data.trial_period_days, data.features, data.is_active, data.is_public],
    );
    return reply.status(201).send(result.rows[0]);
  });

  fastify.put(`${V1_ADMIN_PREFIX}/plans/:id`, { preHandler: [requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const data = planSchema.parse(req.body);
    const result = await fastify.pg.query(
      `UPDATE subscription_plans
       SET name = $1, price_gnf = $2, trial_period_days = $3, features = $4, is_active = $5, is_public = $6, updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [data.name, data.price_gnf, data.trial_period_days, data.features, data.is_active, data.is_public, id],
    );
    if (result.rowCount === 0) {
      return reply.status(404).send({ error: 'Plan non trouve.' });
    }
    return reply.send(result.rows[0]);
  });

  // ============ FORMATEURS ============
  fastify.get(`${V1_ADMIN_PREFIX}/creators`, { preHandler: [requireAdmin] }, async (_req, reply) => {
    const result = await fastify.pg.query(
      `SELECT c.id, u.name, u.email, c.monetization_model, c.custom_commission_rate,
              c.has_used_trial, c.subscription_status,
              sp.name AS plan_name, cs.status AS subscription_status_detail,
              cs.expires_at, cs.grace_period_ends_at
       FROM creators c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN creator_subscriptions cs ON c.subscription_id = cs.id
       LEFT JOIN subscription_plans sp ON cs.plan_id = sp.id
       ORDER BY u.name`,
    );
    return reply.send(result.rows);
  });

  fastify.put(`${V1_ADMIN_PREFIX}/creators/:creatorId`, { preHandler: [requireAdmin] }, async (req, reply) => {
    const admin = req.user as AuthUser;
    const { creatorId } = req.params as { creatorId: string };
    const data = creatorOverrideSchema.parse(req.body);

    const creatorResult = await fastify.pg.query(
      `SELECT c.monetization_model, c.custom_commission_rate, c.subscription_status
       FROM creators c WHERE c.id = $1`,
      [creatorId],
    );
    if (creatorResult.rows.length === 0) {
      return reply.status(404).send({ error: 'Formateur non trouve.' });
    }
    const creator = creatorResult.rows[0];

    if (data.monetization_model === 'subscription') {
      const hasActiveSubscription =
        creator.subscription_status === 'active' || creator.subscription_status === 'grace_period';
      if (!hasActiveSubscription) {
        return reply.status(400).send({
          error: 'Impossible de passer ce formateur en mode abonnement sans abonnement actif. Confirmez son paiement ou accordez-lui un abonnement.',
        });
      }
    }

    await fastify.pg.query('BEGIN');
    try {
      let subscriptionIdToClear: string | null = null;
      if (data.monetization_model === 'commission' && creator.subscription_status != null) {
        const subResult = await fastify.pg.query(
          `SELECT id FROM creator_subscriptions
           WHERE creator_id = $1 AND status IN ('active', 'grace_period', 'pending_payment')
           ORDER BY created_at DESC LIMIT 1`,
          [creatorId],
        );
        if (subResult.rows.length > 0) {
          subscriptionIdToClear = subResult.rows[0].id;
          await fastify.pg.query(
            `UPDATE creator_subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1`,
            [subscriptionIdToClear],
          );
        }
      }

      const result = await fastify.pg.query(
        `UPDATE creators
         SET monetization_model = $1,
             custom_commission_rate = $2,
             subscription_status = CASE
               WHEN $1 = 'commission' THEN NULL
               ELSE subscription_status
             END,
             subscription_expires_at = CASE
               WHEN $1 = 'commission' THEN NULL
               ELSE subscription_expires_at
             END,
             grace_period_ends_at = CASE
               WHEN $1 = 'commission' THEN NULL
               ELSE grace_period_ends_at
             END
         WHERE id = $3 RETURNING id, monetization_model, custom_commission_rate`,
        [data.monetization_model, data.custom_commission_rate, creatorId],
      );

      if (creator.monetization_model !== data.monetization_model) {
        await insertMonetizationHistory(fastify, {
          creatorId,
          previousMode: creator.monetization_model,
          newMode: data.monetization_model,
          subscriptionId: subscriptionIdToClear,
          reason: 'admin_override',
          changedBy: admin.id,
          metadata: { customCommissionRate: data.custom_commission_rate },
        });
      }

      if (creator.custom_commission_rate !== data.custom_commission_rate) {
        await insertRateHistory(fastify, {
          scope: 'creator',
          creatorId,
          oldRate: creator.custom_commission_rate,
          newRate: data.custom_commission_rate ?? 0,
          changedBy: admin.id,
          reason: 'admin_override',
        });
      }

      await fastify.pg.query(
        `INSERT INTO admin_activity_logs (actor_user_id, target_user_id, action, reason, metadata)
         VALUES ($1, $2, 'override_monetization', $3, $4)`,
        [
          admin.id,
          creatorId,
          'Modification exceptionnelle du mode de monetisation',
          JSON.stringify({ monetizationModel: data.monetization_model, customCommissionRate: data.custom_commission_rate }),
        ],
      );

      await fastify.pg.query('COMMIT');
      return reply.send(result.rows[0]);
    } catch (error) {
      await fastify.pg.query('ROLLBACK');
      throw error;
    }
  });

  // ============ SOUSCRIPTIONS ============
  fastify.get(`${V1_ADMIN_PREFIX}/subscriptions`, { preHandler: [requireAdmin] }, async (request, reply) => {
    const { page = 1, limit = 20, status = 'ALL' } = request.query as any;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (safePage - 1) * safeLimit;
    const params: any[] = [];
    const conditions: string[] = [];

    if (status && status !== 'ALL') {
      params.push(status);
      conditions.push('cs.status = $' + params.length);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const countResult = await fastify.pg.query(
      `SELECT COUNT(*)::int AS total FROM creator_subscriptions cs ${whereClause}`,
      params,
    );

    const result = await fastify.pg.query(
      `SELECT cs.*, u.name AS creator_name, u.email AS creator_email,
              sp.name AS plan_name
       FROM creator_subscriptions cs
       JOIN creators c ON c.id = cs.creator_id
       JOIN users u ON u.id = c.user_id
       LEFT JOIN subscription_plans sp ON sp.id = cs.plan_id
       ${whereClause}
       ORDER BY cs.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, safeLimit, offset],
    );

    return reply.send({
      subscriptions: result.rows,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: countResult.rows[0].total,
        totalPages: Math.ceil(countResult.rows[0].total / safeLimit),
      },
    });
  });

  fastify.post(`${V1_ADMIN_PREFIX}/subscriptions/:id/confirm`, { preHandler: [requireAdmin] }, async (request, reply) => {
    const admin = request.user as AuthUser;
    const { id } = request.params as { id: string };
    let data: z.infer<typeof confirmSchema>;
    try {
      data = confirmSchema.parse(request.body || {});
    } catch {
      return reply.status(400).send({ error: 'Donnees de paiement invalides' });
    }

    const subResult = await fastify.pg.query(
      `SELECT cs.*, c.user_id,
              sp.name AS plan_name, sp.price_gnf
       FROM creator_subscriptions cs
       JOIN creators c ON c.id = cs.creator_id
       LEFT JOIN subscription_plans sp ON sp.id = cs.plan_id
       WHERE cs.id = $1`,
      [id],
    );
    if (subResult.rows.length === 0) {
      return reply.status(404).send({ error: 'Souscription non trouvee' });
    }
    const sub = subResult.rows[0];
    if (sub.status !== 'pending_payment') {
      return reply.status(400).send({ error: "Seules les souscriptions en attente de paiement peuvent etre confirmees" });
    }

    const activeConflict = await fastify.pg.query(
      `SELECT id FROM creator_subscriptions
       WHERE creator_id = $1 AND status IN ('active', 'grace_period') AND id != $2`,
      [sub.creator_id, id],
    );
    if (activeConflict.rows.length > 0) {
      return reply.status(400).send({ error: 'Ce formateur possede deja un abonnement actif (regle RM-10)' });
    }

    const reference = data.transactionRef || 'SUB-' + id.slice(0, 8).toUpperCase();

    await fastify.pg.query('BEGIN');
    try {
      const expiresAtResult = await fastify.pg.query(
        `UPDATE creator_subscriptions
         SET status = 'active',
             started_at = NOW(),
             expires_at = NOW() + INTERVAL '1 month',
             next_renewal_at = NOW() + INTERVAL '1 month',
             grace_period_ends_at = NULL,
             is_trial = false,
             payment_method = COALESCE($1, payment_method),
             transaction_ref = $2
         WHERE id = $3
         RETURNING expires_at`,
        [data.paymentMethod || null, reference, id],
      );
      const expiresAt = expiresAtResult.rows[0].expires_at;

      await fastify.pg.query(
        `INSERT INTO subscription_payments
           (subscription_id, amount, currency, payment_method, provider, provider_ref, status, period_start, period_end)
         VALUES ($1, $2, $3, $4, 'offline_code', $5, 'paid', NOW(), $6)`,
        [id, Number(sub.price_at_subscription), sub.currency, data.paymentMethod || null, reference, expiresAt],
      );

      await fastify.pg.query(
        `UPDATE creators
         SET monetization_model = 'subscription',
             subscription_id = $1,
             subscription_status = 'active',
             subscription_expires_at = $2,
             grace_period_ends_at = NULL
         WHERE id = $3`,
        [id, expiresAt, sub.creator_id],
      );

      await insertMonetizationHistory(fastify, {
        creatorId: sub.creator_id,
        previousMode: 'commission',
        newMode: 'subscription',
        subscriptionId: id,
        reason: 'payment_confirmed',
        changedBy: admin.id,
        metadata: { planId: sub.plan_id, planName: sub.plan_name, amount: Number(sub.price_at_subscription), reference },
      });

      await fastify.pg.query(
        `INSERT INTO admin_activity_logs (actor_user_id, target_user_id, action, reason, metadata)
         VALUES ($1, $2, 'confirm_subscription', $3, $4)`,
        [
          admin.id,
          sub.user_id,
          "Confirmation du paiement de l'abonnement",
          JSON.stringify({ subscriptionId: id, reference, expiresAt }),
        ],
      );

      await notifyCreator(
        fastify,
        sub.user_id,
        'Abonnement active',
        `Votre abonnement ${sub.plan_name} est actif. Vous conservez 100% de vos revenus de ventes.`,
        { subscriptionId: id, expiresAt },
      );

      await fastify.pg.query('COMMIT');
      return reply.send({
        status: 'ACTIVATED',
        subscriptionId: id,
        reference,
        expiresAt,
        message: "Paiement confirme. L'abonnement est actif jusqu'a " + new Date(expiresAt).toISOString(),
      });
    } catch (error) {
      await fastify.pg.query('ROLLBACK');
      throw error;
    }
  });

  fastify.post(`${V1_ADMIN_PREFIX}/subscriptions/:id/reject`, { preHandler: [requireAdmin] }, async (request, reply) => {
    const admin = request.user as AuthUser;
    const { id } = request.params as { id: string };
    let data: z.infer<typeof rejectSchema>;
    try {
      data = rejectSchema.parse(request.body);
    } catch {
      return reply.status(400).send({ error: 'La raison du rejet est requise' });
    }

    const subResult = await fastify.pg.query(
      `SELECT cs.*, c.user_id FROM creator_subscriptions cs
       JOIN creators c ON c.id = cs.creator_id
       WHERE cs.id = $1`,
      [id],
    );
    if (subResult.rows.length === 0) {
      return reply.status(404).send({ error: 'Souscription non trouvee' });
    }
    const sub = subResult.rows[0];

    await fastify.pg.query('BEGIN');
    try {
      await fastify.pg.query(
        `UPDATE creator_subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1`,
        [id],
      );
      await fastify.pg.query(
        `UPDATE subscription_payments SET status = 'rejected' WHERE subscription_id = $1 AND status = 'pending'`,
        [id],
      );
      await fastify.pg.query(
        `UPDATE creators SET subscription_id = NULL, subscription_status = NULL
         WHERE id = $1 AND subscription_id = $2`,
        [sub.creator_id, id],
      );
      await fastify.pg.query(
        `INSERT INTO admin_activity_logs (actor_user_id, target_user_id, action, reason, metadata)
         VALUES ($1, $2, 'reject_subscription', $3, $4)`,
        [admin.id, sub.user_id, data.reason, JSON.stringify({ subscriptionId: id })],
      );
      await notifyCreator(fastify, sub.user_id, 'Paiement rejete', 'Votre demande d\'abonnement a ete rejetee : ' + data.reason, { subscriptionId: id });
      await fastify.pg.query('COMMIT');
      return reply.send({ status: 'cancelled', message: 'Souscription rejetee.' });
    } catch (error) {
      await fastify.pg.query('ROLLBACK');
      throw error;
    }
  });

  fastify.post(`${V1_ADMIN_PREFIX}/subscriptions/:id/suspend`, { preHandler: [requireAdmin] }, async (request, reply) => {
    const admin = request.user as AuthUser;
    const { id } = request.params as { id: string };

    const subResult = await fastify.pg.query(
      `SELECT cs.*, c.user_id FROM creator_subscriptions cs
       JOIN creators c ON c.id = cs.creator_id
       WHERE cs.id = $1`,
      [id],
    );
    if (subResult.rows.length === 0) {
      return reply.status(404).send({ error: 'Souscription non trouvee' });
    }
    const sub = subResult.rows[0];
    if (!['active', 'grace_period'].includes(sub.status)) {
      return reply.status(400).send({ error: 'Cet abonnement ne peut pas etre suspendu' });
    }

    await fastify.pg.query('BEGIN');
    try {
      await fastify.pg.query(`UPDATE creator_subscriptions SET status = 'suspended' WHERE id = $1`, [id]);
      await fastify.pg.query(
        `UPDATE creators SET subscription_status = 'suspended' WHERE id = $1 AND subscription_id = $2`,
        [sub.creator_id, id],
      );
      await insertMonetizationHistory(fastify, {
        creatorId: sub.creator_id,
        previousMode: 'subscription',
        newMode: 'suspended',
        subscriptionId: id,
        reason: 'admin_suspend',
        changedBy: admin.id,
      });
      await fastify.pg.query('COMMIT');
      await notifyCreator(fastify, sub.user_id, 'Abonnement suspendu', 'Votre abonnement a ete suspendu par l\'administration.');
      return reply.send({ status: 'suspended', message: 'Abonnement suspendu. Les commissions redeviennent applicables.' });
    } catch (error) {
      await fastify.pg.query('ROLLBACK');
      throw error;
    }
  });

  fastify.post(`${V1_ADMIN_PREFIX}/subscriptions/:id/resume`, { preHandler: [requireAdmin] }, async (request, reply) => {
    const admin = request.user as AuthUser;
    const { id } = request.params as { id: string };

    const subResult = await fastify.pg.query(
      `SELECT cs.*, c.user_id FROM creator_subscriptions cs
       JOIN creators c ON c.id = cs.creator_id
       WHERE cs.id = $1`,
      [id],
    );
    if (subResult.rows.length === 0) {
      return reply.status(404).send({ error: 'Souscription non trouvee' });
    }
    const sub = subResult.rows[0];
    if (sub.status !== 'suspended') {
      return reply.status(400).send({ error: 'Seul un abonnement suspendu peut etre repris' });
    }

    const graceEnd = sub.grace_period_ends_at && new Date(sub.grace_period_ends_at) > new Date();
    const stillValid = new Date(sub.expires_at) > new Date() || graceEnd;

    await fastify.pg.query('BEGIN');
    try {
      if (stillValid) {
        await fastify.pg.query(`UPDATE creator_subscriptions SET status = 'active' WHERE id = $1`, [id]);
        await fastify.pg.query(
          `UPDATE creators SET subscription_status = 'active' WHERE id = $1 AND subscription_id = $2`,
          [sub.creator_id, id],
        );
        await insertMonetizationHistory(fastify, {
          creatorId: sub.creator_id,
          previousMode: 'suspended',
          newMode: 'subscription',
          subscriptionId: id,
          reason: 'admin_resume',
          changedBy: admin.id,
        });
        await fastify.pg.query('COMMIT');
        await notifyCreator(fastify, sub.user_id, 'Abonnement repris', 'Votre abonnement est de nouveau actif.');
        return reply.send({ status: 'active', message: 'Abonnement reactive.' });
      }
      await fastify.pg.query(
        `UPDATE creator_subscriptions SET status = 'expired', cancelled_at = NOW() WHERE id = $1`,
        [id],
      );
      await fastify.pg.query(
        `UPDATE creators SET monetization_model = 'commission', subscription_id = NULL,
                             subscription_status = NULL, subscription_expires_at = NULL, grace_period_ends_at = NULL
         WHERE id = $1`,
        [sub.creator_id],
      );
      await insertMonetizationHistory(fastify, {
        creatorId: sub.creator_id,
        previousMode: 'subscription',
        newMode: 'commission',
        subscriptionId: id,
        reason: 'resume_after_expiry',
        changedBy: admin.id,
      });
      await fastify.pg.query('COMMIT');
      return reply.send({ status: 'expired', message: 'La periode est ecoulee. Le formateur repasse au mode commission.' });
    } catch (error) {
      await fastify.pg.query('ROLLBACK');
      throw error;
    }
  });

  // ============ REGLES DE COMMISSION (RM-06) ============
  fastify.get(`${V1_ADMIN_PREFIX}/rules`, { preHandler: [requireAdmin] }, async (_req, reply) => {
    const result = await fastify.pg.query(
      `SELECT r.*, u.name AS created_by_name
       FROM commission_rules r
       LEFT JOIN users u ON u.id = r.created_by
       ORDER BY r.scope, r.created_at DESC`,
    );
    return reply.send({ rules: result.rows });
  });

  fastify.post(`${V1_ADMIN_PREFIX}/rules`, { preHandler: [requireAdmin] }, async (request, reply) => {
    const admin = request.user as AuthUser;
    let data: z.infer<typeof ruleSchema>;
    try {
      data = ruleSchema.parse(request.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Donnees invalides', details: error.errors });
      }
      throw error;
    }

    if (data.scope === 'creator' && !data.creatorId) {
      return reply.status(400).send({ error: 'La portee creator necessite un creatorId' });
    }
    if (data.scope === 'category' && !data.category) {
      return reply.status(400).send({ error: 'La portee category necessite une categorie' });
    }
    if (data.minCommissionAmount != null && data.maxCommissionAmount != null && data.minCommissionAmount > data.maxCommissionAmount) {
      return reply.status(400).send({ error: 'La commission minimale ne peut exceder la maximale' });
    }

    const result = await fastify.pg.query(
      `INSERT INTO commission_rules
         (scope, creator_id, category, rate, min_commission_amount, max_commission_amount, valid_from, valid_to, is_promo, promo_label, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        data.scope,
        data.creatorId || null,
        data.category || null,
        data.rate,
        data.minCommissionAmount ?? null,
        data.maxCommissionAmount ?? null,
        data.validFrom ? new Date(data.validFrom) : null,
        data.validTo ? new Date(data.validTo) : null,
        data.isPromo,
        data.promoLabel || null,
        admin.id,
      ],
    );

    await insertRateHistory(fastify, {
      scope: data.scope,
      creatorId: data.creatorId,
      category: data.category,
      oldRate: null,
      newRate: data.rate,
      changedBy: admin.id,
      reason: (data.isPromo ? 'promo' : 'rule_created') + (data.promoLabel ? ':' + data.promoLabel : ''),
    });

    return reply.status(201).send({ rule: result.rows[0] });
  });

  fastify.put(`${V1_ADMIN_PREFIX}/rules/:id`, { preHandler: [requireAdmin] }, async (request, reply) => {
    const admin = request.user as AuthUser;
    const { id } = request.params as { id: string };
    let data: z.infer<typeof ruleSchema>;
    try {
      data = ruleSchema.parse(request.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Donnees invalides', details: error.errors });
      }
      throw error;
    }

    const existingResult = await fastify.pg.query('SELECT * FROM commission_rules WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return reply.status(404).send({ error: 'Regle non trouvee' });
    }
    const existing = existingResult.rows[0];

    const result = await fastify.pg.query(
      `UPDATE commission_rules SET
         rate = $1,
         min_commission_amount = $2,
         max_commission_amount = $3,
         valid_from = $4,
         valid_to = $5,
         is_promo = $6,
         promo_label = $7,
         updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [
        data.rate,
        data.minCommissionAmount ?? null,
        data.maxCommissionAmount ?? null,
        data.validFrom ? new Date(data.validFrom) : null,
        data.validTo ? new Date(data.validTo) : null,
        data.isPromo,
        data.promoLabel || null,
        id,
      ],
    );

    await fastify.pg.query(
      `INSERT INTO commission_rate_history (rule_id, scope, creator_id, category, old_rate, new_rate, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        existing.scope,
        existing.creator_id,
        existing.category,
        Number(existing.rate),
        data.rate,
        admin.id,
        'rule_updated',
      ],
    );

    return reply.send({ rule: result.rows[0] });
  });

  fastify.delete(`${V1_ADMIN_PREFIX}/rules/:id`, { preHandler: [requireAdmin] }, async (request, reply) => {
    const admin = request.user as AuthUser;
    const { id } = request.params as { id: string };

    const existingResult = await fastify.pg.query('SELECT * FROM commission_rules WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return reply.status(404).send({ error: 'Regle non trouvee' });
    }
    const existing = existingResult.rows[0];

    await fastify.pg.query('UPDATE commission_rules SET is_active = false, updated_at = NOW() WHERE id = $1', [id]);
    await insertRateHistory(fastify, {
      scope: existing.scope,
      creatorId: existing.creator_id,
      category: existing.category,
      oldRate: Number(existing.rate),
      newRate: 0,
      changedBy: admin.id,
      reason: 'rule_deactivated',
    });

    return reply.send({ message: 'Regle desactivee.' });
  });

  // ============ CADEAUX / PERIODES GRATUITES (article 10) ============
  fastify.post(`${V1_ADMIN_PREFIX}/creators/:creatorId/grant`, { preHandler: [requireAdmin] }, async (request, reply) => {
    const admin = request.user as AuthUser;
    const { creatorId } = request.params as { creatorId: string };
    let data: z.infer<typeof grantSchema>;
    try {
      data = grantSchema.parse(request.body);
    } catch {
      return reply.status(400).send({ error: 'planId (et eventuellement months) requis' });
    }

    const creatorResult = await fastify.pg.query(
      `SELECT c.monetization_model, c.subscription_status, c.user_id
       FROM creators c WHERE c.id = $1`,
      [creatorId],
    );
    if (creatorResult.rows.length === 0) {
      return reply.status(404).send({ error: 'Formateur non trouve' });
    }
    const creator = creatorResult.rows[0];
    if (creator.subscription_status === 'active' || creator.subscription_status === 'grace_period') {
      return reply.status(400).send({ error: 'Ce formateur a deja un abonnement actif' });
    }

    const planResult = await fastify.pg.query(
      'SELECT id, name FROM subscription_plans WHERE id = $1 AND is_active = true',
      [data.planId],
    );
    if (planResult.rows.length === 0) {
      return reply.status(404).send({ error: 'Plan non valide' });
    }

    await fastify.pg.query('BEGIN');
    try {
      if (creator.subscription_id) {
        await fastify.pg.query(
          `UPDATE creator_subscriptions SET status = 'cancelled', cancelled_at = NOW()
           WHERE id = $1 AND status = 'pending_payment'`,
          [creator.subscription_id],
        );
      }

      const subResult = await fastify.pg.query(
        `INSERT INTO creator_subscriptions
           (creator_id, plan_id, status, price_at_subscription, currency, started_at, expires_at, next_renewal_at, is_trial)
         VALUES ($1, $2, 'active', 0, 'GNF', NOW(), NOW() + ($3 || ' months')::interval, NOW() + ($3 || ' months')::interval, false)
         RETURNING id, expires_at`,
        [creatorId, data.planId, data.months],
      );
      const sub = subResult.rows[0];

      await fastify.pg.query(
        `UPDATE creators
         SET monetization_model = 'subscription',
             subscription_id = $1,
             subscription_status = 'active',
             subscription_expires_at = $2,
             grace_period_ends_at = NULL,
             has_used_trial = true
         WHERE id = $3`,
        [sub.id, sub.expires_at, creatorId],
      );

      await insertMonetizationHistory(fastify, {
        creatorId,
        previousMode: creator.monetization_model,
        newMode: 'subscription',
        subscriptionId: sub.id,
        reason: 'admin_grant',
        changedBy: admin.id,
        metadata: { planId: data.planId, planName: planResult.rows[0].name, months: data.months, amount: 0 },
      });

      await fastify.pg.query(
        `INSERT INTO admin_activity_logs (actor_user_id, target_user_id, action, reason, metadata)
         VALUES ($1, $2, 'grant_subscription', $3, $4)`,
        [admin.id, creator.user_id, 'Abonnement offert', JSON.stringify({ planId: data.planId, months: data.months })],
      );

      await fastify.pg.query('COMMIT');
      await notifyCreator(
        fastify,
        creator.user_id,
        'Abonnement offert',
        `Un abonnement ${planResult.rows[0].name} de ${data.months} mois vous a ete offert.`,
        { subscriptionId: sub.id },
      );
      return reply.status(201).send({ status: 'active', subscriptionId: sub.id, expiresAt: sub.expires_at });
    } catch (error) {
      await fastify.pg.query('ROLLBACK');
      throw error;
    }
  });

  // ============ STATISTIQUES ============
  fastify.get(`${V1_ADMIN_PREFIX}/dashboard`, { preHandler: [requireAdmin] }, async (_req, reply) => {
    const statsResult = await fastify.pg.query(
      `SELECT
         (SELECT COUNT(*)::int FROM creators WHERE monetization_model = 'commission') AS commission_creators,
         (SELECT COUNT(*)::int FROM creators WHERE monetization_model = 'subscription') AS subscription_creators,
         (SELECT COUNT(*)::int FROM creator_subscriptions WHERE status = 'active') AS active_subscriptions,
         (SELECT COUNT(*)::int FROM creator_subscriptions WHERE status = 'pending_payment') AS pending_subscriptions,
         (SELECT COUNT(*)::int FROM creator_subscriptions WHERE status IN ('grace_period', 'suspended')) AS at_risk_subscriptions,
         (SELECT COALESCE(SUM(amount), 0)::int FROM subscription_payments WHERE status = 'paid') AS subscription_revenue,
         (SELECT COUNT(*)::int FROM commission_rate_history) AS rate_changes_logged,
         (SELECT COUNT(*)::int FROM creator_monetization_history) AS mode_changes_logged`,
    );
    return reply.send({ stats: statsResult.rows[0] });
  });
}