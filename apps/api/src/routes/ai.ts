import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

type AuthUser = {
  id: string;
  role: 'admin' | 'creator' | 'learner';
  creatorId?: string;
};

type CourseContext = {
  course: {
    id: string;
    title: string;
    short_description?: string | null;
    description?: string | null;
    status: 'draft' | 'published' | 'archived';
    is_public: boolean;
    price_cfa: number;
    creator_id: string;
    category?: string | null;
    difficulty?: 'beginner' | 'intermediate' | 'advanced' | null;
    language?: string | null;
  };
  text: string;
  contentChars: number;
  detailedContentChars: number;
  sourceQuality: 'course_content' | 'course_metadata';
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

const courseIdParamsSchema = z.object({
  courseId: z.string().uuid('Identifiant du cours invalide'),
});

const assistantModeSchema = z.enum([
  'summary',
  'explain',
  'revision',
  'examples',
  'announcement',
  'course_plan',
]);

const assistantRequestSchema = z.object({
  prompt: z.string().trim().min(3, 'La demande est trop courte').max(1200, 'La demande est trop longue'),
  mode: assistantModeSchema.default('explain'),
});

const generateQuizRequestSchema = z.object({
  questionCount: z.number().int().min(5).max(10).default(5),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  moduleId: z.string().uuid().optional(),
});

const generatedQuestionSchema = z.object({
  type: z.enum(['qcm', 'open']).default('qcm'),
  question: z.string().trim().min(8),
  options: z.array(z.string().trim().min(1)).length(4),
  correctAnswer: z.string().trim().min(1),
  explanation: z.string().trim().min(8),
});

const generatedQuizSchema = z.object({
  title: z.string().trim().min(3).max(160),
  questions: z.array(generatedQuestionSchema).min(5).max(10),
});

function validationErrorPayload(error: z.ZodError) {
  return {
    error: 'Validation error',
    details: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

function serverErrorPayload(error: unknown) {
  return {
    error: 'Server error',
    ...(process.env.NODE_ENV !== 'production' && error instanceof Error
      ? { details: [{ message: error.message }] }
      : {}),
  };
}

async function requireActiveUser(request: FastifyRequest, reply: FastifyReply): Promise<AuthUser | null> {
  try {
    await request.jwtVerify();
    const user = request.user as AuthUser;

    const activeResult = await request.server.pg.query(
      'SELECT is_active FROM users WHERE id = $1',
      [user.id],
    );

    if (activeResult.rows.length === 0 || activeResult.rows[0].is_active !== true) {
      reply.status(403).send({ error: 'Compte inactif ou bloque' });
      return null;
    }

    return user;
  } catch {
    reply.status(401).send({ error: 'Unauthorized' });
    return null;
  }
}

async function getCourseContext(
  fastify: FastifyInstance,
  courseId: string,
  moduleId?: string,
): Promise<CourseContext | null> {
  const courseResult = await fastify.pg.query(
    `SELECT id, title, short_description, description, status, is_public, price_cfa, creator_id,
            category, difficulty, language
     FROM courses
     WHERE id = $1`,
    [courseId],
  );

  if (courseResult.rows.length === 0) return null;
  const course = courseResult.rows[0];

  const modulesResult = await fastify.pg.query(
    `SELECT id, title, description, order_index
     FROM modules
     WHERE course_id = $1
       AND ($2::uuid IS NULL OR id = $2::uuid)
     ORDER BY order_index`,
    [courseId, moduleId || null],
  );

  if (moduleId && modulesResult.rows.length === 0) {
    return null;
  }

  const lessonsResult = await fastify.pg.query(
    `SELECT l.id, l.module_id, l.title, l.type, l.description, l.content, l.order_index
     FROM lessons l
     JOIN modules m ON m.id = l.module_id
     WHERE m.course_id = $1
       AND ($2::uuid IS NULL OR m.id = $2::uuid)
     ORDER BY m.order_index, l.order_index`,
    [courseId, moduleId || null],
  );

  const difficultyLabel: Record<string, string> = {
    beginner: 'debutant',
    intermediate: 'intermediaire',
    advanced: 'avance',
  };

  const lines: string[] = [
    `Titre du cours: ${course.title}`,
    course.category ? `Categorie: ${course.category}` : '',
    course.difficulty ? `Niveau du cours: ${difficultyLabel[course.difficulty] || course.difficulty}` : '',
    course.language ? `Langue du cours: ${course.language}` : '',
    course.short_description ? `Resume court: ${course.short_description}` : '',
    course.description ? `Description: ${course.description}` : '',
  ].filter(Boolean);

  let contentChars = [course.title, course.category, course.difficulty, course.short_description, course.description]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .trim().length;
  let detailedContentChars = [course.short_description, course.description]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .trim().length;

  for (const module of modulesResult.rows) {
    lines.push('');
    lines.push(`Module: ${module.title}`);
    if (module.description) {
      lines.push(`Description du module: ${module.description}`);
      contentChars += String(module.description).length;
      detailedContentChars += String(module.description).length;
    }

    for (const lesson of lessonsResult.rows.filter((item) => item.module_id === module.id)) {
      lines.push(`Lecon (${lesson.type}): ${lesson.title}`);
      if (lesson.description) {
        lines.push(`Description de la lecon: ${lesson.description}`);
        contentChars += String(lesson.description).length;
        detailedContentChars += String(lesson.description).length;
      }
      if (lesson.content) {
        lines.push(`Contenu de la lecon: ${lesson.content}`);
        contentChars += String(lesson.content).length;
        detailedContentChars += String(lesson.content).length;
      }
    }
  }

  const text = lines.join('\n').slice(0, 28000);
  return {
    course,
    text,
    contentChars,
    detailedContentChars,
    sourceQuality: detailedContentChars >= 120 ? 'course_content' : 'course_metadata',
  };
}

async function creatorOwnsCourse(fastify: FastifyInstance, user: AuthUser, courseId: string) {
  if (user.role !== 'creator' || !user.creatorId) return false;

  const result = await fastify.pg.query(
    'SELECT id FROM courses WHERE id = $1 AND creator_id = $2',
    [courseId, user.creatorId],
  );

  return result.rows.length > 0;
}

async function userCanUseAssistant(fastify: FastifyInstance, user: AuthUser, context: CourseContext) {
  if (await creatorOwnsCourse(fastify, user, context.course.id)) return true;
  if (user.role !== 'learner') return false;
  if (context.course.status !== 'published' || context.course.is_public !== true) return false;
  if (Number(context.course.price_cfa || 0) <= 0) return true;

  const enrollmentResult = await fastify.pg.query(
    'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2 AND status = $3 LIMIT 1',
    [user.id, context.course.id, 'paid'],
  );

  return enrollmentResult.rows.length > 0;
}

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (!apiKey) {
    return null;
  }
  return { apiKey, model };
}

async function callGemini(
  prompt: string,
  options: { json?: boolean; temperature?: number; maxOutputTokens?: number } = {},
) {
  const config = getGeminiConfig();
  if (!config) {
    const error = new Error('Gemini is not configured');
    error.name = 'GeminiConfigError';
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.apiKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: options.temperature ?? 0.2,
            maxOutputTokens: options.maxOutputTokens ?? 1800,
            ...(options.json ? { responseMimeType: 'application/json' } : {}),
          },
        }),
      },
    );

    const payload = (await response.json().catch(() => null)) as GeminiResponse | null;

    if (!response.ok) {
      throw new Error(payload?.error?.message || 'Gemini request failed');
    }

    const text = payload?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('\n')
      .trim();

    if (!text) {
      throw new Error('Gemini returned an empty response');
    }

    return { text, model: config.model };
  } finally {
    clearTimeout(timeout);
  }
}

