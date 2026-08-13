const { Client } = require('pg');
const fs = require('fs');
const url = fs.readFileSync('../../.env', 'utf8').match(/DATABASE_URL=(.*)/)[1].trim();
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

const SUB_ID = 'b46a8365-622c-49ea-a061-4b981e6d4e17';

async function main() {
  await c.connect();
  await c.query('BEGIN');
  try {
    // 1. SELECT comme le handler
    const subResult = await c.query(
      `SELECT cs.*, c.user_id FROM creator_subscriptions cs
       JOIN creators c ON c.id = cs.creator_id
       WHERE cs.id = $1`,
      [SUB_ID]
    );
    const sub = subResult.rows[0];
    console.log('sub.status =', sub.status);

    if (!['active', 'grace_period'].includes(sub.status)) {
      console.log('-> 400: cet abonnement ne peut pas etre suspendu (le check bloque)');
    } else {
      // 2. UPDATE comme le handler
      await c.query(`UPDATE creator_subscriptions SET status = 'suspended' WHERE id = $1`, [SUB_ID]);
      await c.query(
        `UPDATE creators SET subscription_status = 'suspended' WHERE id = $1 AND subscription_id = $2`,
        [sub.creator_id, SUB_ID]
      );
      await c.query(
        `INSERT INTO creator_monetization_history (creator_id, previous_mode, new_mode, subscription_id, reason, changed_by)
         VALUES ($1, 'subscription', 'suspended', $2, 'admin_suspend', NULL)`,
        [sub.creator_id, SUB_ID]
      );
      await c.query(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES ($1, 'subscription', 'Abonnement suspendu', 'test')`,
        [sub.user_id]
      );
      console.log('-> Toutes les requetes du handler passent (le 400 ne vient pas d ici)');
    }
  } catch (e) {
    console.log('ERREUR dans le handler:', e.message);
  } finally {
    await c.query('ROLLBACK');
  }
  await c.end();
}

main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });