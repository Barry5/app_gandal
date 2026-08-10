import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

type AuthUser = {
  id: string;
  role: 'admin' | 'creator' | 'learner';
};

const submitPaymentSchema = z.object({
  courseId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.enum(['GNF', 'XOF', 'USD']).default('GNF'),
  paymentMethod: z.enum(['orange_money', 'mtn_momo', 'card', 'bank_transfer']),
  phoneNumber: z.string().trim().max(20).optional(),
  operatorReference: z.string().trim().max(255).optional(),
  paymentDate: z.string().trim().max(20).optional(),
  proofUrl: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
});

const rejectionSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<AuthUser | null> {
  try {
    await request.jwtVerify();
    return request.user as AuthUser;
  } catch {
    reply.status(401).send({ error: 'Non autorise' });
    return null;
  }
}

async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<AuthUser | null> {
  const tokenUser = await requireAuth(request, reply);
  if (!tokenUser) return null;

  const result = await request.server.pg.query(
    'SELECT id FROM users WHERE id = $1 AND role = $2 AND is_active = true',
    [tokenUser.id, 'admin']
  );

  if (result.rows.length === 0) {
    reply.status(403).send({ error: 'Acces reserve a l administration' });
    return null;
  }

  return tokenUser;
}

async function getCommissionRate(fastify: FastifyInstance, creatorId: string): Promise<number> {
  const result = await fastify.pg.query(
    `SELECT COALESCE(cr.rate, c.commission_rate) AS rate
     FROM creators c
     LEFT JOIN commission_rates cr ON cr.plan = c.plan
     WHERE c.id = $1`,
    [creatorId]
  );
  return Number(result.rows[0]?.rate || 10);
}

