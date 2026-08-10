import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

type AuthUser = {
  id: string;
  role: 'admin' | 'creator' | 'learner';
  creatorId?: string;
};

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

async function getStats(fastify: FastifyInstance, user: AuthUser) {
  const isAdmin = user.role === 'admin';
  const params: string[] = [];
  const conditions: string[] = [];

  if (!isAdmin) {
    params.push(user.creatorId!);
    conditions.push(`cr.id = $${params.length}`);
  }

  const scopeWhere = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const revenueResult = await fastify.pg.query(
    [
      'SELECT COALESCE(SUM(p.amount), 0) AS revenue, COUNT(DISTINCT p.id) AS payments',
      'FROM payments p',
      'JOIN courses c ON c.id = p.course_id',
      'JOIN creators cr ON cr.id = c.creator_id',
      scopeWhere ? `WHERE ${conditions.join(' AND ')} AND p.status = 'paid'` : "WHERE p.status = 'paid'",
    ].join('\n'),
    params
  );

  const studentsResult = await fastify.pg.query(
    [
      'SELECT COUNT(DISTINCT e.user_id) AS students',
      'FROM enrollments e',
      'JOIN courses c ON c.id = e.course_id',
      'JOIN creators cr ON cr.id = c.creator_id',
      scopeWhere ? `${scopeWhere} AND e.status = 'paid'` : "WHERE e.status = 'paid'",
    ].join('\n'),
    params
  );

  const coursesResult = await fastify.pg.query(
    [
      'SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE c.status = \'published\') AS published',
      'FROM courses c',
      'JOIN creators cr ON cr.id = c.creator_id',
      scopeWhere,
    ].join('\n'),
    params
  );

  const completionResult = await fastify.pg.query(
    [
      'SELECT ROUND(AVG(e.progress_percent)) AS avg_completion',
      'FROM enrollments e',
      'JOIN courses c ON c.id = e.course_id',
      'JOIN creators cr ON cr.id = c.creator_id',
      scopeWhere ? `${scopeWhere} AND e.status = 'paid'` : "WHERE e.status = 'paid'",
    ].join('\n'),
    params
  );

  const monthlyResult = await fastify.pg.query(
    [
      "SELECT to_char(date_trunc('month', p.completed_at), 'YYYY-MM') AS month,",
      '       SUM(p.amount) AS revenue,',
      '       COUNT(DISTINCT p.user_id) AS students',
      'FROM payments p',
      'JOIN courses c ON c.id = p.course_id',
      'JOIN creators cr ON cr.id = c.creator_id',
      scopeWhere ? `${scopeWhere} AND p.status = 'paid'` : "WHERE p.status = 'paid'",
      "GROUP BY date_trunc('month', p.completed_at)",
      "ORDER BY month DESC LIMIT 12",
    ].join('\n'),
    params
  );

  const topCoursesResult = await fastify.pg.query(
    [
      'SELECT c.id, c.title, c.status,',
      '       COUNT(DISTINCT e.id) AS students,',
      '       COALESCE(SUM(p.amount) FILTER (WHERE p.status = \'paid\'), 0) AS revenue,',
      '       COALESCE(AVG(lp.progress_percent), 0)::int AS avg_completion',
      'FROM courses c',
      'JOIN creators cr ON cr.id = c.creator_id',
      'LEFT JOIN enrollments e ON e.course_id = c.id AND e.status = \'paid\'',
      'LEFT JOIN payments p ON p.course_id = c.id',
      'LEFT JOIN lessons l ON l.module_id IN (SELECT id FROM modules WHERE course_id = c.id)',
      'LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id',
      scopeWhere,
      'GROUP BY c.id, c.title, c.status',
      'ORDER BY revenue DESC, students DESC',
      'LIMIT 10',
    ].join('\n'),
    params
  );

  const recentActivityResult = await fastify.pg.query(
    [
      'SELECT e.id, e.enrolled_at AS date, \'enrollment\' AS type,',
      '       u.name AS user_name, c.title AS course_title',
      'FROM enrollments e',
      'JOIN users u ON u.id = e.user_id',
      'JOIN courses c ON c.id = e.course_id',
      'JOIN creators cr ON cr.id = c.creator_id',
      scopeWhere,
      "ORDER BY e.enrolled_at DESC LIMIT 10",
    ].join('\n'),
    params
  );

  return {
    revenue: Number(revenueResult.rows[0]?.revenue || 0),
    payments: Number(revenueResult.rows[0]?.payments || 0),
    students: Number(studentsResult.rows[0]?.students || 0),
    totalCourses: Number(coursesResult.rows[0]?.total || 0),
    publishedCourses: Number(coursesResult.rows[0]?.published || 0),
    avgCompletion: Number(completionResult.rows[0]?.avg_completion || 0),
    monthly: monthlyResult.rows.map((row: any) => ({
      month: row.month,
      revenue: Number(row.revenue || 0),
      students: Number(row.students || 0),
    })),
    topCourses: topCoursesResult.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      students: Number(row.students || 0),
      revenue: Number(row.revenue || 0),
      avgCompletion: Number(row.avg_completion || 0),
    })),
    recentActivity: recentActivityResult.rows.map((row: any) => ({
      id: row.id,
      date: row.date,
      type: row.type,
      userName: row.user_name,
      courseTitle: row.course_title,
    })),
  };
}

export async function analyticsRoutes(fastify: FastifyInstance) {
  fastify.get('/creator', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireCreatorOrAdmin(request, reply);
    if (!user) return;

    try {
      const stats = await getStats(fastify, user);
      return reply.send(stats);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors du chargement des statistiques' });
    }
  });

  fastify.get('/students', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireCreatorOrAdmin(request, reply);
    if (!user) return;

    try {
      const isAdmin = user.role === 'admin';
      const params: string[] = [];
      const courseCondition = isAdmin
        ? ''
        : (() => {
            params.push(user.creatorId!);
            return 'AND cr.id = $1';
          })();

      const result = await fastify.pg.query(
        [
          'SELECT u.id, u.name, u.email, u.avatar_url,',
          '       COUNT(DISTINCT e.id) AS enrolled_courses,',
          '       COUNT(DISTINCT e.id) FILTER (WHERE e.progress_percent = 100) AS completed_courses,',
          '       ROUND(AVG(e.progress_percent)) AS avg_progress,',
          '       MAX(e.enrolled_at) AS last_activity,',
          '       MAX(e.enrolled_at) FILTER (WHERE e.status = \'paid\') AS joined_at',
          'FROM enrollments e',
          'JOIN users u ON u.id = e.user_id',
          'JOIN courses c ON c.id = e.course_id',
          'JOIN creators cr ON cr.id = c.creator_id',
          `WHERE e.status = 'paid' ${courseCondition}`,
          'GROUP BY u.id, u.name, u.email, u.avatar_url',
          'ORDER BY last_activity DESC',
          'LIMIT 200',
        ].join('\n'),
        params
      );

      return reply.send({
        students: result.rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          avatarUrl: row.avatar_url,
          enrolledCourses: Number(row.enrolled_courses || 0),
          completedCourses: Number(row.completed_courses || 0),
          progress: Number(row.avg_progress || 0),
          lastActivity: row.last_activity,
          joinedAt: row.joined_at,
        })),
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors du chargement des élèves' });
    }
  });
}