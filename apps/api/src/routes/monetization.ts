import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

type AuthUser = {
  id: string;
  role: 'admin' | 'creator' | 'learner';
  creatorId?: string;
};

async function requireCreator(request: FastifyRequest, reply: FastifyReply): Promise<AuthUser | null> {
  try {
    await request.jwtVerify();
    const user = request.user as AuthUser;
    if (user.role !== 'creator' || !user.creatorId) {
      reply.status(403).send({ error: 'Acces reserve aux formateurs.' });
      return null;
    }
    return user;
  } catch {
    reply.status(401).send({ error: 'Non autorise' });
    return null;
  }
}

const changePlanSchema = z.object({
  planId: z.string(),
});

export async function insertMonetizationHistory(
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

export async function monetizationRoutes(fastify: FastifyInstance) {
  // GET /api/monetization/plans - Plans d'abonnement disponibles
  fastify.get('/plans', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await fastify.pg.query(
        `SELECT id, name, price_gnf, billing_interval, features, trial_period_days,
                max_courses, max_students, commission_rate
         FROM subscription_plans
         WHERE is_active = true AND is_public = true
         ORDER BY price_gnf ASC`,
      );
      return reply.send({ plans: result.rows });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur serveur' });
    }
  });

  // GET /api/monetization/status - Statut de monetisation + seuil de rentabilite
  fastify.get('/status', { preHandler: [requireCreator] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as AuthUser;

      const creatorResult = await fastify.pg.query(
        `SELECT c.monetization_model,
                c.custom_commission_rate,
                c.has_used_trial,
                cs.id AS subscription_id,
                cs.status AS subscription_status,
                cs.expires_at AS subscription_expires_at,
                cs.grace_period_ends_at,
                sp.name AS plan_name,
                sp.price_gnf AS plan_price,
                sp.trial_period_days
         FROM creators c
         LEFT JOIN creator_subscriptions cs ON c.subscription_id = cs.id
         LEFT JOIN subscription_plans sp ON cs.plan_id = sp.id
         WHERE c.id = $1`,
        [user.creatorId],
      );

      if (creatorResult.rows.length === 0) {
        return reply.status(404).send({ error: 'Profil formateur non trouve.' });
      }

      const creator = creatorResult.rows[0];
      const defaultCommissionRate = Number(process.env.DEFAULT_COMMISSION_RATE || 15);
      const currentCommissionRate = creator.custom_commission_rate != null
        ? Number(creator.custom_commission_rate)
        : defaultCommissionRate;

      // Montant de reference pour le seuil de rentabilite, parametrable par le Super Admin
      const settingsResult = await fastify.pg.query(
        `SELECT value FROM platform_settings WHERE key = 'break_even_reference_plan_price'`,
      );
      const configuredPlanPrice = Number(settingsResult.rows[0]?.value);

      let proPlanPrice = Number.isFinite(configuredPlanPrice) && configuredPlanPrice > 0
        ? configuredPlanPrice
        : 75000;
      if (!Number.isFinite(configuredPlanPrice) || configuredPlanPrice <= 0) {
        const proPlanResult = await fastify.pg.query(
          `SELECT price_gnf FROM subscription_plans WHERE name = 'Pro' AND is_active = true`,
        );
        if (proPlanResult.rows[0]?.price_gnf != null) {
          proPlanPrice = Number(proPlanResult.rows[0].price_gnf);
        }
      }
      const breakEvenSales = currentCommissionRate > 0 ? Math.round(proPlanPrice / (currentCommissionRate / 100)) : 0;

      const salesResult = await fastify.pg.query(
        `SELECT COALESCE(SUM(gross_amount), 0)::int AS monthly_sales
         FROM financial_transactions
         WHERE trainer_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
        [user.id],
      );
      const monthlySales = Number(salesResult.rows[0].monthly_sales || 0);

      let recommendation = '';
      if (creator.monetization_model === 'commission') {
        if (breakEvenSales > 0 && monthlySales > breakEvenSales) {
          recommendation = `Au vu de vos ventes du mois (${monthlySales.toLocaleString('fr-FR')} GNF), l'abonnement Pro a ${proPlanPrice.toLocaleString('fr-FR')} GNF/mois pourrait vous faire economiser de l'argent.`;
        } else if (breakEvenSales > 0) {
          recommendation = `Votre formule actuelle a la commission semble avantageuse. Le seuil de rentabilite pour l'abonnement est d'environ ${breakEvenSales.toLocaleString('fr-FR')} GNF de ventes mensuelles.`;
        }
      } else if (creator.monetization_model === 'subscription') {
        recommendation = 'Vous beneficiez de 0% de commission sur vos ventes. Continuez comme ca !';
      }

      return reply.send({
        currentModel: creator.monetization_model,
        commissionRate: creator.monetization_model === 'commission' ? currentCommissionRate : 0,
        subscription: creator.subscription_id
          ? {
              id: creator.subscription_id,
              planName: creator.plan_name,
              priceGnf: Number(creator.plan_price || 0),
              status: creator.subscription_status,
              expiresAt: creator.subscription_expires_at,
              gracePeriodEndsAt: creator.grace_period_ends_at,
            }
          : null,
        hasUsedTrial: creator.has_used_trial,
        breakEven: {
          monthlySalesGnf: breakEvenSales,
          recommendation,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur serveur' });
    }
  });

  // POST /api/monetization/change-plan - Changer de formule (avec paiement reel)
  fastify.post('/change-plan', { preHandler: [requireCreator] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as AuthUser;
      let data: z.infer<typeof changePlanSchema>;
      try {
        data = changePlanSchema.parse(request.body);
      } catch {
        return reply.status(400).send({ error: 'Parametre planId invalide' });
      }

      const creatorResult = await fastify.pg.query(
        `SELECT c.monetization_model, c.has_used_trial,
                cs.id AS subscription_id, cs.status AS subscription_status,
                cs.expires_at AS subscription_expires_at,
                cs.grace_period_ends_at, cs.is_trial
         FROM creators c
         LEFT JOIN creator_subscriptions cs ON c.subscription_id = cs.id
         WHERE c.id = $1`,
        [user.creatorId],
      );
      if (creatorResult.rows.length === 0) {
        return reply.status(404).send({ error: 'Profil formateur non trouve.' });
      }
      const creator = creatorResult.rows[0];

      if (data.planId === 'commission') {
        const currentSubId: string | null = creator.subscription_id;
        const currentStatus: string | null = creator.subscription_status;
        const now = new Date();
        const remainingTime =
          (currentStatus === 'active' && new Date(creator.subscription_expires_at) > now) ||
          (currentStatus === 'grace_period' && new Date(creator.grace_period_ends_at || creator.subscription_expires_at) > now);

        await fastify.pg.query('BEGIN');
        try {
          if (currentSubId) {
            // DM-07: toute modification de formule est historisee dans la souscription
            await fastify.pg.query(
              `UPDATE creator_subscriptions
               SET status = 'cancelled', cancelled_at = NOW()
               WHERE id = $1 AND status IN ('active', 'grace_period', 'pending_payment')`,
              [currentSubId],
            );
          }

          const isPending = currentStatus === 'pending_payment';
          if (remainingTime && !isPending) {
            // Article 5 : le retour a la commission prend effet a la fin de la periode deja payee
            await fastify.pg.query(
              `UPDATE creators
               SET subscription_status = 'cancelled'
               WHERE id = $1`,
              [user.creatorId],
            );
            await insertMonetizationHistory(fastify, {
              creatorId: user.creatorId!,
              previousMode: 'subscription',
              newMode: 'commission',
              subscriptionId: currentSubId,
              reason: 'change_request_end_of_period',
              changedBy: user.id,
              metadata: { effectiveAt: creator.subscription_expires_at },
            });
            await fastify.pg.query('COMMIT');
            return reply.send({
              success: true,
              message: 'Votre demande de passage a la commission est enregistree. Elle prendra effet a la fin de votre periode deja payee.',
              effectiveAt: creator.subscription_expires_at,
            });
          }

          // Pas de periode restante (ou abonnement en attente de paiement) : bascule immediate
          await fastify.pg.query(
            `UPDATE creators
             SET monetization_model = 'commission',
                 subscription_id = NULL,
                 subscription_status = NULL,
                 subscription_expires_at = NULL,
                 grace_period_ends_at = NULL
             WHERE id = $1`,
            [user.creatorId],
          );
          await insertMonetizationHistory(fastify, {
            creatorId: user.creatorId!,
            previousMode: creator.monetization_model,
            newMode: 'commission',
            subscriptionId: currentSubId,
            reason: isPending ? 'pending_subscription_cancelled' : 'change_request',
            changedBy: user.id,
          });
          await fastify.pg.query('COMMIT');
          return reply.send({ success: true, message: 'Vous etes passe a la formule Starter avec commission.' });
        } catch (error) {
          await fastify.pg.query('ROLLBACK');
          throw error;
        }
      }

      // === Passage a un abonnement ===
      const planResult = await fastify.pg.query(
        `SELECT id, name, price_gnf, trial_period_days, billing_interval
         FROM subscription_plans WHERE id = $1 AND is_active = true`,
        [data.planId],
      );
      if (planResult.rows.length === 0) {
        return reply.status(404).send({ error: "Plan d'abonnement non valide." });
      }
      const plan = planResult.rows[0];

      if (creator.subscription_status === 'active' || creator.subscription_status === 'grace_period') {
        return reply.status(400).send({ error: 'Vous avez deja un abonnement actif. Changez de formule apres son expiration.' });
      }

      // Annuler un eventuel abonnement en attente avant de recommencer
      if (creator.subscription_id && creator.subscription_status === 'pending_payment') {
        await fastify.pg.query(
          `UPDATE creator_subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1`,
          [creator.subscription_id],
        );
      }

      const isStartingTrial = Number(plan.trial_period_days) > 0 && creator.has_used_trial !== true;

      await fastify.pg.query('BEGIN');
      try {
        if (isStartingTrial) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + Number(plan.trial_period_days));

          const subResult = await fastify.pg.query(
            `INSERT INTO creator_subscriptions
               (creator_id, plan_id, status, price_at_subscription, currency, started_at, expires_at, is_trial)
             VALUES ($1, $2, 'active', 0, 'GNF', NOW(), $3, true)
             RETURNING id`,
            [user.creatorId, plan.id, expiresAt],
          );
          const newSubscriptionId = subResult.rows[0].id;

          await fastify.pg.query(
            `UPDATE creators
             SET monetization_model = 'subscription',
                 subscription_id = $1,
                 subscription_status = 'active',
                 subscription_expires_at = $2,
                 grace_period_ends_at = NULL,
                 has_used_trial = true
             WHERE id = $3`,
            [newSubscriptionId, expiresAt, user.creatorId],
          );
          await insertMonetizationHistory(fastify, {
            creatorId: user.creatorId!,
            previousMode: creator.monetization_model,
            newMode: 'subscription',
            subscriptionId: newSubscriptionId,
            reason: 'free_trial',
            changedBy: user.id,
            metadata: { planId: plan.id, trialDays: Number(plan.trial_period_days), amount: 0 },
          });
          await fastify.pg.query('COMMIT');
          await notifyCreator(fastify, user.id, 'Essai gratuit demarre', `Votre essai gratuit de ${plan.trial_period_days} jours a commence !`, { subscriptionId: newSubscriptionId });
          return reply.status(201).send({
            success: true,
            status: 'active',
            trial: true,
            expiresAt,
            message: `Votre essai gratuit de ${plan.trial_period_days} jours a commence.`,
          });
        }

        // Abonnement payant : creation d'une demande en attente de paiement
        // expires_at sert de delai de paiement (7 jours) ; il sera remplace par la periode reelle a la confirmation
        const subResult = await fastify.pg.query(
          `INSERT INTO creator_subscriptions
             (creator_id, plan_id, status, price_at_subscription, currency, started_at, expires_at, is_trial)
           VALUES ($1, $2, 'pending_payment', $3, 'GNF', NOW(), NOW() + INTERVAL '7 days', false)
           RETURNING id`,
          [user.creatorId, plan.id, Number(plan.price_gnf)],
        );
        const newSubscriptionId = subResult.rows[0].id;

        await fastify.pg.query(
          `UPDATE creators
           SET subscription_id = $1,
               subscription_status = 'pending_payment',
               grace_period_ends_at = NULL
           WHERE id = $2`,
          [newSubscriptionId, user.creatorId],
        );

        await fastify.pg.query(
          `INSERT INTO subscription_payments
             (subscription_id, amount, currency, payment_method, provider, status)
           VALUES ($1, $2, 'GNF', NULL, 'offline_code', 'pending')`,
          [newSubscriptionId, Number(plan.price_gnf)],
        );

        await fastify.pg.query(
          `INSERT INTO admin_activity_logs (actor_user_id, target_user_id, action, reason, metadata)
           VALUES ($1, $2, 'subscription_payment_requested', 'Demande de souscription en attente de paiement', $3)`,
          [user.id, user.id, JSON.stringify({ subscriptionId: newSubscriptionId, planId: plan.id, amount: Number(plan.price_gnf) })],
        );

        await fastify.pg.query('COMMIT');

        return reply.status(201).send({
          success: true,
          status: 'pending_payment',
          subscriptionId: newSubscriptionId,
          amountGnf: Number(plan.price_gnf),
          message: `Demande d'abonnement ${
            plan.name
          } enregistree. Votre abonnement sera active apres confirmation du paiement de ${Number(plan.price_gnf).toLocaleString('fr-FR')} GNF par l'administration.`,
        });
      } catch (error) {
        await fastify.pg.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur serveur' });
    }
  });
}