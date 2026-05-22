import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';

const CINETPAY_PAYMENT_URL = 'https://api-checkout.cinetpay.com/v2/payment';
const CINETPAY_CHECK_URL = 'https://api-checkout.cinetpay.com/v2/payment/check';

const initiatePaymentSchema = z.object({
  courseId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.enum(['GNF', 'XOF', 'USD']).default('GNF'),
  paymentMethod: z.enum(['orange_money', 'mtn_momo', 'card']),
});

type AuthUser = {
  id: string;
};

type PaymentRow = {
  id: string;
  user_id: string;
  course_id: string;
  amount: number | string;
  currency: string;
  provider_ref: string;
  status: string;
  metadata?: Record<string, any> | null;
};

type CinetPayApiResponse = {
  code?: string;
  message?: string;
  description?: string;
  data?: Record<string, any>;
};

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for CinetPay payments`);
  }
  return value;
}

function getWebAppUrl() {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function getPublicApiUrl() {
  return (process.env.API_PUBLIC_URL || process.env.APP_URL || 'http://localhost:3001').replace(/\/$/, '');
}

function createTransactionId() {
  return `SAV${Date.now()}${crypto.randomBytes(6).toString('hex')}`.toUpperCase();
}

function sanitizeDescription(value: string) {
  return value.replace(/[#,/$&_]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
}

function normalizePaymentMethod(method?: string): 'orange_money' | 'mtn_momo' | 'card' {
  if (method === 'orange_money' || method === 'mtn_momo' || method === 'card') return method;
  const normalized = (method || '').toLowerCase();
  if (normalized.includes('orange')) return 'orange_money';
  if (normalized.includes('mtn') || normalized.includes('momo')) return 'mtn_momo';
  return 'card';
}

function mergeMetadata(payment: PaymentRow, patch: Record<string, unknown>): Record<string, any> {
  return {
    ...(payment.metadata || {}),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}

function toBodyRecord(body: unknown): Record<string, string> {
  if (!body || typeof body !== 'object') return {};
  return Object.fromEntries(
    Object.entries(body as Record<string, unknown>).map(([key, value]) => [key, value === undefined || value === null ? '' : String(value)])
  );
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyCinetPayToken(body: Record<string, string>, token?: string | string[]) {
  const secret = process.env.CINETPAY_SECRET_KEY?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }

  const receivedToken = Array.isArray(token) ? token[0] : token;
  if (!receivedToken) return false;

  const fields = [
    'cpm_site_id',
    'cpm_trans_id',
    'cpm_trans_date',
    'cpm_amount',
    'cpm_currency',
    'signature',
    'payment_method',
    'cel_phone_num',
    'cpm_phone_prefixe',
    'cpm_language',
    'cpm_version',
    'cpm_payment_config',
    'cpm_page_action',
    'cpm_custom',
    'cpm_designation',
    'cpm_error_message',
  ];

  const payload = fields.map((field) => body[field] || '').join('');
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return safeEqual(expected, receivedToken);
}

async function checkCinetPayTransaction(transactionId: string): Promise<CinetPayApiResponse> {
  const response = await fetch(CINETPAY_CHECK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'savoir-app/1.0',
    },
    body: JSON.stringify({
      apikey: getRequiredEnv('CINETPAY_API_KEY'),
      site_id: getRequiredEnv('CINETPAY_SITE_ID'),
      transaction_id: transactionId,
    }),
  });

  const payload = await response.json().catch(() => ({})) as CinetPayApiResponse;
  if (!response.ok) {
    throw new Error(payload?.description || payload?.message || 'Verification CinetPay impossible');
  }

  return payload;
}

async function finalizeCinetPayPayment(
  fastify: FastifyInstance,
  transactionId: string,
  source: 'notify' | 'verify',
  notificationBody: Record<string, string> = {}
) {
  const paymentResult = await fastify.pg.query<PaymentRow>(
    `SELECT id, user_id, course_id, amount, currency, provider_ref, status, metadata
     FROM payments
     WHERE provider_ref = $1 AND provider = 'cinetpay'`,
    [transactionId]
  );

  if (paymentResult.rows.length === 0) {
    return { found: false, status: 'UNKNOWN' };
  }

  const payment = paymentResult.rows[0];
  if (payment.status === 'completed') {
    return { found: true, status: 'ACCEPTED' };
  }

  const checkResult = await checkCinetPayTransaction(transactionId);
  const data = checkResult.data || {};
  const providerStatus = String(data.status || '').toUpperCase();
  const amountMatches = Number(data.amount) === Number(payment.amount);
  const currencyMatches = String(data.currency || payment.currency).toUpperCase() === payment.currency;
  const metadata = mergeMetadata(payment, {
    cinetpay: {
      source,
      check: checkResult,
      notification: notificationBody,
    },
  });

  await fastify.pg.query('BEGIN');
  try {
    if (checkResult.code === '00' && providerStatus === 'ACCEPTED' && amountMatches && currencyMatches) {
      const paymentMethod = normalizePaymentMethod(data.payment_method || notificationBody.payment_method || payment.metadata?.paymentMethod as string);
      const enrollmentResult = await fastify.pg.query(
        `INSERT INTO enrollments (user_id, course_id, status, amount_paid, currency, payment_method, payment_provider, payment_ref, payment_data)
         VALUES ($1, $2, 'paid', $3, $4, $5::payment_methods, 'cinetpay', $6, $7)
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
          payment.user_id,
          payment.course_id,
          Number(payment.amount),
          payment.currency,
          paymentMethod,
          transactionId,
          JSON.stringify(metadata.cinetpay),
        ]
      );

      await fastify.pg.query(
        `UPDATE payments
         SET status = 'completed', completed_at = NOW(), enrollment_id = $1, metadata = $2
         WHERE id = $3`,
        [enrollmentResult.rows[0].id, JSON.stringify(metadata), payment.id]
      );

      await fastify.pg.query(
        `UPDATE courses SET total_students = (
          SELECT COUNT(*) FROM enrollments WHERE course_id = $1 AND status = 'paid'
        ) WHERE id = $1`,
        [payment.course_id]
      );

      await fastify.pg.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, 'payment', 'Paiement confirme', 'Votre inscription a ete validee', $2)`,
        [payment.user_id, JSON.stringify({ courseId: payment.course_id, provider: 'cinetpay', reference: transactionId })]
      );

      await fastify.pg.query('COMMIT');
      return { found: true, status: 'ACCEPTED' };
    }

    const nextStatus = providerStatus === 'REFUSED' || providerStatus === 'CANCELLED' ? 'failed' : 'pending';
    await fastify.pg.query(
      `UPDATE payments SET status = $1, metadata = $2 WHERE id = $3`,
      [nextStatus, JSON.stringify(metadata), payment.id]
    );
    await fastify.pg.query('COMMIT');
    return { found: true, status: providerStatus || nextStatus.toUpperCase() };
  } catch (error) {
    await fastify.pg.query('ROLLBACK');
    throw error;
  }
}

export async function paymentRoutes(fastify: FastifyInstance) {
  fastify.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (_request, body, done) => {
    done(null, Object.fromEntries(new URLSearchParams(body as string)));
  });

  fastify.post('/initiate', {
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
      const data = initiatePaymentSchema.parse(request.body);
      const currency = data.currency || 'GNF';

      if (currency !== 'GNF') {
        return reply.status(400).send({ error: 'La devise supportee pour la Guinee est GNF' });
      }

      const courseResult = await fastify.pg.query(
        `SELECT c.id, c.title, c.price_cfa, c.status, c.is_public, u.email, u.phone, u.name
         FROM courses c
         CROSS JOIN users u
         WHERE c.id = $1 AND u.id = $2`,
        [data.courseId, userId]
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

      const existingEnrollment = await fastify.pg.query(
        `SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2 AND status = 'paid'`,
        [userId, data.courseId]
      );

      if (existingEnrollment.rows.length > 0) {
        return reply.status(400).send({ error: 'Vous etes deja inscrit a ce cours' });
      }

      const reference = createTransactionId();
      const appUrl = getWebAppUrl();
      const apiUrl = getPublicApiUrl();
      const metadata = {
        paymentMethod: data.paymentMethod,
        provider: 'cinetpay',
        courseId: data.courseId,
        userId,
      };

      const paymentResult = await fastify.pg.query(
        `INSERT INTO payments (user_id, course_id, amount, currency, provider, provider_ref, status, metadata)
         VALUES ($1, $2, $3, $4, 'cinetpay', $5, 'pending', $6)
         RETURNING id`,
        [
          userId,
          data.courseId,
          Number(course.price_cfa),
          currency,
          reference,
          JSON.stringify(metadata),
        ]
      );

      const payload = {
        apikey: getRequiredEnv('CINETPAY_API_KEY'),
        site_id: getRequiredEnv('CINETPAY_SITE_ID'),
        transaction_id: reference,
        amount: Number(course.price_cfa),
        currency,
        description: sanitizeDescription(`Paiement du cours ${course.title}`),
        notify_url: `${apiUrl}/api/payments/cinetpay/notify`,
        return_url: `${appUrl}/learn/payment/return?transaction_id=${reference}`,
        channels: process.env.CINETPAY_CHANNELS || 'MOBILE_MONEY',
        lang: 'fr',
        metadata: JSON.stringify(metadata),
        customer_id: userId,
        customer_name: course.name || 'Apprenant',
        customer_surname: ' ',
        customer_email: course.email || `${userId}@savoir.local`,
        customer_phone_number: course.phone || '',
      };

      const response = await fetch(CINETPAY_PAYMENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'savoir-app/1.0',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({})) as CinetPayApiResponse;
      if (!response.ok || result.code !== '201' || !result.data?.payment_url) {
        await fastify.pg.query(
          `UPDATE payments SET status = 'failed', metadata = metadata || $1::jsonb WHERE id = $2`,
          [JSON.stringify({ cinetpayInitError: result }), paymentResult.rows[0].id]
        );
        return reply.status(400).send({
          error: result.description || result.message || 'Initialisation CinetPay impossible',
          details: result,
        });
      }

      await fastify.pg.query(
        `UPDATE payments SET metadata = metadata || $1::jsonb WHERE id = $2`,
        [JSON.stringify({ cinetpayPaymentToken: result.data.payment_token }), paymentResult.rows[0].id]
      );

      return reply.send({
        paymentId: paymentResult.rows[0].id,
        reference,
        amount: Number(course.price_cfa),
        currency,
        paymentMethod: data.paymentMethod,
        provider: 'cinetpay',
        paymentUrl: result.data.payment_url,
        message: 'Paiement initialise. Redirection vers CinetPay.',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Donnees invalides', details: error.errors });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
  });

  fastify.post('/cinetpay/notify', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = toBodyRecord(request.body);
      const token = request.headers['x-token'] as string | string[] | undefined;

      if (!verifyCinetPayToken(body, token)) {
        return reply.status(403).send('INVALID_TOKEN');
      }

      const transactionId = body.cpm_trans_id || body.transaction_id;
      if (!transactionId) {
        return reply.status(400).send('MISSING_TRANSACTION');
      }

      await finalizeCinetPayPayment(fastify, transactionId, 'notify', body);
      return reply.status(200).send('OK');
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send('ERROR');
    }
  });

  fastify.get('/verify/:reference', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorise' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { reference } = request.params as { reference: string };
    const userId = (request.user as AuthUser).id;

    const paymentResult = await fastify.pg.query(
      `SELECT p.*, e.id as enrollment_id, e.status as enrollment_status
       FROM payments p
       LEFT JOIN enrollments e ON e.payment_ref = p.provider_ref
       WHERE p.provider_ref = $1 AND p.user_id = $2`,
      [reference, userId]
    );

    if (paymentResult.rows.length === 0) {
      return reply.status(404).send({ error: 'Paiement non trouve' });
    }

    const payment = paymentResult.rows[0];
    if (payment.provider === 'cinetpay' && payment.status === 'pending') {
      await finalizeCinetPayPayment(fastify, reference, 'verify');
    }

    const refreshedResult = await fastify.pg.query(
      `SELECT p.*, e.id as enrollment_id, e.status as enrollment_status
       FROM payments p
       LEFT JOIN enrollments e ON e.payment_ref = p.provider_ref
       WHERE p.provider_ref = $1 AND p.user_id = $2`,
      [reference, userId]
    );

    return reply.send({ payment: refreshedResult.rows[0] });
  });

  fastify.get('/history', {
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
      `SELECT p.*, c.title as course_title, c.thumbnail_url as course_thumbnail
       FROM payments p
       JOIN courses c ON c.id = p.course_id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId]
    );

    return reply.send({ payments: result.rows });
  });
}
