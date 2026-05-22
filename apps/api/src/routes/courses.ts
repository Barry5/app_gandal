import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import crypto from 'node:crypto';
import { slugify } from '@savoir/shared';

type AuthUser = {
  id: string;
  role: 'admin' | 'creator' | 'learner';
  creatorId?: string;
};

const emptyToUndefined = (value: unknown) => {
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
};

const optionalText = z.preprocess(emptyToUndefined, z.string().optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());

const createCourseSchema = z.object({
  title: z.string().trim().min(3, 'Le titre doit contenir au moins 3 caracteres'),
  shortDescription: z.preprocess(emptyToUndefined, z.string().max(300).optional()),
  description: optionalText,
  category: optionalText,
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  priceCfa: z.number().min(0).default(0),
  thumbnailUrl: optionalUrl,
});

const addModuleSchema = z.object({
  title: z.string().trim().min(2, 'Le module doit contenir au moins 2 caracteres'),
  description: optionalText,
  orderIndex: z.number().optional(),
});

const updateModuleSchema = addModuleSchema.partial();

const addLessonSchema = z.object({
  moduleId: z.string().uuid(),
  title: z.string().trim().min(2, 'La lecon doit contenir au moins 2 caracteres'),
  type: z.enum(['video', 'text', 'pdf', 'image', 'quiz']),
  description: optionalText,
  content: optionalText,
  contentUrl: optionalUrl,
  mediaPublicId: optionalText,
  thumbnailUrl: optionalUrl,
  durationSec: z.number().optional(),
  orderIndex: z.number().optional(),
  isFree: z.boolean().default(false),
});

const updateLessonSchema = addLessonSchema.omit({ moduleId: true }).partial();

const reorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

const lessonProgressSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'completed']).default('completed'),
  progressPercent: z.number().int().min(0).max(100).default(100),
  watchTimeSec: z.number().int().min(0).optional(),
});

const createAccessCodeSchema = z.object({
  expiresInDays: z.number().int().min(1).max(90).default(7),
  maxUses: z.number().int().min(1).max(1).default(1),
});

const redeemAccessCodeSchema = z.object({
  code: z.string().trim().min(5).max(12),
});

const courseIdParamsSchema = z.object({
  courseId: z.string().uuid('Identifiant du cours invalide'),
});

const moduleIdParamsSchema = z.object({
  moduleId: z.string().uuid('Identifiant du module invalide'),
});

const lessonIdParamsSchema = z.object({
  lessonId: z.string().uuid('Identifiant de la lecon invalide'),
});

const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function normalizeAccessCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function hashAccessCode(code: string) {
  const pepper = process.env.ACCESS_CODE_PEPPER || process.env.JWT_SECRET || 'development-access-code-pepper';
  return crypto.createHash('sha256').update(`${normalizeAccessCode(code)}:${pepper}`).digest('hex');
}

function generateAccessCode(length = 5) {
  let code = '';
  for (let index = 0; index < length; index += 1) {
    code += ACCESS_CODE_ALPHABET[crypto.randomInt(0, ACCESS_CODE_ALPHABET.length)];
  }
  return code;
}

function getClientIp(request: FastifyRequest) {
  const forwarded = request.headers['x-forwarded-for'];
  if (Array.isArray(forwarded)) return forwarded[0]?.split(',')[0]?.trim() || request.ip;
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() || request.ip;
  return request.ip;
}

function serverErrorPayload(error: unknown) {
  return {
    error: 'Server error',
    ...(process.env.NODE_ENV !== 'production' && error instanceof Error
      ? { details: [{ message: error.message }] }
      : {}),
  };
}

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
      reply.status(403).send({ error: 'Access reserved for creators' });
      return null;
    }

    if (user.role === 'creator' && !user.creatorId) {
      reply.status(403).send({ error: 'Creator profile is incomplete' });
      return null;
    }

    return user;
  } catch {
    reply.status(401).send({ error: 'Unauthorized' });
    return null;
  }
}

async function getOptionalUser(request: FastifyRequest): Promise<AuthUser | null> {
  try {
    await request.jwtVerify();
    return request.user as AuthUser;
  } catch {
    return null;
  }
}

async function ownsCourse(fastify: FastifyInstance, user: AuthUser, courseId: string): Promise<boolean> {
  if (user.role !== 'creator') return false;

  const result = await fastify.pg.query(
    'SELECT id FROM courses WHERE id = $1 AND creator_id = $2',
    [courseId, user.creatorId]
  );

  return result.rows.length > 0;
}

