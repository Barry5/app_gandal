const { Client } = require('pg');
const fs = require('fs');
const url = fs.readFileSync('../../.env', 'utf8').match(/DATABASE_URL=(.*)/)[1].trim();
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

async function main() {
  await c.connect();

  const sub = await c.query(
    `SELECT cs.id, cs.status, cs.is_trial, cs.expires_at, cs.grace_period_ends_at, cs.creator_id,
            c.monetization_model, c.subscription_status, c.subscription_expires_at
     FROM creator_subscriptions cs
     JOIN creators c ON c.id = cs.creator_id
     WHERE cs.id = 'b46a8365-622c-49ea-a061-4b981e6d4e17'`
  );
  console.log('SUBSCRIPTION:', JSON.stringify(sub.rows[0], null, 2));

  const plan = await c.query(
    `SELECT id, name, price_gnf, trial_period_days, features, is_active, is_public
     FROM subscription_plans WHERE id = '256f790c-bee2-49c4-b488-1bd5e2639652'`
  );
  console.log('PLAN:', JSON.stringify(plan.rows[0], null, 2));

  // Replay du PUT plans dans une transaction ROLLBACK pour capturer l'erreur exacte
  try {
    await c.query('BEGIN');
    const payload = plan.rows[0];
    const features = Array.isArray(payload.features) ? payload.features : JSON.parse(payload.features);
    const r = await c.query(
      `UPDATE subscription_plans
       SET name = $1, price_gnf = $2, trial_period_days = $3, features = $4, is_active = $5, is_public = $6, updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [payload.name, payload.price_gnf, payload.trial_period_days, features, payload.is_active, payload.is_public, payload.id]
    );
    console.log('REPLAY PUT OK:', JSON.stringify(r.rows[0]?.name));
  } catch (e) {
    console.log('REPLAY PUT ERROR:', e.message);
  } finally {
    await c.query('ROLLBACK');
  }

  await c.end();
}

main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