function parseJsonObject(text: string) {
  const trimmed = text.trim()
    .replace(/^\`\`\`json/i, '')
    .replace(/^\`\`\`/i, '')
    .replace(/\`\`\`$/i, '')
    .trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end < start) {
    throw new Error('La reponse IA ne contient pas un JSON valide');
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}

function buildQuizPrompt(context: CourseContext, questionCount: number, difficulty?: string) {
  const selectedDifficulty = difficulty || context.course.difficulty || 'intermediate';
  const sourceInstruction = context.sourceQuality === 'course_content'
    ? 'Base-toi prioritairement sur les descriptions, modules et lecons fournis.'
    : 'Le cours est peu fourni: base-toi sur le titre, la description courte/complete, la categorie et le niveau du cours. Reste coherent avec ce cadrage et ne pretends pas citer une lecon detaillee absente.';

  return [
    'Tu es une IA pedagogique integree dans une plateforme de gestion de cours.',
    'MISSION: generer un quiz pedagogique a partir des informations du cours fournies.',
    'REGLES ABSOLUES:',
    '- Utilise le titre, la description, la categorie, le niveau et les lecons disponibles comme contexte autorise.',
    '- Si le cours est peu fourni, genere un quiz d introduction ou de diagnostic adapte au niveau du cours.',
    '- Ne pretends jamais qu une information vient d une lecon si elle n est pas fournie.',
    '- Les questions doivent aider a comprendre, reviser et evaluer proprement.',
    '- Langue: francais professionnel et clair.',
    `- Source disponible: ${sourceInstruction}`,
    '',
    'FORMAT DE SORTIE: JSON strict uniquement, sans markdown.',
    '{',
    '  "title": "Titre court du quiz",',
    '  "questions": [',
    '    {',
    '      "type": "qcm",',
    '      "question": "Question claire",',
    '      "options": ["A", "B", "C", "D"],',
    '      "correctAnswer": "Le texte exact de la bonne option",',
    '      "explanation": "Courte explication basee sur le cours"',
    '    }',
    '  ]',
    '}',
    '',
    `CONTRAINTE: genere exactement ${questionCount} QCM, chaque QCM avec 4 choix.`,
    `Niveau de difficulte: ${selectedDifficulty}.`,
    '',
    'CONTENU_DU_COURS:',
    context.text,
  ].join('\n');
}

function buildAssistantPrompt(context: CourseContext, userPrompt: string, mode: string) {
  const sourceInstruction = context.sourceQuality === 'course_content'
    ? 'Tu peux t appuyer sur les descriptions, modules et lecons fournis.'
    : 'Le cours est peu fourni: tu peux t appuyer sur le titre, la description courte/complete, la categorie et le niveau du cours. Signale sobrement que la reponse est construite a partir du cadrage disponible si c est utile.';

  return [
    'Tu es une IA pedagogique integree dans une plateforme de gestion de cours.',
    'Tu aides les formateurs et les etudiants a partir des informations du cours fournies.',
    '',
    'REGLES ABSOLUES:',
    '- Utilise le titre, la description, la categorie, le niveau et les lecons disponibles comme contexte autorise.',
    '- Si le cours est peu fourni, reponds comme un tuteur pedagogique en restant coherent avec le cadrage du cours.',
    '- Ne pretends jamais disposer d un contenu detaille qui n est pas fourni.',
    '- Ne pas encourager la triche, ne pas modifier de notes officielles, ne pas produire de contenu dangereux.',
    '- Reponds dans la langue de la demande utilisateur.',
    '- Style professionnel, clair, structure et pedagogique.',
    `- Source disponible: ${sourceInstruction}`,
    '',
    `Mode de travail: ${mode}.`,
    `Demande utilisateur: ${userPrompt}`,
    '',
    'CONTENU_DU_COURS:',
    context.text,
  ].join('\n');
}

function isForbiddenEducationalRequest(prompt: string) {
  return /modifier\s+(ma\s+)?note|changer\s+(ma\s+)?note|tricher|donne-moi\s+les\s+reponses\s+officielles/i.test(prompt);
}

export async function aiRoutes(fastify: FastifyInstance) {
  fastify.post('/courses/:courseId/quiz', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireActiveUser(request, reply);
      if (!user) return;

      const { courseId } = courseIdParamsSchema.parse(request.params);
      const data = generateQuizRequestSchema.parse(request.body);

      if (!(await creatorOwnsCourse(fastify, user, courseId))) {
        return reply.status(403).send({ error: 'Generation IA reservee au formateur proprietaire du cours' });
      }

      const context = await getCourseContext(fastify, courseId, data.moduleId);
      if (!context) {
        return reply.status(404).send({ error: 'Cours ou module introuvable' });
      }
      const prompt = buildQuizPrompt(context, data.questionCount, data.difficulty);
      const generated = await callGemini(prompt, { json: true, temperature: 0.15, maxOutputTokens: 2600 });
      const quiz = generatedQuizSchema.parse(parseJsonObject(generated.text));

      return reply.send({
        quiz,
        model: generated.model,
        groundedIn: {
          courseId,
          moduleId: data.moduleId || null,
          contentChars: context.contentChars,
          detailedContentChars: context.detailedContentChars,
          sourceQuality: context.sourceQuality,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send(validationErrorPayload(error));
      }
      if (error instanceof Error && error.name === 'GeminiConfigError') {
        return reply.status(503).send({ error: 'Assistant IA non configure. Contactez l administrateur.' });
      }
      request.log.error(error);
      return reply.status(502).send({ error: 'Assistant IA momentanement indisponible. Reessayez dans un instant.' });
    }
  });

  fastify.post('/courses/:courseId/assistant', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await requireActiveUser(request, reply);
      if (!user) return;

      const { courseId } = courseIdParamsSchema.parse(request.params);
      const data = assistantRequestSchema.parse(request.body);

      if (user.role === 'learner' && ['announcement', 'course_plan'].includes(data.mode)) {
        return reply.status(403).send({ error: 'Cette action IA est reservee au formateur.' });
      }
      if (isForbiddenEducationalRequest(data.prompt)) {
        return reply.status(400).send({ error: 'Demande refusee: l IA ne peut pas aider a tricher ou modifier des notes.' });
      }

      const context = await getCourseContext(fastify, courseId);
      if (!context) {
        return reply.status(404).send({ error: 'Cours introuvable' });
      }
      if (!(await userCanUseAssistant(fastify, user, context))) {
        return reply.status(403).send({ error: 'Assistant indisponible pour ce cours' });
      }
      const prompt = buildAssistantPrompt(context, data.prompt, data.mode);
      const generated = await callGemini(prompt, { temperature: 0.25, maxOutputTokens: 1600 });

      const messages = [
        { role: 'user', content: data.prompt, timestamp: new Date().toISOString() },
        { role: 'assistant', content: generated.text, timestamp: new Date().toISOString() },
      ];

      fastify.pg.query(
        `INSERT INTO ai_conversations (user_id, course_id, messages, context)
         VALUES ($1, $2, $3::jsonb, $4)`,
        [user.id, courseId, JSON.stringify(messages), `mode=${data.mode};contentChars=${context.contentChars};sourceQuality=${context.sourceQuality}`],
      ).catch((error) => {
        fastify.log.warn({ err: error }, 'Unable to save AI conversation');
      });

      return reply.send({
        answer: generated.text,
        model: generated.model,
        groundedIn: {
          courseId,
          contentChars: context.contentChars,
          detailedContentChars: context.detailedContentChars,
          sourceQuality: context.sourceQuality,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send(validationErrorPayload(error));
      }
      if (error instanceof Error && error.name === 'GeminiConfigError') {
        return reply.status(503).send({ error: 'Assistant IA non configure. Contactez l administrateur.' });
      }
      request.log.error(error);
      return reply.status(502).send({ error: 'Assistant IA momentanement indisponible. Reessayez dans un instant.' });
    }
  });
}
