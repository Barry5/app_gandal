import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

const XP_RULES = {
  lesson_completed: 50,
  quiz_completed: 100,
  quiz_perfect_score: 50,
  module_completed: 200,
  course_completed: 500,
  discussion_post: 20,
  discussion_reply: 10,
  daily_login: 10,
  streak_bonus: 25,
  challenge_completed: 150,
  badge_earned: 100,
};

const LEVELS = [
  { level: 1, minXp: 0, maxXp: 100, title: 'Débutant' },
  { level: 2, minXp: 100, maxXp: 300, title: 'Apprenti' },
  { level: 3, minXp: 300, maxXp: 600, title: 'Novice' },
  { level: 4, minXp: 600, maxXp: 1000, title: 'Initié' },
  { level: 5, minXp: 1000, maxXp: 1500, title: 'Apprenant' },
  { level: 6, minXp: 1500, maxXp: 2100, title: 'Compétent' },
  { level: 7, minXp: 2100, maxXp: 2800, title: 'Intermédiaire' },
  { level: 8, minXp: 2800, maxXp: 3600, title: 'Avancé' },
  { level: 9, minXp: 3600, maxXp: 4500, title: 'Confirmé' },
  { level: 10, minXp: 4500, maxXp: 5500, title: 'Expert' },
  { level: 15, minXp: 10000, maxXp: 15000, title: 'Maître' },
  { level: 20, minXp: 20000, maxXp: 30000, title: 'Grand Maître' },
  { level: 25, minXp: 35000, maxXp: 50000, title: 'Légende' },
];

const BADGES = [
  { type: 'first_lesson', name: 'Premier pas', description: 'Compléter votre première leçon', icon: '🎯', category: 'progress', xpReward: 100, rarity: 'common' },
  { type: 'first_course', name: 'Premier cours', description: 'Terminer votre premier cours', icon: '🎓', category: 'progress', xpReward: 200, rarity: 'common' },
  { type: 'streak_7_days', name: 'Perpétuel', description: '7 jours consécutifs de connexion', icon: '🔥', category: 'streak', xpReward: 150, rarity: 'rare' },
  { type: 'streak_30_days', name: 'Assidu', description: '30 jours consécutifs de connexion', icon: '⭐', category: 'streak', xpReward: 500, rarity: 'epic' },
  { type: 'quiz_master', name: 'Maître des quiz', description: 'Passer 10 quiz avec succès', icon: '🧠', category: 'quiz', xpReward: 200, rarity: 'rare' },
  { type: 'quiz_champion', name: 'Champion des quiz', description: 'Obtenir 100% à 5 quiz', icon: '🏆', category: 'quiz', xpReward: 400, rarity: 'epic' },
  { type: 'social_butterfly', name: 'Papillon social', description: 'Participer à 20 discussions', icon: '💬', category: 'social', xpReward: 150, rarity: 'common' },
  { type: 'course_collector', name: 'Collectionneur', description: 'S\'inscrire à 5 cours', icon: '📚', category: 'progress', xpReward: 200, rarity: 'rare' },
  { type: 'speed_learner', name: 'Apprenant rapide', description: 'Terminer un cours en moins d\'une semaine', icon: '⚡', category: 'special', xpReward: 300, rarity: 'rare' },
  { type: 'early_bird', name: 'Lève-tôt', description: 'Étudier avant 7h du matin', icon: '🌅', category: 'special', xpReward: 100, rarity: 'common' },
  { type: 'night_owl', name: 'Couche-tard', description: 'Étudier après 22h', icon: '🌙', category: 'special', xpReward: 100, rarity: 'common' },
  { type: 'week_warrior', name: 'Guerrier du week-end', description: 'Étudier le week-end pendant 4 semaines', icon: '⚔️', category: 'special', xpReward: 250, rarity: 'rare' },
  { type: 'completionist', name: 'Perfectionniste', description: 'Compléter tous les cours d\'une catégorie', icon: '💎', category: 'special', xpReward: 500, rarity: 'legendary' },
  { type: 'top_10_percent', name: 'Top 10%', description: 'Être parmi les 10% meilleurs apprenants', icon: '👑', category: 'ranking', xpReward: 1000, rarity: 'legendary' },
];

