import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  phone: z.string().optional(),
  role: z.enum(['creator', 'learner']).default('learner'),
  businessName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

async function ensureCreatorProfile(fastify: FastifyInstance, user: { id: string; name: string; role: string; creator_id?: string | null }) {
  if (user.role !== 'creator' || user.creator_id) {
    return user.creator_id;
  }

  const creatorResult = await fastify.pg.query(
    `INSERT INTO creators (user_id, business_name)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET business_name = COALESCE(creators.business_name, EXCLUDED.business_name)
     RETURNING id`,
    [user.id, user.name]
  );

  return creatorResult.rows[0].id as string;
}

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = registerSchema.parse(request.body);
      
      const existingUser = await fastify.pg.query(
        'SELECT id FROM users WHERE email = $1',
        [data.email]
      );

      if (existingUser.rows.length > 0) {
        return reply.status(400).send({ error: 'Cet email est déjà utilisé' });
      }

      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash(data.password, 12);

      const result = await fastify.pg.query(
        `INSERT INTO users (email, password_hash, name, phone, role) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, email, name, role, created_at`,
        [data.email, passwordHash, data.name, data.phone || null, data.role]
      );

      const user = result.rows[0];
      let creatorId: string | undefined;

      if (data.role === 'creator') {
        const creatorResult = await fastify.pg.query(
          `INSERT INTO creators (user_id, business_name) VALUES ($1, $2) RETURNING id`,
          [user.id, data.businessName || data.name]
        );
        creatorId = creatorResult.rows[0].id;
      }

      const token = fastify.jwt.sign({ id: user.id, email: user.email, role: user.role, creatorId });

      return reply.status(201).send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          creatorId,
        },
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Données invalides', details: error.errors });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur serveur' });
    }
  });

  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = loginSchema.parse(request.body);

      const result = await fastify.pg.query(
        `SELECT u.id, u.email, u.password_hash, u.name, u.role, u.avatar_url, c.id as creator_id
         FROM users u
         LEFT JOIN creators c ON c.user_id = u.id
         WHERE u.email = $1 AND u.is_active = true`,
        [data.email]
      );

      if (result.rows.length === 0) {
        return reply.status(401).send({ error: 'Email ou mot de passe incorrect' });
      }

      const user = result.rows[0];
      const bcrypt = await import('bcrypt');
      const validPassword = await bcrypt.compare(data.password, user.password_hash);

      if (!validPassword) {
        return reply.status(401).send({ error: 'Email ou mot de passe incorrect' });
      }

      await fastify.pg.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );

      const creatorId = await ensureCreatorProfile(fastify, user);
      const token = fastify.jwt.sign({ id: user.id, email: user.email, role: user.role, creatorId });

      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatar_url,
          creatorId,
        },
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Données invalides' });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur serveur' });
    }
  });

  fastify.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ message: 'Déconnexion réussie' });
  });

  fastify.get('/me', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorisé' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    
    const result = await fastify.pg.query(
      `SELECT u.id, u.email, u.name, u.phone, u.role, u.avatar_url, u.created_at, c.id as creator_id
       FROM users u
       LEFT JOIN creators c ON c.user_id = u.id
       WHERE u.id = $1 AND u.is_active = true`,
      [userId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Utilisateur non trouvé' });
    }

    const user = result.rows[0];
    const creatorId = await ensureCreatorProfile(fastify, user);
    const token = fastify.jwt.sign({ id: user.id, email: user.email, role: user.role, creatorId });

    return reply.send({ user: { ...user, creator_id: creatorId }, token });
  });

  fastify.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    
    if (!refreshToken) {
      return reply.status(400).send({ error: 'Token requis' });
    }

    return reply.send({ token: fastify.jwt.sign({ id: 'user' }) });
  });
}
