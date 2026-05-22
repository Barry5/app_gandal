import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

type AuthUser = {
  id: string;
  role: 'admin' | 'creator' | 'learner';
};

const userStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().trim().max(500).optional(),
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

function mapCreator(row: any) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    role: row.role,
    avatarUrl: row.avatar_url,
    isActive: row.is_active,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
    creatorId: row.creator_id,
    businessName: row.business_name,
    plan: row.plan,
    coursesCount: Number(row.courses_count || 0),
    publishedCoursesCount: Number(row.published_courses_count || 0),
    totalStudents: Number(row.total_students || 0),
    revenueCfa: Number(row.revenue_cfa || 0),
  };
}

export async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = 1, limit = 20, role } = request.query as any;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (safePage - 1) * safeLimit;

    let query = 'SELECT id, email, name, phone, role, avatar_url, is_active, created_at, last_login_at FROM users WHERE 1=1';
    const params: any[] = [];

    if (role) {
      params.push(role);
      query += ' AND role = $' + params.length;
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(safeLimit, offset);

    const result = await fastify.pg.query(query, params);
    return reply.send({ users: result.rows });
  });

  fastify.get('/creators', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = 1, limit = 20, status = 'all', search = '' } = request.query as any;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (safePage - 1) * safeLimit;
    const params: any[] = [];
    const conditions = ["u.role = 'creator'"];

    if (status === 'active') {
      conditions.push('u.is_active = true');
    }

    if (status === 'blocked') {
      conditions.push('u.is_active = false');
    }

    if (typeof search === 'string' && search.trim()) {
      params.push('%' + search.trim() + '%');
      conditions.push('(u.name ILIKE $' + params.length + ' OR u.email ILIKE $' + params.length + ' OR cr.business_name ILIKE $' + params.length + ')');
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');
    const query = [
      'SELECT u.id, u.email, u.name, u.phone, u.role, u.avatar_url, u.is_active, u.created_at, u.last_login_at,',
      '       cr.id AS creator_id, cr.business_name, cr.plan,',
      '       COUNT(DISTINCT c.id)::int AS courses_count,',
      "       COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'published')::int AS published_courses_count,",
      '       COALESCE(SUM(c.total_students), 0)::int AS total_students,',
      "       COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0)::int AS revenue_cfa",
      'FROM users u',
      'JOIN creators cr ON cr.user_id = u.id',
      'LEFT JOIN courses c ON c.creator_id = cr.id',
      'LEFT JOIN payments p ON p.course_id = c.id',
      whereClause,
      'GROUP BY u.id, cr.id',
      'ORDER BY u.created_at DESC',
      'LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2),
    ].join('\n');

    const countQuery = [
      'SELECT COUNT(*)::int AS total',
      'FROM users u',
      'JOIN creators cr ON cr.user_id = u.id',
      whereClause,
    ].join('\n');

    const result = await fastify.pg.query(query, [...params, safeLimit, offset]);
    const countResult = await fastify.pg.query(countQuery, params);
    const total = Number(countResult.rows[0]?.total || 0);

    const summaryResult = await fastify.pg.query(
      [
        'SELECT COUNT(*) FILTER (WHERE u.is_active = true)::int AS active_creators,',
        '       COUNT(*) FILTER (WHERE u.is_active = false)::int AS blocked_creators,',
        '       COUNT(*)::int AS total_creators',
        'FROM users u',
        "WHERE u.role = 'creator'",
      ].join('\n')
    );

    return reply.send({
      creators: result.rows.map(mapCreator),
      summary: summaryResult.rows[0],
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    });
  });

  fastify.patch('/:id/status', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const admin = request.user as AuthUser;
      const { id } = request.params as { id: string };
      const data = userStatusSchema.parse(request.body || {});

      if (admin.id === id) {
        return reply.status(400).send({ error: 'Vous ne pouvez pas modifier votre propre statut.' });
      }

      const targetResult = await fastify.pg.query(
        'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
        [id]
      );

      if (targetResult.rows.length === 0) {
        return reply.status(404).send({ error: 'Utilisateur introuvable' });
      }

      const target = targetResult.rows[0];
      if (target.role === 'admin') {
        return reply.status(403).send({ error: 'Un administrateur ne peut pas bloquer un autre administrateur.' });
      }

      const result = await fastify.pg.query(
        'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, name, role, is_active, updated_at',
        [data.isActive, id]
      );

      await fastify.pg.query(
        [
          'INSERT INTO admin_activity_logs (actor_user_id, target_user_id, action, reason, metadata)',
          'VALUES ($1, $2, $3, $4, $5)',
        ].join('\n'),
        [
          admin.id,
          id,
          data.isActive ? 'user_unblocked' : 'user_blocked',
          data.reason || null,
          JSON.stringify({ previousIsActive: target.is_active, role: target.role }),
        ]
      ).catch((error) => {
        fastify.log.warn({ error }, 'admin activity log insert failed');
      });

      if (!data.isActive) {
        await fastify.pg.query(
          [
            'INSERT INTO notifications (user_id, type, title, message, data)',
            "VALUES ($1, 'security', 'Compte suspendu', 'Votre compte a ete temporairement suspendu par l administration.', $2)",
          ].join('\n'),
          [id, JSON.stringify({ reason: data.reason || null })]
        ).catch(() => undefined);
      }

      return reply.send({
        user: result.rows[0],
        message: data.isActive ? 'Utilisateur debloque' : 'Utilisateur bloque',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Donnees invalides', details: error.errors });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur serveur' });
    }
  });

  fastify.get('/:id', {
    preHandler: [requireAuth],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = request.user as AuthUser;

    if (user.role !== 'admin' && user.id !== id) {
      return reply.status(403).send({ error: 'Acces refuse' });
    }

    const result = await fastify.pg.query(
      'SELECT id, email, name, phone, role, avatar_url, is_active, created_at, last_login_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Utilisateur non trouve' });
    }

    return reply.send({ user: result.rows[0] });
  });

  fastify.put('/profile', {
    preHandler: [requireAuth],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as AuthUser).id;
    const { name, phone, avatarUrl } = request.body as any;

    const result = await fastify.pg.query(
      [
        'UPDATE users SET',
        '  name = COALESCE($1, name),',
        '  phone = COALESCE($2, phone),',
        '  avatar_url = COALESCE($3, avatar_url),',
        '  updated_at = NOW()',
        'WHERE id = $4 AND is_active = true',
        'RETURNING id, email, name, phone, role, avatar_url',
      ].join('\n'),
      [name, phone, avatarUrl, userId]
    );

    if (result.rows.length === 0) {
      return reply.status(403).send({ error: 'Compte inactif' });
    }

    return reply.send({ user: result.rows[0] });
  });

  fastify.get('/:id/enrollments', {
    preHandler: [requireAuth],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = request.user as AuthUser;

    if (user.role !== 'admin' && user.id !== id) {
      return reply.status(403).send({ error: 'Acces refuse' });
    }

    const result = await fastify.pg.query(
      [
        'SELECT e.*, c.title as course_title, c.thumbnail_url as course_thumbnail',
        'FROM enrollments e',
        'JOIN courses c ON c.id = e.course_id',
        'WHERE e.user_id = $1',
        'ORDER BY e.enrolled_at DESC',
      ].join('\n'),
      [id]
    );

    return reply.send({ enrollments: result.rows });
  });

  fastify.get('/:id/progress', {
    preHandler: [requireAuth],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = request.user as AuthUser;

    if (user.role !== 'admin' && user.id !== id) {
      return reply.status(403).send({ error: 'Acces refuse' });
    }

    const result = await fastify.pg.query(
      [
        'SELECT lp.*, l.title as lesson_title, l.type as lesson_type',
        'FROM lesson_progress lp',
        'JOIN lessons l ON l.id = lp.lesson_id',
        'WHERE lp.user_id = $1',
        'ORDER BY lp.last_watched_at DESC',
      ].join('\n'),
      [id]
    );

    return reply.send({ progress: result.rows });
  });
}