const DAILY_CHALLENGES = [
  { id: 'daily_1', title: 'Regardez 2 vidéos', description: 'Complétez 2 leçons vidéo', icon: '🎬', xpReward: 30, target: 2, type: 'daily' },
  { id: 'daily_2', title: 'Passez un quiz', description: 'Complétez au moins un quiz', icon: '❓', xpReward: 40, type: 'daily', target: 1 },
  { id: 'daily_3', title: 'Restez connecté', description: 'Connectez-vous pendant 3 jours consécutifs', icon: '📅', xpReward: 50, type: 'daily', target: 3 },
];

const WEEKLY_CHALLENGES = [
  { id: 'weekly_1', title: 'Semaine studieuse', description: 'Complétez 10 leçons cette semaine', icon: '📖', xpReward: 150, target: 10, type: 'weekly' },
  { id: 'weekly_2', title: 'Quiz master', description: 'Passez 5 quiz cette semaine', icon: '🧠', xpReward: 100, target: 5, type: 'weekly' },
  { id: 'weekly_3', title: 'Social butterfly', description: 'Participez à 10 discussions', icon: '💬', xpReward: 100, target: 10, type: 'weekly' },
];

export async function gamificationRoutes(fastify: FastifyInstance) {
  fastify.get('/profile', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorisé' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).id;

      let progress = await fastify.pg.query(
        'SELECT * FROM user_progress WHERE user_id = $1',
        [userId]
      );

      if (progress.rows.length === 0) {
        await fastify.pg.query(
          'INSERT INTO user_progress (user_id) VALUES ($1)',
          [userId]
        );
        progress = await fastify.pg.query(
          'SELECT * FROM user_progress WHERE user_id = $1',
          [userId]
        );
      }

      const badges = await fastify.pg.query(
        `SELECT b.*, ub.earned_at, ub.progress 
         FROM user_badges ub
         JOIN badges b ON b.id = ub.badge_id
         WHERE ub.user_id = $1
         ORDER BY ub.earned_at DESC`,
        [userId]
      );

      const levelInfo = LEVELS.find(l => l.level === progress.rows[0].current_level) || LEVELS[0];
      const nextLevel = LEVELS.find(l => l.level === progress.rows[0].current_level + 1);
      
      const xpToNextLevel = nextLevel ? nextLevel.minXp - progress.rows[0].total_xp : 0;
      const xpInCurrentLevel = progress.rows[0].total_xp - levelInfo.minXp;
      const xpNeededForLevel = levelInfo.maxXp - levelInfo.minXp;

      return reply.send({
        progress: {
          ...progress.rows[0],
          levelInfo,
          nextLevel,
          xpToNextLevel,
          xpInCurrentLevel,
          xpNeededForLevel,
          progressPercent: Math.round((xpInCurrentLevel / xpNeededForLevel) * 100),
        },
        badges: badges.rows,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération' });
    }
  });

  fastify.post('/xp/add', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorisé' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).id;
      const { type, amount, source, sourceId, description } = request.body as any;

      const xpGain = amount || XP_RULES[type as keyof typeof XP_RULES] || 50;

      await fastify.pg.query(
        `INSERT INTO xp_transactions (user_id, amount, type, source, source_id, description)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, xpGain, type, source, sourceId, description]
      );

      const currentProgress = await fastify.pg.query(
        'SELECT total_xp, current_level FROM user_progress WHERE user_id = $1',
        [userId]
      );

      const newTotalXp = currentProgress.rows[0].total_xp + xpGain;
      const newLevel = LEVELS.filter(l => l.minXp <= newTotalXp).pop()?.level || 1;

      await fastify.pg.query(
        `UPDATE user_progress 
         SET total_xp = $1, current_level = $2, updated_at = NOW()
         WHERE user_id = $3`,
        [newTotalXp, newLevel, userId]
      );

      await fastify.pg.query(
        `UPDATE leaderboard SET total_xp = $1, updated_at = NOW() WHERE user_id = $2`,
        [newTotalXp, userId]
      );

      const leveledUp = newLevel > currentProgress.rows[0].current_level;

      return reply.send({
        success: true,
        xpGained: xpGain,
        newTotalXp,
        newLevel,
        leveledUp,
        levelInfo: LEVELS.find(l => l.level === newLevel),
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de l\'ajout d\'XP' });
    }
  });

  fastify.get('/badges', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await fastify.pg.query('SELECT * FROM badges ORDER BY category, xp_reward');
      return reply.send({ badges: result.rows });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération' });
    }
  });

  fastify.get('/badges/all', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ badges: BADGES });
  });

  fastify.post('/badges/check', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorisé' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).id;

      const progress = await fastify.pg.query(
        'SELECT * FROM user_progress WHERE user_id = $1',
        [userId]
      );

      const earnedBadges = await fastify.pg.query(
        'SELECT badge_id FROM user_badges WHERE user_id = $1',
        [userId]
      );
      const earnedBadgeIds = earnedBadges.rows.map(b => b.badge_id);

      const allBadges = await fastify.pg.query('SELECT * FROM badges');
      
      const newBadges: any[] = [];

      for (const badge of allBadges.rows) {
        if (earnedBadgeIds.includes(badge.id)) continue;

        let earned = false;
        const criteria = badge.criteria;

        switch (badge.type) {
          case 'first_lesson':
            earned = progress.rows[0]?.lessons_completed >= 1;
            break;
          case 'first_course':
            earned = progress.rows[0]?.courses_completed >= 1;
            break;
          case 'streak_7_days':
            earned = progress.rows[0]?.streak_days >= 7;
            break;
          case 'streak_30_days':
            earned = progress.rows[0]?.streak_days >= 30;
            break;
          case 'quiz_master':
            earned = progress.rows[0]?.quizzes_passed >= 10;
            break;
          case 'quiz_champion':
            earned = progress.rows[0]?.perfect_quizzes >= 5;
            break;
          case 'social_butterfly':
            earned = progress.rows[0]?.discussions_count >= 20;
            break;
          case 'course_collector':
            const courses = await fastify.pg.query(
              'SELECT COUNT(*) FROM enrollments WHERE user_id = $1 AND status = \'paid\'',
              [userId]
            );
            earned = parseInt(courses.rows[0].count) >= 5;
            break;
        }

        if (earned) {
          await fastify.pg.query(
            'INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2)',
            [userId, badge.id]
          );

          await fastify.pg.query(
            `UPDATE user_progress SET total_xp = total_xp + $1, updated_at = NOW() WHERE user_id = $2`,
            [badge.xp_reward, userId]
          );

          newBadges.push(badge);
        }
      }

      return reply.send({
        success: true,
        newBadges,
        totalBadgesEarned: earnedBadgeIds.length + newBadges.length,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la vérification des badges' });
    }
  });

  fastify.get('/challenges', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorisé' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).id;

      const activeChallenges = await fastify.pg.query(
        `SELECT c.*, ucp.current_progress, ucp.status as user_status
         FROM challenges c
         LEFT JOIN user_challenge_progress ucp ON c.id = ucp.challenge_id AND ucp.user_id = $1
         WHERE c.is_active = true AND (c.end_date > NOW() OR ucp.status = 'active')
         ORDER BY c.type, c.end_date`,
        [userId]
      );

      const defaultChallenges = [...DAILY_CHALLENGES, ...WEEKLY_CHALLENGES].map(c => ({
        ...c,
        userProgress: activeChallenges.rows.find(ac => ac.id === c.id)?.current_progress || 0,
        userStatus: activeChallenges.rows.find(ac => ac.id === c.id)?.user_status || 'active',
        progress: Math.round(
          ((activeChallenges.rows.find(ac => ac.id === c.id)?.current_progress || 0) / c.target) * 100
        ),
      }));

      return reply.send({ challenges: defaultChallenges });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération' });
    }
  });

  fastify.post('/challenges/progress', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorisé' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).id;
      const { challengeId, progress } = request.body as any;

      const existing = await fastify.pg.query(
        'SELECT * FROM user_challenge_progress WHERE user_id = $1 AND challenge_id = $2',
        [userId, challengeId]
      );

      if (existing.rows.length === 0) {
        await fastify.pg.query(
          `INSERT INTO user_challenge_progress (user_id, challenge_id, current_progress)
           VALUES ($1, $2, $3)`,
          [userId, challengeId, progress]
        );
      } else {
        await fastify.pg.query(
          `UPDATE user_challenge_progress 
           SET current_progress = $1, 
               status = CASE WHEN current_progress >= (SELECT target FROM challenges WHERE id = $2) THEN 'completed' ELSE status END
           WHERE user_id = $3 AND challenge_id = $2`,
          [progress, challengeId, userId]
        );
      }

      return reply.send({ success: true, progress });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la mise à jour' });
    }
  });

  fastify.get('/leaderboard', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { type = 'global', limit = 10 } = request.query as any;

      let query: string;
      switch (type) {
        case 'weekly':
          query = 'SELECT * FROM leaderboard ORDER BY weekly_xp DESC LIMIT $1';
          break;
        case 'country':
          query = 'SELECT * FROM leaderboard ORDER BY country_rank ASC LIMIT $1';
          break;
        default:
          query = 'SELECT * FROM leaderboard ORDER BY total_xp DESC LIMIT $1';
      }

      const result = await fastify.pg.query(query, [limit]);

      const leaderboardWithUsers = await Promise.all(
        result.rows.map(async (entry, index) => {
          const user = await fastify.pg.query(
            'SELECT id, name, avatar_url FROM users WHERE id = $1',
            [entry.user_id]
          );
          return {
            ...entry,
            rank: index + 1,
            user: user.rows[0],
          };
        })
      );

      return reply.send({ leaderboard: leaderboardWithUsers });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération' });
    }
  });

  fastify.get('/leaderboard/me', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorisé' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).id;

      const entry = await fastify.pg.query(
        'SELECT * FROM leaderboard WHERE user_id = $1',
        [userId]
      );

      const globalRank = await fastify.pg.query(
        'SELECT COUNT(*) + 1 FROM leaderboard WHERE total_xp > (SELECT total_xp FROM leaderboard WHERE user_id = $1)',
        [userId]
      );

      return reply.send({
        myRank: parseInt(globalRank.rows[0].count) + 1,
        leaderboard: entry.rows[0] || null,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération' });
    }
  });

  fastify.get('/streak', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorisé' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).id;

      const progress = await fastify.pg.query(
        'SELECT streak_days, longest_streak FROM user_progress WHERE user_id = $1',
        [userId]
      );

      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      const todayLogin = await fastify.pg.query(
        'SELECT * FROM user_daily_logins WHERE user_id = $1 AND DATE(login_date) = $2',
        [userId, today]
      );

      const yesterdayLogin = await fastify.pg.query(
        'SELECT * FROM user_daily_logins WHERE user_id = $1 AND DATE(login_date) = $2',
        [userId, yesterday]
      );

      return reply.send({
        currentStreak: progress.rows[0]?.streak_days || 0,
        longestStreak: progress.rows[0]?.longest_streak || 0,
        loggedInToday: todayLogin.rows.length > 0,
        loggedInYesterday: yesterdayLogin.rows.length > 0,
        streakAtRisk: yesterdayLogin.rows.length === 0,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération' });
    }
  });

  fastify.post('/daily-login', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorisé' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).id;
      const today = new Date().toISOString().split('T')[0];

      const existingLogin = await fastify.pg.query(
        'SELECT * FROM user_daily_logins WHERE user_id = $1 AND DATE(login_date) = $2',
        [userId, today]
      );

      if (existingLogin.rows.length > 0) {
        return reply.send({ success: true, message: 'Déjà connecté aujourd\'hui', xpEarned: 0 });
      }

      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const yesterdayLogin = await fastify.pg.query(
        'SELECT * FROM user_daily_logins WHERE user_id = $1 AND DATE(login_date) = $2',
        [userId, yesterday]
      );

      let streakCount = 1;
      if (yesterdayLogin.rows.length > 0) {
        const lastStreak = await fastify.pg.query(
          'SELECT streak_count FROM user_daily_logins WHERE user_id = $1 ORDER BY login_date DESC LIMIT 1',
          [userId]
        );
        streakCount = (lastStreak.rows[0]?.streak_count || 0) + 1;
      }

      await fastify.pg.query(
        'INSERT INTO user_daily_logins (user_id, login_date, streak_count) VALUES ($1, NOW(), $2)',
        [userId, streakCount]
      );

      await fastify.pg.query(
        `UPDATE user_progress 
         SET streak_days = $1, 
             longest_streak = GREATEST(longest_streak, $1),
             last_activity_at = NOW(),
             total_xp = total_xp + $2,
             updated_at = NOW()
         WHERE user_id = $3`,
        [streakCount, XP_RULES.daily_login, userId]
      );

      let streakBonus = 0;
      if (streakCount > 1 && streakCount % 7 === 0) {
        streakBonus = XP_RULES.streak_bonus;
        await fastify.pg.query(
          'UPDATE user_progress SET total_xp = total_xp + $1 WHERE user_id = $2',
          [streakBonus, userId]
        );
      }

      return reply.send({
        success: true,
        streakCount,
        xpEarned: XP_RULES.daily_login + streakBonus,
        streakBonus: streakBonus > 0 ? `Bonus streak ${streakCount} jours: +${streakBonus} XP` : null,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de l\'enregistrement' });
    }
  });

  fastify.get('/levels', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ levels: LEVELS });
  });
}
