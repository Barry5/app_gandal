import '../config/env.js';
import { pathToFileURL } from 'node:url';
import { createPool } from '../config/pool.js';
import type { Pool } from 'pg';

// Duree de la periode de grace, parametrable via platform_settings (cle 'grace_period_days')
const DEFAULT_GRACE_PERIOD_DAYS = 7;

export async function handleSubscriptionExpirations(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const graceSettings = await client.query(
      `SELECT value FROM platform_settings WHERE key = 'grace_period_days'`,
    );
    const gracePeriodDays = Number(graceSettings.rows[0]?.value ?? DEFAULT_GRACE_PERIOD_DAYS);

    const expiredSubsResult = await client.query(
      `SELECT cs.id, cs.creator_id, c.user_id, cs.plan_id, cs.is_trial, cs.expires_at
       FROM creator_subscriptions cs
       JOIN creators c ON c.id = cs.creator_id
       WHERE cs.status = 'active' AND cs.expires_at <= NOW()`,
    );

    if (expiredSubsResult.rows.length > 0) {
      const graceEndsAt = new Date();
      graceEndsAt.setDate(graceEndsAt.getDate() + gracePeriodDays);

      for (const sub of expiredSubsResult.rows) {
        if (sub.is_trial) {
          await client.query(`UPDATE creator_subscriptions SET status = 'expired', grace_period_ends_at = NULL WHERE id = $1`, [sub.id]);
          await client.query(
            `UPDATE creators
             SET monetization_model = 'commission', subscription_id = NULL, subscription_status = NULL,
                 subscription_expires_at = NULL, grace_period_ends_at = NULL
             WHERE id = $1 AND subscription_id = $2`,
            [sub.creator_id, sub.id],
          );
          await client.query(
            `INSERT INTO creator_monetization_history (creator_id, previous_mode, new_mode, subscription_id, reason)
             VALUES ($1, 'subscription', 'commission', $2, 'trial_ended')`,
            [sub.creator_id, sub.id],
          );
          await client.query(
            `INSERT INTO notifications (user_id, type, title, message)
             VALUES ($1, 'subscription', 'Essai gratuit termine', 'Votre periode d''essai est terminee. Passer a un abonnement payant pour conserver les avantages.')`,
            [sub.user_id],
          );
        } else {
          // Periode de grace : la date d'expiration d'origine est conservee (audit)
          await client.query(
            `UPDATE creator_subscriptions
             SET status = 'grace_period', grace_period_ends_at = $1
             WHERE id = $2`,
            [graceEndsAt, sub.id],
          );
          await client.query(
            `UPDATE creators
             SET subscription_status = 'grace_period', grace_period_ends_at = $1
             WHERE id = $2`,
            [graceEndsAt, sub.creator_id],
          );
          await client.query(
            `INSERT INTO notifications (user_id, type, title, message, data)
             VALUES ($1, 'subscription', 'Abonnement expire', 'Votre abonnement a expire. Vous beneficiez d''une periode de grace de ${gracePeriodDays} jours pour le renouveler avant de repasser au modele a la commission.', $2)`,
            [sub.user_id, JSON.stringify({ subscriptionId: sub.id, planId: sub.plan_id, gracePeriodEndsAt: graceEndsAt })],
          );
        }
      }
    }

    // Expiration de la periode de grace -> retour au mode Commission
    const graceExpiredSubsResult = await client.query(
      `SELECT cs.id, cs.creator_id, c.user_id
       FROM creator_subscriptions cs
       JOIN creators c ON c.id = cs.creator_id
       WHERE cs.status = 'grace_period' AND COALESCE(cs.grace_period_ends_at, cs.expires_at) <= NOW()`,
    );

    if (graceExpiredSubsResult.rows.length > 0) {
      for (const sub of graceExpiredSubsResult.rows) {
        await client.query(`UPDATE creator_subscriptions SET status = 'expired' WHERE id = $1`, [sub.id]);
        await client.query(
          `UPDATE creators
           SET monetization_model = 'commission', subscription_id = NULL, subscription_status = NULL,
               subscription_expires_at = NULL, grace_period_ends_at = NULL
           WHERE id = $1 AND subscription_id = $2`,
          [sub.creator_id, sub.id],
        );
        await client.query(
          `INSERT INTO creator_monetization_history (creator_id, previous_mode, new_mode, subscription_id, reason)
           VALUES ($1, 'subscription', 'commission', $2, 'grace_period_ended')`,
          [sub.creator_id, sub.id],
        );
        await client.query(
          `INSERT INTO notifications (user_id, type, title, message, data)
           VALUES ($1, 'subscription', 'Fin de l''abonnement', 'Votre abonnement et sa periode de grace sont termines. Votre compte est automatiquement passe au modele a la commission.', $2)`,
          [sub.user_id, JSON.stringify({ subscriptionId: sub.id })],
        );
      }
    }

    // Abonnements annules (changement de formule) arrives a leur date de fin -> retour au mode Commission
    const cancelledExpiredSubsResult = await client.query(
      `SELECT cs.id, cs.creator_id, c.user_id
       FROM creator_subscriptions cs
       JOIN creators c ON c.id = cs.creator_id
       WHERE cs.status = 'cancelled' AND cs.expires_at IS NOT NULL AND cs.expires_at <= NOW()`,
    );

    if (cancelledExpiredSubsResult.rows.length > 0) {
      for (const sub of cancelledExpiredSubsResult.rows) {
        await client.query(`UPDATE creator_subscriptions SET status = 'expired' WHERE id = $1`, [sub.id]);
        await client.query(
          `UPDATE creators
           SET monetization_model = 'commission', subscription_id = NULL, subscription_status = NULL,
               subscription_expires_at = NULL, grace_period_ends_at = NULL
           WHERE id = $1 AND subscription_id = $2`,
          [sub.creator_id, sub.id],
        );
        await client.query(
          `INSERT INTO creator_monetization_history (creator_id, previous_mode, new_mode, subscription_id, reason)
           VALUES ($1, 'subscription', 'commission', $2, 'cancelled_period_ended')`,
          [sub.creator_id, sub.id],
        );
        await client.query(
          `INSERT INTO notifications (user_id, type, title, message)
           VALUES ($1, 'subscription', 'Changement de formule effectif', 'Votre passage au modele a la commission est maintenant effectif.')`,
          [sub.user_id],
        );
      }
    }

    await client.query('COMMIT');
    console.log(
      `[Job] Termine : ${expiredSubsResult.rows.length} expiration(s), ${graceExpiredSubsResult.rows.length} grace(s) expiree(s), ${cancelledExpiredSubsResult.rows.length} annulation(s) arrivee(s) a terme. Grace = ${gracePeriodDays} jours.`,
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur dans le job handleSubscriptionExpirations', error);
    throw error;
  } finally {
    client.release();
  }
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const pool = createPool();
  handleSubscriptionExpirations(pool)
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch(async (error) => {
      console.error(error);
      await pool.end().catch(() => undefined);
      process.exit(1);
    });
}