async function ownsModule(fastify: FastifyInstance, user: AuthUser, moduleId: string): Promise<boolean> {
  if (user.role !== 'creator') return false;

  const result = await fastify.pg.query(
    [
      'SELECT m.id',
      'FROM modules m',
      'JOIN courses c ON c.id = m.course_id',
      'WHERE m.id = $1 AND c.creator_id = $2',
    ].join('\n'),
    [moduleId, user.creatorId]
  );

  return result.rows.length > 0;
}

async function ownsLesson(fastify: FastifyInstance, user: AuthUser, lessonId: string): Promise<boolean> {
  if (user.role !== 'creator') return false;

  const result = await fastify.pg.query(
    [
      'SELECT l.id',
      'FROM lessons l',
      'JOIN modules m ON m.id = l.module_id',
      'JOIN courses c ON c.id = m.course_id',
      'WHERE l.id = $1 AND c.creator_id = $2',
    ].join('\n'),
    [lessonId, user.creatorId]
  );

  return result.rows.length > 0;
}

async function refreshCourseCounters(fastify: FastifyInstance, courseId: string) {
  await fastify.pg.query(
    `UPDATE modules m SET
       total_lessons = lesson_stats.total_lessons,
       total_duration_sec = lesson_stats.total_duration_sec,
       updated_at = NOW()
     FROM (
       SELECT m2.id,
              COUNT(l.id)::int AS total_lessons,
              COALESCE(SUM(l.duration_sec), 0)::int AS total_duration_sec
       FROM modules m2
       LEFT JOIN lessons l ON l.module_id = m2.id
       WHERE m2.course_id = $1
       GROUP BY m2.id
     ) lesson_stats
     WHERE m.id = lesson_stats.id`,
    [courseId]
  );

  await fastify.pg.query(
    `UPDATE courses SET
       total_lessons = course_stats.total_lessons,
       duration_hours = CEIL(course_stats.total_duration_sec / 3600.0)::int,
       updated_at = NOW()
     FROM (
       SELECT c.id,
              COUNT(l.id)::int AS total_lessons,
              COALESCE(SUM(l.duration_sec), 0)::int AS total_duration_sec
       FROM courses c
       LEFT JOIN modules m ON m.course_id = c.id
       LEFT JOIN lessons l ON l.module_id = m.id
       WHERE c.id = $1
       GROUP BY c.id
     ) course_stats
     WHERE courses.id = course_stats.id`,
    [courseId]
  );
}

function validationErrorPayload(error: z.ZodError) {
  return {
    error: 'Donnees invalides',
    details: error.errors.map((item) => ({
      field: item.path.join('.'),
      message: item.message,
    })),
  };
}