function mapSubmission(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    user: row.user_id
      ? {
          id: row.user_id,
          name: row.student_name || null,
          email: row.student_email || null,
          phone: row.student_phone || null,
        }
      : null,
    courseId: row.course_id,
    course: row.course_id
      ? {
          id: row.course_id,
          title: row.course_title || null,
          thumbnailUrl: row.course_thumbnail || null,
          priceCfa: Number(row.course_price || 0),
        }
      : null,
    trainerId: row.trainer_id,
    trainerName: row.trainer_name || null,
    amount: Number(row.amount || 0),
    currency: row.currency,
    paymentMethod: row.payment_method,
    phoneNumber: row.phone_number,
    operatorReference: row.operator_reference,
    paymentDate: row.payment_date,
    proofUrl: row.proof_url,
    notes: row.notes,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    rejectionReason: row.rejection_reason,
    activatedAt: row.activated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function financeRoutes(fastify: FastifyInstance) {
  fastify.post('/submissions', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorise' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as AuthUser).id;
      const data = submitPaymentSchema.parse(request.body);

      const courseResult = await fastify.pg.query(
        `SELECT c.id, c.title, c.price_cfa, c.currency, c.status, c.is_public, cr.user_id AS trainer_id
         FROM courses c
         JOIN creators cr ON cr.id = c.creator_id
         WHERE c.id = $1`,
        [data.courseId]
      );

      if (courseResult.rows.length === 0) {
        return reply.status(404).send({ error: 'Cours non trouve' });
      }

      const course = courseResult.rows[0];
      if (course.status !== 'published' || course.is_public !== true) {
        return reply.status(400).send({ error: 'Ce cours n est pas disponible' });
      }

      if (Number(course.price_cfa || 0) <= 0) {
        return reply.status(400).send({ error: 'Ce cours est gratuit. Aucun paiement requis.' });
      }

      if (Number(data.amount) !== Number(course.price_cfa)) {
        return reply.status(400).send({ error: 'Montant invalide pour ce cours' });
      }

      const existingPaid = await fastify.pg.query(
        `SELECT 1 FROM enrollments WHERE user_id = $1 AND course_id = $2 AND status = 'paid'`,
        [userId, data.courseId]
      );
      if (existingPaid.rows.length > 0) {
        return reply.status(400).send({ error: 'Vous etes deja inscrit a ce cours' });
      }

      const existingSubmission = await fastify.pg.query(
        `SELECT id FROM payment_submissions
         WHERE user_id = $1 AND course_id = $2 AND status IN ('PENDING_PAYMENT', 'PAYMENT_SUBMITTED', 'PAYMENT_VERIFIED')`,
        [userId, data.courseId]
      );
      if (existingSubmission.rows.length > 0) {
        return reply.status(400).send({ error: 'Une declaration de paiement est deja en cours pour ce cours' });
      }

      const submissionResult = await fastify.pg.query(
        `INSERT INTO payment_submissions (user_id, course_id, amount, currency, payment_method, phone_number, operator_reference, payment_date, proof_url, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PAYMENT_SUBMITTED')
         RETURNING id`,
        [
          userId,
          data.courseId,
          Number(data.amount),
          data.currency,
          data.paymentMethod,
          data.phoneNumber || null,
          data.operatorReference || null,
          data.paymentDate || null,
          data.proofUrl || null,
          data.notes || null,
        ]
      );

      await fastify.pg.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, 'payment', 'Declaration de paiement recue', 'Paiement en attente de verification par l administration', $2),
                ($3, 'payment', 'Nouvelle declaration de paiement', 'Un apprenant a declare un paiement pour votre cours', $4)`,
        [
          userId,
          JSON.stringify({ courseId: data.courseId, submissionId: submissionResult.rows[0].id }),
          course.trainer_id,
          JSON.stringify({ courseId: data.courseId, submissionId: submissionResult.rows[0].id }),
        ]
      );

      return reply.status(201).send({
        submissionId: submissionResult.rows[0].id,
        status: 'PAYMENT_SUBMITTED',
        message: 'Declaration enregistree. En attente de verification par l administration.',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Donnees invalides', details: error.errors });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
  });

  fastify.get('/submissions/mine', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorise' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as AuthUser).id;

    const result = await fastify.pg.query(
      `SELECT ps.*, c.title AS course_title, c.thumbnail_url AS course_thumbnail, c.price_cfa AS course_price
       FROM payment_submissions ps
       JOIN courses c ON c.id = ps.course_id
       WHERE ps.user_id = $1
       ORDER BY ps.created_at DESC`,
      [userId]
    );

    return reply.send({ submissions: result.rows.map(mapSubmission) });
  });

  fastify.get('/admin/submissions', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = 1, limit = 20, status = 'ALL', search = '' } = request.query as any;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (safePage - 1) * safeLimit;
    const params: any[] = [];
    const conditions: string[] = [];

    if (status && status !== 'ALL') {
      params.push(status);
      conditions.push('ps.status = $' + params.length);
    }

    if (typeof search === 'string' && search.trim()) {
      params.push('%' + search.trim() + '%');
      conditions.push(
        '(c.title ILIKE $' + params.length +
        ' OR COALESCE(s.name, u.name) ILIKE $' + params.length +
        ' OR COALESCE(s.email, u.email) ILIKE $' + params.length +
        ' OR ps.operator_reference ILIKE $' + params.length + ')'
      );
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const countResult = await fastify.pg.query(
      `SELECT COUNT(*)::int AS total
       FROM payment_submissions ps
       JOIN courses c ON c.id = ps.course_id
       JOIN users u ON u.id = ps.user_id
       LEFT JOIN users s ON s.id = ps.user_id
       ${whereClause}`,
      params
    );

    const result = await fastify.pg.query(
      `SELECT ps.*, c.title AS course_title, c.thumbnail_url AS course_thumbnail, c.price_cfa AS course_price,
              u.name AS student_name, u.email AS student_email, u.phone AS student_phone,
              tu.name AS trainer_name
       FROM payment_submissions ps
       JOIN courses c ON c.id = ps.course_id
       JOIN users u ON u.id = ps.user_id
       JOIN creators cr ON cr.id = c.creator_id
       JOIN users tu ON tu.id = cr.user_id
       ${whereClause}
       ORDER BY ps.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, safeLimit, offset]
    );

    return reply.send({
      submissions: result.rows.map(mapSubmission),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: countResult.rows[0].total,
        totalPages: Math.ceil(countResult.rows[0].total / safeLimit),
      },
    });
  });

  fastify.get('/admin/submissions/:id', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const result = await fastify.pg.query(
      `SELECT ps.*, c.title AS course_title, c.thumbnail_url AS course_thumbnail, c.price_cfa AS course_price,
              u.name AS student_name, u.email AS student_email, u.phone AS student_phone,
              tu.name AS trainer_name
       FROM payment_submissions ps
       JOIN courses c ON c.id = ps.course_id
       JOIN users u ON u.id = ps.user_id
       JOIN creators cr ON cr.id = c.creator_id
       JOIN users tu ON tu.id = cr.user_id
       WHERE ps.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Declaration non trouvee' });
    }

    return reply.send({ submission: mapSubmission(result.rows[0]) });
  });

  fastify.post('/admin/submissions/:id/verify', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const admin = request.user as AuthUser;

    const submissionResult = await fastify.pg.query(
      `SELECT id, user_id, course_id, status FROM payment_submissions WHERE id = $1`,
      [id]
    );
    if (submissionResult.rows.length === 0) {
      return reply.status(404).send({ error: 'Declaration non trouvee' });
    }

    const submission = submissionResult.rows[0];
    if (submission.status !== 'PAYMENT_SUBMITTED') {
      return reply.status(400).send({ error: 'Seules les declarations soumises peuvent etre verifiees' });
    }

    await fastify.pg.query(
      `UPDATE payment_submissions
       SET status = 'PAYMENT_VERIFIED', reviewed_by = $1, reviewed_at = NOW()
       WHERE id = $2`,
      [admin.id, id]
    );

    await fastify.pg.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, 'payment', 'Paiement verifie', 'Votre paiement a ete verifie. L activation du cours est en cours.', $2)`,
      [submission.user_id, JSON.stringify({ courseId: submission.course_id, submissionId: id })]
    );

    return reply.send({ status: 'PAYMENT_VERIFIED', message: 'Paiement verifie. Vous pouvez maintenant activer le cours.' });
  });

  fastify.post('/admin/submissions/:id/reject', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const admin = request.user as AuthUser;

    let data: z.infer<typeof rejectionSchema>;
    try {
      data = rejectionSchema.parse(request.body);
    } catch (error) {
      return reply.status(400).send({ error: 'La raison du rejet est requise' });
    }

    const submissionResult = await fastify.pg.query(
      `SELECT id, user_id, course_id, status FROM payment_submissions WHERE id = $1`,
      [id]
    );
    if (submissionResult.rows.length === 0) {
      return reply.status(404).send({ error: 'Declaration non trouvee' });
    }

    const submission = submissionResult.rows[0];
    if (submission.status === 'ACTIVATED' || submission.status === 'PAYMENT_REJECTED') {
      return reply.status(400).send({ error: 'Cette declaration ne peut plus etre rejetee' });
    }

    await fastify.pg.query(
      `UPDATE payment_submissions
       SET status = 'PAYMENT_REJECTED', reviewed_by = $1, reviewed_at = NOW(), rejection_reason = $2
       WHERE id = $3`,
      [admin.id, data.reason, id]
    );

    await fastify.pg.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, 'payment', 'Paiement rejete', $2, $3)`,
      [submission.user_id, 'Votre declaration de paiement a ete rejetee : ' + data.reason, JSON.stringify({ courseId: submission.course_id, submissionId: id })]
    );

    return reply.send({ status: 'PAYMENT_REJECTED', message: 'Declaration rejetee.' });
  });

  fastify.post('/admin/submissions/:id/activate', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const admin = request.user as AuthUser;

    const submissionResult = await fastify.pg.query(
      `SELECT ps.*, c.title, c.price_cfa, c.currency, c.creator_id, cr.user_id AS trainer_id
       FROM payment_submissions ps
       JOIN courses c ON c.id = ps.course_id
       JOIN creators cr ON cr.id = c.creator_id
       WHERE ps.id = $1`,
      [id]
    );
    if (submissionResult.rows.length === 0) {
      return reply.status(404).send({ error: 'Declaration non trouvee' });
    }

    const submission = submissionResult.rows[0];
    if (submission.status !== 'PAYMENT_VERIFIED') {
      return reply.status(400).send({ error: 'Le paiement doit etre verifie avant activation' });
    }

    const existingPaid = await fastify.pg.query(
      `SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2 AND status = 'paid'`,
      [submission.user_id, submission.course_id]
    );
    if (existingPaid.rows.length > 0) {
      return reply.status(400).send({ error: 'Cet apprenant est deja inscrit a ce cours' });
    }

    const grossAmount = Number(submission.amount);
    const commissionRate = await getCommissionRate(fastify, submission.creator_id);
    const platformCommission = Math.round((grossAmount * commissionRate) / 100);
    const trainerAmount = grossAmount - platformCommission;
    const reference = 'OFFLINE-' + submission.id.slice(0, 8).toUpperCase();

    await fastify.pg.query('BEGIN');
    try {
      const activationResult = await fastify.pg.query(
        `INSERT INTO course_activations
           (course_id, student_id, trainer_id, course_snapshot, price_at_activation, currency,
            payment_method, payment_reference, gross_amount, platform_commission, trainer_amount,
            commission_rate, payment_submission_id, status, activated_by, events)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'ACTIVATED', $14, $15)
         RETURNING id`,
        [
          submission.course_id,
          submission.user_id,
          submission.trainer_id,
          JSON.stringify({ title: submission.title, priceCfa: submission.price_cfa, currency: submission.currency }),
          submission.price_cfa,
          submission.currency,
          submission.payment_method,
          reference,
          grossAmount,
          platformCommission,
          trainerAmount,
          commissionRate,
          submission.id,
          admin.id,
          JSON.stringify([
            {
              type: 'PAYMENT_VERIFIED',
              at: new Date().toISOString(),
              by: admin.id,
            },
            {
              type: 'ACTIVATED',
              at: new Date().toISOString(),
              by: admin.id,
            },
          ]),
        ]
      );

      const activationId = activationResult.rows[0].id;

      await fastify.pg.query(
        `INSERT INTO financial_transactions
           (activation_id, course_id, trainer_id, student_id, gross_amount, platform_commission,
            trainer_amount, currency, payment_method, payment_reference, commission_rate, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'DUE')`,
        [
          activationId,
          submission.course_id,
          submission.trainer_id,
          submission.user_id,
          grossAmount,
          platformCommission,
          trainerAmount,
          submission.currency,
          submission.payment_method,
          reference,
          commissionRate,
        ]
      );

      const enrollmentResult = await fastify.pg.query(
        `INSERT INTO enrollments (user_id, course_id, status, amount_paid, currency, payment_method, payment_provider, payment_ref, payment_data)
         VALUES ($1, $2, 'paid', $3, $4,
                 CASE WHEN $5::text IN ('orange_money', 'mtn_momo', 'card') THEN $5::payment_methods ELSE NULL END,
                 'offline_code', $6, $7)
         ON CONFLICT (user_id, course_id)
         DO UPDATE SET status = 'paid',
                       amount_paid = EXCLUDED.amount_paid,
                       currency = EXCLUDED.currency,
                       payment_method = EXCLUDED.payment_method,
                       payment_provider = EXCLUDED.payment_provider,
                       payment_ref = EXCLUDED.payment_ref,
                       payment_data = EXCLUDED.payment_data
         RETURNING id`,
        [
          submission.user_id,
          submission.course_id,
          grossAmount,
          submission.currency,
          submission.payment_method,
          reference,
          JSON.stringify({ submissionId: submission.id, activatedBy: admin.id }),
        ]
      );

      await fastify.pg.query(
        `INSERT INTO payments (user_id, course_id, enrollment_id, amount, currency, provider, provider_ref, status, metadata, completed_at)
         VALUES ($1, $2, $3, $4, $5, 'offline_code', $6, 'completed', $7, NOW())`,
        [
          submission.user_id,
          submission.course_id,
          enrollmentResult.rows[0].id,
          grossAmount,
          submission.currency,
          reference,
          JSON.stringify({ submissionId: submission.id, activationId, platformCommission, trainerAmount }),
        ]
      );

      await fastify.pg.query(
        `UPDATE courses SET total_students = (
          SELECT COUNT(*) FROM enrollments WHERE course_id = $1 AND status = 'paid'
        ) WHERE id = $1`,
        [submission.course_id]
      );

      await fastify.pg.query(
        `UPDATE payment_submissions
         SET status = 'ACTIVATED', reviewed_by = $1, reviewed_at = NOW(), activated_at = NOW()
         WHERE id = $2`,
        [admin.id, submission.id]
      );

      await fastify.pg.query(
        `INSERT INTO admin_activity_logs (actor_user_id, target_user_id, action, reason, metadata)
         VALUES ($1, $2, 'activate_submission', $3, $4)`,
        [
          admin.id,
          submission.user_id,
          'Activation du cours apres verification du paiement',
          JSON.stringify({ submissionId: submission.id, courseId: submission.course_id, activationId, reference }),
        ]
      );

      await fastify.pg.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, 'payment', 'Cours active', 'Votre inscription au cours est confirmee. Bon apprentissage !', $2),
                ($3, 'payment', 'Nouvelle vente', 'Votre cours a ete active pour un nouvel apprenant.', $4)`,
        [
          submission.user_id,
          JSON.stringify({ courseId: submission.course_id, activationId }),
          submission.trainer_id,
          JSON.stringify({ courseId: submission.course_id, activationId, amount: trainerAmount }),
        ]
      );

      await fastify.pg.query('COMMIT');
      return reply.send({
        status: 'ACTIVATED',
        activationId,
        reference,
        grossAmount,
        platformCommission,
        trainerAmount,
        message: 'Cours active. Les commissions ont ete figees sur le ledger.',
      });
    } catch (error) {
      await fastify.pg.query('ROLLBACK');
      throw error;
    }
  });

  fastify.get('/admin/activations', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = 1, limit = 20, search = '' } = request.query as any;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (safePage - 1) * safeLimit;
    const params: any[] = [];
    const conditions: string[] = [];

    if (typeof search === 'string' && search.trim()) {
      params.push('%' + search.trim() + '%');
      conditions.push(
        '(c.title ILIKE $' + params.length +
        ' OR s.name ILIKE $' + params.length +
        ' OR s.email ILIKE $' + params.length +
        ' OR t.name ILIKE $' + params.length + ')'
      );
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const countResult = await fastify.pg.query(
      `SELECT COUNT(*)::int AS total
       FROM course_activations ca
       JOIN courses c ON c.id = ca.course_id
       JOIN users s ON s.id = ca.student_id
       JOIN users t ON t.id = ca.trainer_id
       ${whereClause}`,
      params
    );

    const result = await fastify.pg.query(
      `SELECT ca.*, c.title AS course_title, c.thumbnail_url AS course_thumbnail,
              s.name AS student_name, s.email AS student_email,
              t.name AS trainer_name, a.name AS activated_by_name
       FROM course_activations ca
       JOIN courses c ON c.id = ca.course_id
       JOIN users s ON s.id = ca.student_id
       JOIN users t ON t.id = ca.trainer_id
       LEFT JOIN users a ON a.id = ca.activated_by
       ${whereClause}
       ORDER BY ca.activated_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, safeLimit, offset]
    );

    return reply.send({
      activations: result.rows,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: countResult.rows[0].total,
        totalPages: Math.ceil(countResult.rows[0].total / safeLimit),
      },
    });
  });

  fastify.get('/admin/transactions', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = 1, limit = 20, status = 'ALL' } = request.query as any;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (safePage - 1) * safeLimit;
    const params: any[] = [];
    const conditions: string[] = [];

    if (status && status !== 'ALL') {
      params.push(status);
      conditions.push('ft.status = $' + params.length);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const countResult = await fastify.pg.query(
      `SELECT COUNT(*)::int AS total FROM financial_transactions ft ${whereClause}`,
      params
    );

    const result = await fastify.pg.query(
      `SELECT ft.*, c.title AS course_title,
              s.name AS student_name,
              t.name AS trainer_name, t.phone AS trainer_phone, t.email AS trainer_email,
              f.business_name
       FROM financial_transactions ft
       JOIN courses c ON c.id = ft.course_id
       JOIN users s ON s.id = ft.student_id
       JOIN users t ON t.id = ft.trainer_id
       LEFT JOIN creators f ON f.user_id = ft.trainer_id
       ${whereClause}
       ORDER BY ft.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, safeLimit, offset]
    );

    const summaryResult = await fastify.pg.query(
      `SELECT
         COALESCE(SUM(gross_amount), 0)::int AS total_gross,
         COALESCE(SUM(platform_commission), 0)::int AS total_commission,
         COALESCE(SUM(trainer_amount), 0)::int AS total_trainer,
         COALESCE(SUM(trainer_amount) FILTER (WHERE status IN ('DUE', 'VALIDATED')), 0)::int AS total_due_to_trainers,
         COALESCE(SUM(trainer_amount) FILTER (WHERE status = 'PAID'), 0)::int AS total_paid_to_trainers
       FROM financial_transactions`
    );

    return reply.send({
      transactions: result.rows,
      summary: summaryResult.rows[0],
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: countResult.rows[0].total,
        totalPages: Math.ceil(countResult.rows[0].total / safeLimit),
      },
    });
  });

  fastify.post('/admin/transactions/:id/validate', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const admin = request.user as AuthUser;

    const result = await fastify.pg.query(
      `SELECT id, status FROM financial_transactions WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Transaction non trouvee' });
    }
    if (result.rows[0].status !== 'DUE') {
      return reply.status(400).send({ error: 'Seules les commissions dues peuvent etre validees' });
    }

    await fastify.pg.query(
      `UPDATE financial_transactions SET status = 'VALIDATED', validated_by = $1, validated_at = NOW() WHERE id = $2`,
      [admin.id, id]
    );

    return reply.send({ status: 'VALIDATED', message: 'Commission validee.' });
  });

  fastify.post('/admin/transactions/:id/pay', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const admin = request.user as AuthUser;

    const result = await fastify.pg.query(
      `SELECT ft.id, ft.status, ft.trainer_id, ft.trainer_amount
       FROM financial_transactions ft
       WHERE ft.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Transaction non trouvee' });
    }
    if (result.rows[0].status === 'PAID') {
      return reply.status(400).send({ error: 'Cette commission est deja payee' });
    }

    await fastify.pg.query('BEGIN');
    try {
      await fastify.pg.query(
        `UPDATE financial_transactions SET status = 'PAID', paid_by = $1, paid_at = NOW(), validated_by = COALESCE(validated_by, $1), validated_at = COALESCE(validated_at, NOW()) WHERE id = $2`,
        [admin.id, id]
      );

      await fastify.pg.query(
        `UPDATE creators SET total_earnings = total_earnings + $1 WHERE user_id = $2`,
        [Number(result.rows[0].trainer_amount), result.rows[0].trainer_id]
      );

      await fastify.pg.query(
        `INSERT INTO admin_activity_logs (actor_user_id, target_user_id, action, reason, metadata)
         VALUES ($1, $2, 'pay_financial_transaction', 'Paiement de commission au formateur', $3)`,
        [
          admin.id,
          result.rows[0].trainer_id,
          JSON.stringify({ transactionId: id, amount: Number(result.rows[0].trainer_amount) }),
        ]
      );

      await fastify.pg.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, 'payment', 'Commission payee', $2, $3)`,
        [
          result.rows[0].trainer_id,
          'Votre commission de ' + Number(result.rows[0].trainer_amount).toLocaleString('fr-FR') + ' GNF a ete payee.',
          JSON.stringify({ transactionId: id }),
        ]
      );

      await fastify.pg.query('COMMIT');
      return reply.send({ status: 'PAID', message: 'Commission marquee comme payee.' });
    } catch (error) {
      await fastify.pg.query('ROLLBACK');
      throw error;
    }
  });

  fastify.get('/admin/dashboard', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const overviewResult = await fastify.pg.query(
      `SELECT
         (SELECT COUNT(*)::int FROM users WHERE role = 'creator') AS total_creators,
         (SELECT COUNT(*)::int FROM users WHERE role = 'creator' AND is_active = true) AS active_creators,
         (SELECT COUNT(*)::int FROM users WHERE role = 'learner') AS total_learners,
         (SELECT COUNT(*)::int FROM courses) AS total_courses,
         (SELECT COUNT(*)::int FROM courses WHERE status = 'published') AS published_courses,
         (SELECT COUNT(*)::int FROM enrollments WHERE status = 'paid') AS total_enrollments,
         (SELECT COUNT(*)::int FROM course_activations) AS total_activations,
         (SELECT COUNT(*)::int FROM payment_submissions WHERE status = 'PAYMENT_SUBMITTED') AS pending_submissions,
         (SELECT COUNT(*)::int FROM payment_submissions WHERE status = 'PAYMENT_VERIFIED') AS verified_submissions`
    );

    const financialResult = await fastify.pg.query(
      `SELECT
         COALESCE(SUM(gross_amount), 0)::int AS gross_revenue,
         COALESCE(SUM(platform_commission), 0)::int AS platform_revenue,
         COALESCE(SUM(trainer_amount), 0)::int AS trainer_revenue,
         COALESCE(SUM(trainer_amount) FILTER (WHERE status IN ('DUE', 'VALIDATED')), 0)::int AS trainer_due,
         COALESCE(SUM(trainer_amount) FILTER (WHERE status = 'PAID'), 0)::int AS trainer_paid
       FROM financial_transactions`
    );

    const byCategoryResult = await fastify.pg.query(
      `SELECT COALESCE(c.category, 'Autre') AS category, COUNT(*)::int AS courses
       FROM courses c
       GROUP BY c.category
       ORDER BY COUNT(*) DESC
       LIMIT 10`
    );

    const activationsByDayResult = await fastify.pg.query(
      `SELECT TO_CHAR(activated_at, 'YYYY-MM-DD') AS day, COUNT(*)::int AS activations
       FROM course_activations
       WHERE activated_at >= NOW() - INTERVAL '30 days'
       GROUP BY day
       ORDER BY day`
    );

    return reply.send({
      overview: overviewResult.rows[0],
      financial: financialResult.rows[0],
      categories: byCategoryResult.rows,
      activationsByDay: activationsByDayResult.rows,
    });
  });

  fastify.get('/creator/summary', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorise' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as AuthUser).id;

    const result = await fastify.pg.query(
      `SELECT
         COUNT(*)::int AS total_transactions,
         COALESCE(SUM(ft.gross_amount), 0)::int AS gross_revenue,
         COALESCE(SUM(ft.platform_commission), 0)::int AS platform_commission,
         COALESCE(SUM(ft.trainer_amount), 0)::int AS net_revenue,
         COALESCE(SUM(ft.trainer_amount) FILTER (WHERE ft.status = 'DUE'), 0)::int AS due_amount,
         COALESCE(SUM(ft.trainer_amount) FILTER (WHERE ft.status = 'VALIDATED'), 0)::int AS validated_amount,
         COALESCE(SUM(ft.trainer_amount) FILTER (WHERE ft.status = 'PAID'), 0)::int AS paid_amount
       FROM financial_transactions ft
       WHERE ft.trainer_id = $1`,
      [userId]
    );

    return reply.send({ summary: result.rows[0] });
  });

  fastify.get('/creator/transactions', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorise' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as AuthUser).id;
    const { status = 'ALL' } = request.query as any;

    const params: any[] = [userId];
    const statusClause = status && status !== 'ALL' ? ' AND ft.status = $2' : '';

    const result = await fastify.pg.query(
      `SELECT ft.*, c.title AS course_title, c.thumbnail_url AS course_thumbnail,
              s.name AS student_name
       FROM financial_transactions ft
       JOIN courses c ON c.id = ft.course_id
       JOIN users s ON s.id = ft.student_id
       WHERE ft.trainer_id = $1${statusClause}
       ORDER BY ft.created_at DESC
       LIMIT 200`,
      params
    );

    return reply.send({ transactions: result.rows });
  });

  fastify.get('/creator/activations', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorise' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as AuthUser).id;

    const result = await fastify.pg.query(
      `SELECT ca.*, c.title AS course_title, c.thumbnail_url AS course_thumbnail,
              s.name AS student_name, s.email AS student_email,
              a.name AS activated_by_name
       FROM course_activations ca
       JOIN courses c ON c.id = ca.course_id
       JOIN users s ON s.id = ca.student_id
       LEFT JOIN users a ON a.id = ca.activated_by
       WHERE ca.trainer_id = $1
       ORDER BY ca.activated_at DESC
       LIMIT 200`,
      [userId]
    );

    return reply.send({ activations: result.rows });
  });
}