export async function courseRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = 1, limit = 10, status, category, mine } = request.query as any;
    const offset = (Number(page) - 1) * Number(limit);
    let currentUser: AuthUser | null = null;

    if (mine === true || mine === 'true') {
      currentUser = await requireCreatorOrAdmin(request, reply);
      if (!currentUser) return;
    }

    let query = `
      SELECT c.*, u.name as creator_name,
             COUNT(DISTINCT e.id) as enrolled_count
      FROM courses c
      JOIN creators cr ON cr.id = c.creator_id
      JOIN users u ON u.id = cr.user_id
      LEFT JOIN enrollments e ON e.course_id = c.id AND e.status = 'paid'
    `;
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (status) {
      params.push(status);
      conditions.push(`c.status = $${params.length}`);
    }

    if (category) {
      params.push(category);
      conditions.push(`c.category = $${params.length}`);
    }

    if (currentUser?.role === 'creator') {
      params.push(currentUser.creatorId);
      conditions.push(`c.creator_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const filterParams = [...params];

    query += `
      GROUP BY c.id, u.name
      ORDER BY c.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(Number(limit), offset);

    const result = await fastify.pg.query(query, params);

    let countQuery = 'SELECT COUNT(*) FROM courses c';
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(' AND ')}`;
    }
    const countResult = await fastify.pg.query(countQuery, filterParams);
    const total = parseInt(countResult.rows[0].count);

    return reply.send({
      courses: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  });

  fastify.get('/catalog', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await getOptionalUser(request);
    const userId = user?.id || null;

    const result = await fastify.pg.query(
      `SELECT c.id,
              c.title,
              c.slug,
              c.short_description,
              c.description,
              c.thumbnail_url,
              c.price_cfa,
              c.currency,
              c.category,
              c.difficulty,
              c.total_lessons,
              c.duration_hours,
              c.avg_rating,
              c.total_students,
              u.name AS creator_name,
              e.status AS enrollment_status,
              e.progress_percent,
              COUNT(DISTINCT m.id)::int AS module_count,
              COUNT(DISTINCT l.id)::int AS lesson_count,
              COUNT(DISTINCT lp.lesson_id)::int AS completed_lesson_count
       FROM courses c
       JOIN creators cr ON cr.id = c.creator_id
       JOIN users u ON u.id = cr.user_id
       LEFT JOIN modules m ON m.course_id = c.id
       LEFT JOIN lessons l ON l.module_id = m.id
       LEFT JOIN enrollments e ON e.course_id = c.id AND e.user_id = $1
       LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = $1 AND lp.status = 'completed'
       WHERE c.status = 'published' AND c.is_public = true
       GROUP BY c.id, u.name, e.status, e.progress_percent
       ORDER BY c.published_at DESC NULLS LAST, c.created_at DESC`,
      [userId]
    );

    return reply.send({
      courses: result.rows.map((course) => ({
        ...course,
        is_free: Number(course.price_cfa || 0) <= 0,
        is_unlocked: Number(course.price_cfa || 0) <= 0 || course.enrollment_status === 'paid',
      })),
    });
  });

  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const courseResult = await fastify.pg.query(
      `SELECT c.*, u.name as creator_name, u.avatar_url as creator_avatar
       FROM courses c
       JOIN creators cr ON cr.id = c.creator_id
       JOIN users u ON u.id = cr.user_id
       WHERE c.id = $1`,
      [id]
    );

    if (courseResult.rows.length === 0) {
      return reply.status(404).send({ error: 'Course not found' });
    }

    const modulesResult = await fastify.pg.query(
      'SELECT * FROM modules WHERE course_id = $1 ORDER BY order_index',
      [id]
    );

    for (const module of modulesResult.rows) {
      const lessonsResult = await fastify.pg.query(
        'SELECT * FROM lessons WHERE module_id = $1 ORDER BY order_index',
        [module.id]
      );
      module.lessons = lessonsResult.rows;
    }

    return reply.send({
      course: {
        ...courseResult.rows[0],
        modules: modulesResult.rows,
      },
    });
  });

  fastify.post('/', {
    preHandler: [requireCreatorOrAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as AuthUser;
      const data = createCourseSchema.parse(request.body);

      if (!user.creatorId) {
        return reply.status(403).send({ error: 'Creator profile is incomplete' });
      }

      const result = await fastify.pg.query(
        `INSERT INTO courses (creator_id, title, slug, short_description, description, category, difficulty, price_cfa, thumbnail_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          user.creatorId,
          data.title,
          slugify(data.title),
          data.shortDescription,
          data.description,
          data.category,
          data.difficulty,
          data.priceCfa,
          data.thumbnailUrl,
        ]
      );

      return reply.status(201).send({ course: result.rows[0] });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send(validationErrorPayload(error));
      }
      fastify.log.error(error);
      return reply.status(500).send(serverErrorPayload(error));
    }
  });

  fastify.put('/:id', {
    preHandler: [requireCreatorOrAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const user = request.user as AuthUser;
      const data = createCourseSchema.partial().parse(request.body);

      if (!(await ownsCourse(fastify, user, id))) {
        return reply.status(404).send({ error: 'Course not found' });
      }

      const result = await fastify.pg.query(
        `UPDATE courses SET
          title = COALESCE($1, title),
          slug = COALESCE($2, slug),
          short_description = COALESCE($3, short_description),
          description = COALESCE($4, description),
          category = COALESCE($5, category),
          difficulty = COALESCE($6, difficulty),
          price_cfa = COALESCE($7, price_cfa),
          thumbnail_url = COALESCE($8, thumbnail_url),
          updated_at = NOW()
         WHERE id = $9
         RETURNING *`,
        [
          data.title,
          data.title ? slugify(data.title) : null,
          data.shortDescription,
          data.description,
          data.category,
          data.difficulty,
          data.priceCfa,
          data.thumbnailUrl,
          id,
        ]
      );

      return reply.send({ course: result.rows[0] });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send(validationErrorPayload(error));
      }
      fastify.log.error(error);
      return reply.status(500).send(serverErrorPayload(error));
    }
  });

  fastify.delete('/:id', {
    preHandler: [requireCreatorOrAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = request.user as AuthUser;

    if (!(await ownsCourse(fastify, user, id))) {
      return reply.status(404).send({ error: 'Course not found' });
    }

    await fastify.pg.query('DELETE FROM courses WHERE id = $1', [id]);
    return reply.send({ message: 'Course deleted' });
  });

  fastify.post('/:id/publish', {
    preHandler: [requireCreatorOrAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = request.user as AuthUser;

    if (!(await ownsCourse(fastify, user, id))) {
      return reply.status(404).send({ error: 'Course not found' });
    }

    const readiness = await fastify.pg.query(
      `SELECT
         COUNT(DISTINCT m.id)::int AS module_count,
         COUNT(l.id)::int AS lesson_count
       FROM courses c
       LEFT JOIN modules m ON m.course_id = c.id
       LEFT JOIN lessons l ON l.module_id = m.id
       WHERE c.id = $1
       GROUP BY c.id`,
      [id]
    );

    const moduleCount = Number(readiness.rows[0]?.module_count || 0);
    const lessonCount = Number(readiness.rows[0]?.lesson_count || 0);

    if (moduleCount === 0 || lessonCount === 0) {
      return reply.status(400).send({
        error: 'Cours incomplet',
        details: [
          {
            field: moduleCount === 0 ? 'modules' : 'lessons',
            message: moduleCount === 0
              ? 'Ajoutez au moins un module avant de publier.'
              : 'Ajoutez au moins une lecon avant de publier.',
          },
        ],
      });
    }

    const result = await fastify.pg.query(
      `UPDATE courses SET status = 'published', published_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return reply.send({ course: result.rows[0] });
  });

  fastify.get('/:courseId/access-codes', {
    preHandler: [requireCreatorOrAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { courseId } = courseIdParamsSchema.parse(request.params);
      const user = request.user as AuthUser;

      if (!(await ownsCourse(fastify, user, courseId))) {
        return reply.status(404).send({ error: 'Cours introuvable' });
      }

      const result = await fastify.pg.query(
        `SELECT ac.id,
                ac.status,
                ac.max_uses,
                ac.used_count,
                ac.used_at,
                ac.expires_at,
                ac.created_at,
                ac.payment_ref,
                u.name AS used_by_name
         FROM course_access_codes ac
         LEFT JOIN users u ON u.id = ac.used_by
         WHERE ac.course_id = $1
         ORDER BY ac.created_at DESC
         LIMIT 50`,
        [courseId]
      );

      return reply.send({ accessCodes: result.rows });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send(validationErrorPayload(error));
      }
      fastify.log.error(error);
      return reply.status(500).send(serverErrorPayload(error));
    }
  });

  fastify.post('/:courseId/access-codes', {
    preHandler: [requireCreatorOrAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { courseId } = courseIdParamsSchema.parse(request.params);
      const user = request.user as AuthUser;
      const data = createAccessCodeSchema.parse(request.body || {});

      if (!(await ownsCourse(fastify, user, courseId))) {
        return reply.status(404).send({ error: 'Cours introuvable' });
      }

      const courseResult = await fastify.pg.query(
        `SELECT id, price_cfa, status FROM courses WHERE id = $1`,
        [courseId]
      );
      const course = courseResult.rows[0];

      if (!course) {
        return reply.status(404).send({ error: 'Cours introuvable' });
      }

      if (Number(course.price_cfa || 0) <= 0) {
        return reply.status(400).send({ error: 'Les cours gratuits ne necessitent pas de code.' });
      }

      let code = generateAccessCode();
      let codeHash = hashAccessCode(code);
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const exists = await fastify.pg.query('SELECT id FROM course_access_codes WHERE code_hash = $1', [codeHash]);
        if (exists.rows.length === 0) break;
        code = generateAccessCode();
        codeHash = hashAccessCode(code);
      }

      const paymentRef = `OFFLINE-${courseId.slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`.toUpperCase();
      const result = await fastify.pg.query(
        `INSERT INTO course_access_codes (course_id, creator_id, generated_by, code_hash, status, max_uses, expires_at, payment_ref)
         VALUES ($1, $2, $3, $4, 'active', $5, NOW() + ($6 || ' days')::interval, $7)
         RETURNING id, status, max_uses, used_count, used_at, expires_at, created_at, payment_ref`,
        [courseId, user.creatorId || null, user.id, codeHash, data.maxUses, data.expiresInDays, paymentRef]
      );

      return reply.status(201).send({
        accessCode: {
          ...result.rows[0],
          code,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send(validationErrorPayload(error));
      }
      fastify.log.error(error);
      return reply.status(500).send(serverErrorPayload(error));
    }
  });

  fastify.post('/:courseId/redeem-code', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorise' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { courseId } = courseIdParamsSchema.parse(request.params);
      const user = request.user as AuthUser;
      const data = redeemAccessCodeSchema.parse(request.body);
      const codeHash = hashAccessCode(data.code);
      const ipAddress = getClientIp(request);

      const recentFailures = await fastify.pg.query(
        `SELECT COUNT(*)::int AS count
         FROM course_access_code_attempts
         WHERE user_id = $1
           AND course_id = $2
           AND success = false
           AND created_at > NOW() - interval '1 hour'`,
        [user.id, courseId]
      );

      if (Number(recentFailures.rows[0]?.count || 0) >= 5) {
        return reply.status(429).send({ error: 'Trop de tentatives. Reessayez plus tard.' });
      }

      const accessResult = await fastify.pg.query(
        `SELECT ac.*, c.price_cfa, c.currency, c.status AS course_status, c.is_public
         FROM course_access_codes ac
         JOIN courses c ON c.id = ac.course_id
         WHERE ac.course_id = $1 AND ac.code_hash = $2`,
        [courseId, codeHash]
      );

      const accessCode = accessResult.rows[0];
      const isValid = Boolean(
        accessCode &&
        accessCode.status === 'active' &&
        Number(accessCode.used_count || 0) < Number(accessCode.max_uses || 1) &&
        new Date(accessCode.expires_at).getTime() > Date.now() &&
        accessCode.course_status === 'published' &&
        accessCode.is_public === true
      );

      if (!isValid) {
        await fastify.pg.query(
          `INSERT INTO course_access_code_attempts (user_id, course_id, attempted_code_hash, success, ip_address)
           VALUES ($1, $2, $3, false, $4)`,
          [user.id, courseId, codeHash, ipAddress]
        );
        return reply.status(400).send({ error: 'Code invalide, expire ou deja utilise.' });
      }

      await fastify.pg.query('BEGIN');
      try {
        const lockedResult = await fastify.pg.query(
          `SELECT ac.*, c.price_cfa, c.currency, c.status AS course_status, c.is_public
           FROM course_access_codes ac
           JOIN courses c ON c.id = ac.course_id
           WHERE ac.id = $1
           FOR UPDATE`,
          [accessCode.id]
        );
        const lockedAccessCode = lockedResult.rows[0];
        const isStillValid = Boolean(
          lockedAccessCode &&
          lockedAccessCode.status === 'active' &&
          Number(lockedAccessCode.used_count || 0) < Number(lockedAccessCode.max_uses || 1) &&
          new Date(lockedAccessCode.expires_at).getTime() > Date.now()
        );

        if (!isStillValid) {
          await fastify.pg.query(
            `INSERT INTO course_access_code_attempts (access_code_id, user_id, course_id, attempted_code_hash, success, ip_address)
             VALUES ($1, $2, $3, $4, false, $5)`,
            [accessCode.id, user.id, courseId, codeHash, ipAddress]
          );
          await fastify.pg.query('COMMIT');
          return reply.status(400).send({ error: 'Code invalide, expire ou deja utilise.' });
        }

        const paymentRef = lockedAccessCode.payment_ref || `OFFLINE-${lockedAccessCode.id}`;
        const enrollmentResult = await fastify.pg.query(
          `INSERT INTO enrollments (user_id, course_id, status, amount_paid, currency, payment_method, payment_provider, payment_ref, payment_data)
           VALUES ($1, $2, 'paid', $3, $4, 'mtn_momo', 'offline_code', $5, $6)
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
            user.id,
            courseId,
            Number(lockedAccessCode.price_cfa || 0),
            lockedAccessCode.currency || 'GNF',
            paymentRef,
            JSON.stringify({ accessCodeId: lockedAccessCode.id, redeemedAt: new Date().toISOString() }),
          ]
        );

        await fastify.pg.query(
          `INSERT INTO payments (user_id, course_id, enrollment_id, amount, currency, provider, provider_ref, status, metadata, completed_at)
           VALUES ($1, $2, $3, $4, $5, 'offline_code', $6, 'completed', $7, NOW())`,
          [
            user.id,
            courseId,
            enrollmentResult.rows[0].id,
            Number(lockedAccessCode.price_cfa || 0),
            lockedAccessCode.currency || 'GNF',
            paymentRef,
            JSON.stringify({ accessCodeId: lockedAccessCode.id, source: 'creator_offline_code' }),
          ]
        );

        await fastify.pg.query(
          `UPDATE course_access_codes
           SET used_count = used_count + 1,
               used_by = $1,
               used_at = NOW(),
               status = CASE WHEN used_count + 1 >= max_uses THEN 'used' ELSE status END,
               updated_at = NOW()
           WHERE id = $2`,
          [user.id, lockedAccessCode.id]
        );

        await fastify.pg.query(
          `INSERT INTO course_access_code_attempts (access_code_id, user_id, course_id, attempted_code_hash, success, ip_address)
           VALUES ($1, $2, $3, $4, true, $5)`,
          [lockedAccessCode.id, user.id, courseId, codeHash, ipAddress]
        );

        await fastify.pg.query(
          `UPDATE courses SET total_students = (
            SELECT COUNT(*) FROM enrollments WHERE course_id = $1 AND status = 'paid'
          ) WHERE id = $1`,
          [courseId]
        );

        await fastify.pg.query('COMMIT');
        return reply.send({
          message: 'Code valide. Cours deverrouille.',
          enrollmentId: enrollmentResult.rows[0].id,
        });
      } catch (error) {
        await fastify.pg.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send(validationErrorPayload(error));
      }
      fastify.log.error(error);
      return reply.status(500).send(serverErrorPayload(error));
    }
  });

  fastify.post('/:id/enroll-free', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorise' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = (request.user as AuthUser).id;

    const courseResult = await fastify.pg.query(
      `SELECT id, title, price_cfa, status
       FROM courses
       WHERE id = $1 AND status = 'published' AND is_public = true`,
      [id]
    );

    if (courseResult.rows.length === 0) {
      return reply.status(404).send({ error: 'Cours non trouve ou non publie' });
    }

    const course = courseResult.rows[0];
    if (Number(course.price_cfa || 0) > 0) {
      return reply.status(400).send({ error: 'Ce cours est payant. Paiement requis pour le deverrouiller.' });
    }

    const freePaymentRef = `FREE-${id}`;
    const enrollmentResult = await fastify.pg.query(
      `INSERT INTO enrollments (user_id, course_id, status, amount_paid, payment_ref)
       VALUES ($1, $2, 'paid', 0, $3)
       ON CONFLICT (user_id, course_id)
       DO UPDATE SET status = 'paid', amount_paid = 0
       RETURNING *`,
      [userId, id, freePaymentRef]
    );

    await fastify.pg.query(
      `UPDATE courses SET total_students = (
        SELECT COUNT(*) FROM enrollments WHERE course_id = $1 AND status = 'paid'
      ) WHERE id = $1`,
      [id]
    );

    return reply.send({
      message: 'Cours gratuit deverrouille',
      enrollment: enrollmentResult.rows[0],
    });
  });

  fastify.post('/:courseId/modules', {
    preHandler: [requireCreatorOrAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { courseId } = courseIdParamsSchema.parse(request.params);
      const user = request.user as AuthUser;
      const data = addModuleSchema.parse(request.body);

      if (!(await ownsCourse(fastify, user, courseId))) {
        return reply.status(404).send({ error: 'Course not found' });
      }

      const result = await fastify.pg.query(
        `INSERT INTO modules (course_id, title, description, order_index)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [courseId, data.title, data.description, data.orderIndex || 0]
      );

      return reply.status(201).send({ module: result.rows[0] });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send(validationErrorPayload(error));
      }
      fastify.log.error(error);
      return reply.status(500).send(serverErrorPayload(error));
    }
  });

  fastify.put('/modules/:moduleId', {
    preHandler: [requireCreatorOrAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { moduleId } = moduleIdParamsSchema.parse(request.params);
      const user = request.user as AuthUser;
      const data = updateModuleSchema.parse(request.body);

      if (!(await ownsModule(fastify, user, moduleId))) {
        return reply.status(404).send({ error: 'Module not found' });
      }

      const result = await fastify.pg.query(
        `UPDATE modules SET
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          order_index = COALESCE($3, order_index),
          updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [data.title, data.description, data.orderIndex, moduleId]
      );

      return reply.send({ module: result.rows[0] });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send(validationErrorPayload(error));
      }
      fastify.log.error(error);
      return reply.status(500).send(serverErrorPayload(error));
    }
  });

  fastify.delete('/modules/:moduleId', {
    preHandler: [requireCreatorOrAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { moduleId } = moduleIdParamsSchema.parse(request.params);
      const user = request.user as AuthUser;

      if (!(await ownsModule(fastify, user, moduleId))) {
        return reply.status(404).send({ error: 'Module not found' });
      }

      const courseResult = await fastify.pg.query('SELECT course_id FROM modules WHERE id = $1', [moduleId]);
      const courseId = courseResult.rows[0]?.course_id;

      await fastify.pg.query('DELETE FROM modules WHERE id = $1', [moduleId]);
      if (courseId) await refreshCourseCounters(fastify, courseId);

      return reply.send({ message: 'Module deleted' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send(validationErrorPayload(error));
      }
      fastify.log.error(error);
      return reply.status(500).send(serverErrorPayload(error));
    }
  });

  fastify.put('/:courseId/modules/reorder', {
    preHandler: [requireCreatorOrAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { courseId } = courseIdParamsSchema.parse(request.params);
      const user = request.user as AuthUser;
      const data = reorderSchema.parse(request.body);

      if (!(await ownsCourse(fastify, user, courseId))) {
        return reply.status(404).send({ error: 'Course not found' });
      }

      await fastify.pg.query('BEGIN');
      try {
        for (const [index, id] of data.ids.entries()) {
          await fastify.pg.query(
            'UPDATE modules SET order_index = $1, updated_at = NOW() WHERE id = $2 AND course_id = $3',
            [index, id, courseId]
          );
        }
        await fastify.pg.query('COMMIT');
      } catch (error) {
        await fastify.pg.query('ROLLBACK');
        throw error;
      }

      return reply.send({ message: 'Modules reordered' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send(validationErrorPayload(error));
      }
      fastify.log.error(error);
      return reply.status(500).send(serverErrorPayload(error));
    }
  });

  fastify.post('/modules/:moduleId/lessons', {
    preHandler: [requireCreatorOrAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { moduleId } = moduleIdParamsSchema.parse(request.params);
      const user = request.user as AuthUser;
      const body = request.body as Record<string, unknown>;
      const data = addLessonSchema.parse({ ...body, moduleId });

      if (!(await ownsModule(fastify, user, moduleId))) {
        return reply.status(404).send({ error: 'Module not found' });
      }

      const result = await fastify.pg.query(
        `INSERT INTO lessons (module_id, title, type, description, content, content_url, media_public_id, thumbnail_url, duration_sec, order_index, is_free)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          data.moduleId,
          data.title,
          data.type,
          data.description,
          data.content,
          data.contentUrl,
          data.mediaPublicId,
          data.thumbnailUrl,
          data.durationSec || 0,
          data.orderIndex || 0,
          data.isFree,
        ]
      );

      const courseResult = await fastify.pg.query(
        'SELECT course_id FROM modules WHERE id = $1',
        [moduleId]
      );
      await refreshCourseCounters(fastify, courseResult.rows[0].course_id);

      return reply.status(201).send({ lesson: result.rows[0] });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send(validationErrorPayload(error));
      }
      fastify.log.error(error);
      return reply.status(500).send(serverErrorPayload(error));
    }
  });

  fastify.put('/lessons/:lessonId', {
    preHandler: [requireCreatorOrAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { lessonId } = lessonIdParamsSchema.parse(request.params);
      const user = request.user as AuthUser;
      const data = updateLessonSchema.parse(request.body);

      if (!(await ownsLesson(fastify, user, lessonId))) {
        return reply.status(404).send({ error: 'Lesson not found' });
      }

      const result = await fastify.pg.query(
        `UPDATE lessons SET
          title = COALESCE($1, title),
          type = COALESCE($2, type),
          description = COALESCE($3, description),
          content = COALESCE($4, content),
          content_url = COALESCE($5, content_url),
          media_public_id = COALESCE($6, media_public_id),
          thumbnail_url = COALESCE($7, thumbnail_url),
          duration_sec = COALESCE($8, duration_sec),
          order_index = COALESCE($9, order_index),
          is_free = COALESCE($10, is_free),
          updated_at = NOW()
         WHERE id = $11
         RETURNING *`,
        [
          data.title,
          data.type,
          data.description,
          data.content,
          data.contentUrl,
          data.mediaPublicId,
          data.thumbnailUrl,
          data.durationSec,
          data.orderIndex,
          data.isFree,
          lessonId,
        ]
      );

      const courseResult = await fastify.pg.query(
        `SELECT c.id
         FROM courses c
         JOIN modules m ON m.course_id = c.id
         JOIN lessons l ON l.module_id = m.id
         WHERE l.id = $1`,
        [lessonId]
      );
      await refreshCourseCounters(fastify, courseResult.rows[0].id);

      return reply.send({ lesson: result.rows[0] });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send(validationErrorPayload(error));
      }
      fastify.log.error(error);
      return reply.status(500).send(serverErrorPayload(error));
    }
  });

  fastify.delete('/lessons/:lessonId', {
    preHandler: [requireCreatorOrAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { lessonId } = lessonIdParamsSchema.parse(request.params);
      const user = request.user as AuthUser;

      if (!(await ownsLesson(fastify, user, lessonId))) {
        return reply.status(404).send({ error: 'Lesson not found' });
      }

      const courseResult = await fastify.pg.query(
        `SELECT c.id
         FROM courses c
         JOIN modules m ON m.course_id = c.id
         JOIN lessons l ON l.module_id = m.id
         WHERE l.id = $1`,
        [lessonId]
      );

      await fastify.pg.query('DELETE FROM lessons WHERE id = $1', [lessonId]);
      await refreshCourseCounters(fastify, courseResult.rows[0].id);

      return reply.send({ message: 'Lesson deleted' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send(validationErrorPayload(error));
      }
      fastify.log.error(error);
      return reply.status(500).send(serverErrorPayload(error));
    }
  });

  fastify.put('/modules/:moduleId/lessons/reorder', {
    preHandler: [requireCreatorOrAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { moduleId } = moduleIdParamsSchema.parse(request.params);
      const user = request.user as AuthUser;
      const data = reorderSchema.parse(request.body);

      if (!(await ownsModule(fastify, user, moduleId))) {
        return reply.status(404).send({ error: 'Module not found' });
      }

      await fastify.pg.query('BEGIN');
      try {
        for (const [index, id] of data.ids.entries()) {
          await fastify.pg.query(
            'UPDATE lessons SET order_index = $1, updated_at = NOW() WHERE id = $2 AND module_id = $3',
            [index, id, moduleId]
          );
        }
        await fastify.pg.query('COMMIT');
      } catch (error) {
        await fastify.pg.query('ROLLBACK');
        throw error;
      }

      return reply.send({ message: 'Lessons reordered' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send(validationErrorPayload(error));
      }
      fastify.log.error(error);
      return reply.status(500).send(serverErrorPayload(error));
    }
  });

  fastify.post('/lessons/:lessonId/progress', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorise' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { lessonId } = lessonIdParamsSchema.parse(request.params);
      const user = request.user as AuthUser;
      const data = lessonProgressSchema.parse(request.body);

      const accessResult = await fastify.pg.query(
        `SELECT e.id AS enrollment_id,
                c.id AS course_id,
                c.price_cfa,
                c.status,
                c.is_public
         FROM lessons l
         JOIN modules m ON m.id = l.module_id
         JOIN courses c ON c.id = m.course_id
         LEFT JOIN enrollments e ON e.course_id = c.id AND e.user_id = $1 AND e.status = 'paid'
         WHERE l.id = $2`,
        [user.id, lessonId]
      );

      if (accessResult.rows.length === 0) {
        return reply.status(404).send({ error: 'Lecon introuvable' });
      }

      const access = accessResult.rows[0];
      const isFreeCourse = Number(access.price_cfa || 0) <= 0;
      const canReadFreeCourse = isFreeCourse && access.status === 'published' && access.is_public === true;

      if (!access.enrollment_id && !canReadFreeCourse) {
        return reply.status(403).send({ error: 'Paiement requis pour lire ce cours' });
      }

      let enrollmentId = access.enrollment_id;
      const courseId = access.course_id;

      if (!enrollmentId && canReadFreeCourse) {
        const enrollmentResult = await fastify.pg.query(
          `INSERT INTO enrollments (user_id, course_id, status, amount_paid, payment_ref)
           VALUES ($1, $2, 'paid', 0, $3)
           ON CONFLICT (user_id, course_id)
           DO UPDATE SET status = 'paid', amount_paid = 0
           RETURNING id`,
          [user.id, courseId, `FREE-${courseId}`]
        );
        enrollmentId = enrollmentResult.rows[0].id;
      }

      await fastify.pg.query(
        `INSERT INTO lesson_progress (user_id, lesson_id, enrollment_id, status, watch_time_sec, progress_percent, completed_at, last_watched_at, updated_at)
         VALUES ($1, $2, $3, $4::progress_status, $5, $6, CASE WHEN $4 = 'completed' THEN NOW() ELSE NULL END, NOW(), NOW())
         ON CONFLICT (user_id, lesson_id)
         DO UPDATE SET status = EXCLUDED.status,
                       watch_time_sec = GREATEST(lesson_progress.watch_time_sec, EXCLUDED.watch_time_sec),
                       progress_percent = GREATEST(lesson_progress.progress_percent, EXCLUDED.progress_percent),
                       completed_at = CASE
                         WHEN EXCLUDED.status = 'completed' THEN COALESCE(lesson_progress.completed_at, NOW())
                         ELSE lesson_progress.completed_at
                       END,
                       last_watched_at = NOW(),
                       updated_at = NOW()`,
        [
          user.id,
          lessonId,
          enrollmentId,
          data.status,
          data.watchTimeSec || 0,
          data.status === 'completed' ? 100 : data.progressPercent,
        ]
      );

      const progressResult = await fastify.pg.query(
        `SELECT COUNT(l.id)::int AS total_lessons,
                COUNT(lp.id) FILTER (WHERE lp.status = 'completed')::int AS completed_lessons
         FROM courses c
         JOIN modules m ON m.course_id = c.id
         JOIN lessons l ON l.module_id = m.id
         LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = $1
         WHERE c.id = $2`,
        [user.id, courseId]
      );

      const totalLessons = Number(progressResult.rows[0]?.total_lessons || 0);
      const completedLessons = Number(progressResult.rows[0]?.completed_lessons || 0);
      const progressPercent = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;

      await fastify.pg.query(
        `UPDATE enrollments SET progress_percent = $1,
                                completed_at = CASE WHEN $1 = 100 THEN COALESCE(completed_at, NOW()) ELSE completed_at END
         WHERE id = $2`,
        [progressPercent, enrollmentId]
      );

      return reply.send({
        progress: {
          completedLessons,
          totalLessons,
          progressPercent,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send(validationErrorPayload(error));
      }
      fastify.log.error(error);
      return reply.status(500).send(serverErrorPayload(error));
    }
  });
}
