import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

type AuthUser = {
  id: string;
  role: 'admin' | 'creator' | 'learner';
  creatorId?: string;
};

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const MAX_PDF_BYTES = 50 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm'];
const ALLOWED_PDF_TYPES = ['application/pdf', 'application/x-pdf', 'application/octet-stream'];
const ALLOWED_PDF_EXTENSIONS = ['.pdf'];
const CLOUDINARY_VIDEO_FOLDER = process.env.CLOUDINARY_VIDEO_FOLDER || 'courses/videos';

const cloudinarySignatureSchema = z.object({
  filename: z.string().min(1),
  size: z.number().int().positive().max(MAX_VIDEO_BYTES),
  contentType: z.string().min(1),
});

const deleteMediaSchema = z.object({
  publicId: z.string().min(1),
  resourceType: z.enum(['video', 'image', 'raw']).default('video'),
});

const playbackUrlSchema = z.object({
  publicId: z.string().min(1),
  quality: z.string().optional().default('auto'),
  format: z.string().optional().default('mp4'),
});

const localUploadDir = path.join(process.cwd(), 'uploads');

function hasCloudinaryConfig() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function extensionFromMime(mimetype: string) {
  if (mimetype === 'application/pdf') return '.pdf';
  const [, subtype = 'bin'] = mimetype.split('/');
  return `.${subtype.split('+')[0].replace(/[^a-z0-9]/gi, '') || 'bin'}`;
}

function contentTypeFromFilename(filename: string) {
  const extension = path.extname(filename).toLowerCase();
  if (extension === '.pdf') return 'application/pdf';
  if (extension === '.png') return 'image/png';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.webp') return 'image/webp';
  if (extension === '.mp4') return 'video/mp4';
  return 'application/octet-stream';
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

    if (user.role !== 'creator') {
      reply.status(403).send({ error: 'Acces reserve aux formateurs' });
      return null;
    }

    return user;
  } catch {
    reply.status(401).send({ error: 'Non autorise' });
    return null;
  }
}

async function requireMediaAccess(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  publicId: string
): Promise<AuthUser | null> {
  try {
    await request.jwtVerify();
    const user = request.user as AuthUser;

    const activeResult = await fastify.pg.query(
      'SELECT is_active FROM users WHERE id = $1',
      [user.id]
    );

    if (activeResult.rows.length === 0 || activeResult.rows[0].is_active !== true) {
      reply.status(403).send({ error: 'Compte inactif ou bloque' });
      return null;
    }

    if (user.role === 'admin') return user;

    const mediaResult = await fastify.pg.query(
      `SELECT c.creator_id,
              c.price_cfa,
              c.status,
              c.is_public,
              l.is_free AS lesson_is_free,
              e.id AS enrollment_id
       FROM lessons l
       JOIN modules m ON m.id = l.module_id
       JOIN courses c ON c.id = m.course_id
       LEFT JOIN enrollments e ON e.course_id = c.id AND e.user_id = $2 AND e.status = 'paid'
       WHERE l.media_public_id = $1`,
      [publicId, user.id]
    );

    if (mediaResult.rows.length === 0) {
      reply.status(404).send({ error: 'Media introuvable' });
      return null;
    }

    const media = mediaResult.rows[0];
    const isFreeCourse = Number(media.price_cfa || 0) <= 0;
    const canPreviewLesson = Boolean(media.lesson_is_free);
    const isPublishedPublic = media.status === 'published' && media.is_public === true;

    if (user.role === 'creator' && media.creator_id === user.creatorId) return user;
    if (user.role === 'learner' && media.enrollment_id) return user;
    if (user.role === 'learner' && isPublishedPublic && (isFreeCourse || canPreviewLesson)) return user;

    reply.status(403).send({ error: 'Paiement requis pour lire ce cours' });
    return null;
  } catch {
    reply.status(401).send({ error: 'Non autorise' });
    return null;
  }
}

async function requireLessonMediaAccess(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  lessonId: string
): Promise<{ user: AuthUser; lesson: any } | null> {
  try {
    await request.jwtVerify();
    const user = request.user as AuthUser;

    const activeResult = await fastify.pg.query(
      'SELECT is_active FROM users WHERE id = $1',
      [user.id]
    );

    if (activeResult.rows.length === 0 || activeResult.rows[0].is_active !== true) {
      reply.status(403).send({ error: 'Compte inactif ou bloque' });
      return null;
    }

    const lessonResult = await fastify.pg.query(
      `SELECT l.id,
              l.title,
              l.type,
              l.content_url,
              l.media_public_id,
              l.is_free AS lesson_is_free,
              c.creator_id,
              c.price_cfa,
              c.status,
              c.is_public,
              e.id AS enrollment_id
       FROM lessons l
       JOIN modules m ON m.id = l.module_id
       JOIN courses c ON c.id = m.course_id
       LEFT JOIN enrollments e ON e.course_id = c.id AND e.user_id = $2 AND e.status = 'paid'
       WHERE l.id = $1`,
      [lessonId, user.id]
    );

    if (lessonResult.rows.length === 0) {
      reply.status(404).send({ error: 'Lecon introuvable' });
      return null;
    }

    const lesson = lessonResult.rows[0];
    const isFreeCourse = Number(lesson.price_cfa || 0) <= 0;
    const canPreviewLesson = Boolean(lesson.lesson_is_free);
    const isPublishedPublic = lesson.status === 'published' && lesson.is_public === true;

    if (user.role === 'admin') return { user, lesson };
    if (user.role === 'creator' && lesson.creator_id === user.creatorId) return { user, lesson };
    if (user.role === 'learner' && lesson.enrollment_id) return { user, lesson };
    if (user.role === 'learner' && isPublishedPublic && (isFreeCourse || canPreviewLesson)) return { user, lesson };

    reply.status(403).send({ error: 'Paiement requis pour lire ce cours' });
    return null;
  } catch {
    reply.status(401).send({ error: 'Non autorise' });
    return null;
  }
}

function validateVideoInput(filename: string, contentType: string) {
  const extension = path.extname(filename).toLowerCase();
  return ALLOWED_VIDEO_TYPES.includes(contentType) && ALLOWED_VIDEO_EXTENSIONS.includes(extension);
}

function isPdfUpload(filename: string, mimetype: string) {
  const extension = path.extname(filename).toLowerCase();
  return ALLOWED_PDF_EXTENSIONS.includes(extension) && ALLOWED_PDF_TYPES.includes(mimetype);
}

async function fetchCloudinaryRawBuffer(publicId: string) {
  if (!hasCloudinaryConfig()) return null;

  try {
    const resource = await cloudinary.api.resource(publicId, { resource_type: 'raw' }) as any;
    const remoteResponse = await fetch(resource.secure_url);
    if (!remoteResponse.ok) return null;
    const buffer = Buffer.from(await remoteResponse.arrayBuffer());
    return {
      buffer,
      contentType: remoteResponse.headers.get('content-type') || 'application/pdf',
      filename: path.basename(resource.public_id || publicId),
    };
  } catch {
    return null;
  }
}

function getCloudinaryThumbnailUrl(publicId: string) {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    secure: true,
    format: 'jpg',
    transformation: [
      { start_offset: 'auto', width: 640, height: 360, crop: 'fill', quality: 'auto' },
    ],
  });
}

export async function mediaRoutes(fastify: FastifyInstance) {
  fastify.post('/cloudinary/signature', {
    preHandler: [requireCreatorOrAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!hasCloudinaryConfig()) {
        return reply.status(503).send({ error: 'Cloudinary is not configured' });
      }

      const data = cloudinarySignatureSchema.parse(request.body);
      if (!validateVideoInput(data.filename, data.contentType)) {
        return reply.status(400).send({
          error: 'Format video non supporte. Formats autorises: mp4, mov, webm',
        });
      }

      const timestamp = Math.round(Date.now() / 1000);
      const publicId = crypto.randomUUID();
      const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
      const deliveryType = process.env.CLOUDINARY_VIDEO_DELIVERY_TYPE === 'authenticated' ? 'authenticated' : 'upload';
      const uploadParams: Record<string, string | number | boolean> = {
        timestamp,
        folder: CLOUDINARY_VIDEO_FOLDER,
        public_id: publicId,
        overwrite: false,
        eager: 'sp_auto/f_m3u8|q_auto,f_mp4|w_640,h_360,c_fill,q_auto,f_jpg',
        eager_async: true,
        quality_analysis: true,
        type: deliveryType,
      };

      if (uploadPreset) {
        uploadParams.upload_preset = uploadPreset;
      }

      const signature = cloudinary.utils.api_sign_request(
        uploadParams,
        process.env.CLOUDINARY_API_SECRET as string
      );

      return reply.send({
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        resourceType: 'video',
        uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`,
        maxBytes: MAX_VIDEO_BYTES,
        allowedFormats: ['mp4', 'mov', 'webm'],
        params: {
          ...uploadParams,
          signature,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Donnees invalides', details: error.errors });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur signature Cloudinary' });
    }
  });

  fastify.post('/upload', {
    preHandler: [requireCreatorOrAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file();
      
      if (!data) {
        return reply.status(400).send({ error: 'Aucun fichier envoye' });
      }

      const { mimetype, file, filename } = data;
      let resourceType: 'video' | 'image' | 'raw' | 'auto' = 'auto';
      
      if (mimetype.startsWith('video/')) resourceType = 'video';
      else if (mimetype.startsWith('image/')) resourceType = 'image';
      else if (mimetype.startsWith('audio/')) resourceType = 'video';
      else resourceType = 'raw';

      const chunks: Buffer[] = [];
      for await (const chunk of file) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);

      if (isPdfUpload(filename, mimetype) && buffer.length > MAX_PDF_BYTES) {
        return reply.status(400).send({ error: 'Le PDF depasse la limite de 50MB' });
      }

      if (path.extname(filename).toLowerCase() === '.pdf' && !isPdfUpload(filename, mimetype)) {
        return reply.status(400).send({ error: 'Format PDF non supporte' });
      }

      if (!hasCloudinaryConfig()) {
        await fs.mkdir(localUploadDir, { recursive: true });
        const filename = `${crypto.randomUUID()}${extensionFromMime(mimetype)}`;
        const filePath = path.join(localUploadDir, filename);
        await fs.writeFile(filePath, buffer);

        const host = request.headers.host || 'localhost:3001';
        const forwardedProtocol = request.headers['x-forwarded-proto'];
        const protocol = Array.isArray(forwardedProtocol) ? forwardedProtocol[0] : forwardedProtocol || 'http';
        const url = `${protocol}://${host}/api/media/files/${filename}`;

        return reply.send({
          success: true,
          media: {
            publicId: filename,
            url,
            thumbnailUrl: url,
            format: path.extname(filename).slice(1),
            bytes: buffer.length,
          },
        });
      }

      const base64 = buffer.toString('base64');
      const dataUri = `data:${mimetype};base64,${base64}`;

      const result: any = resourceType === 'raw'
        ? await cloudinary.uploader.upload(dataUri, {
          resource_type: 'raw',
          folder: 'courses/documents',
          use_filename: true,
          unique_filename: true,
          type: 'upload',
        })
        : await cloudinary.uploader.upload_large(dataUri, {
          resource_type: resourceType,
          folder: resourceType === 'video' ? CLOUDINARY_VIDEO_FOLDER : 'courses/assets',
          chunk_size: 6000000,
          eager: resourceType === 'video' ? [
            { streaming_profile: 'auto', format: 'm3u8' },
            { quality: 'auto', fetch_format: 'mp4' },
            { quality: 'auto:low', fetch_format: 'mp4', width: 480 },
          ] : undefined,
          eager_async: true,
          transformation: resourceType === 'video' ? [
            { quality: 'auto', fetch_format: 'mp4' },
          ] : undefined,
        });

      return reply.send({
        success: true,
        media: {
          publicId: result.public_id,
          url: result.secure_url,
          thumbnailUrl: resourceType === 'video' ? getCloudinaryThumbnailUrl(result.public_id) : result.eager?.[1]?.secure_url || result.secure_url,
          format: result.format || path.extname(filename).slice(1) || resourceType,
          duration: result.duration,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
        },
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ 
        error: 'Erreur lors de l\'upload',
        details: error.message 
      });
    }
  });

  fastify.post('/upload-legacy-disabled', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorisé' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file();
      
      if (!data) {
        return reply.status(400).send({ error: 'Aucun fichier envoyé' });
      }

      const { mimetype, file } = data;
      let resourceType: 'video' | 'image' | 'raw' | 'auto' = 'auto';
      
      if (mimetype.startsWith('video/')) resourceType = 'video';
      else if (mimetype.startsWith('image/')) resourceType = 'image';
      else if (mimetype.startsWith('audio/')) resourceType = 'video';
      else resourceType = 'raw';

      const chunks: Buffer[] = [];
      for await (const chunk of file) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);
      if (!hasCloudinaryConfig()) {
        await fs.mkdir(localUploadDir, { recursive: true });
        const filename = `${crypto.randomUUID()}${extensionFromMime(mimetype)}`;
        const filePath = path.join(localUploadDir, filename);
        await fs.writeFile(filePath, buffer);

        const host = request.headers.host || 'localhost:3001';
        const forwardedProtocol = request.headers['x-forwarded-proto'];
        const protocol = Array.isArray(forwardedProtocol) ? forwardedProtocol[0] : forwardedProtocol || 'http';
        const url = `${protocol}://${host}/api/media/files/${filename}`;

        return reply.send({
          success: true,
          media: {
            publicId: filename,
            url,
            thumbnailUrl: url,
            format: path.extname(filename).slice(1),
            bytes: buffer.length,
          },
        });
      }

      const base64 = buffer.toString('base64');
      const dataUri = `data:${mimetype};base64,${base64}`;

      const result: any = await cloudinary.uploader.upload_large(dataUri, {
        resource_type: resourceType,
        folder: 'savoir-app',
        chunk_size: 6000000,
        eager: resourceType === 'video' ? [
          { quality: 'auto', fetch_format: 'mp4' },
          { quality: 'auto:low', fetch_format: 'mp4', width: 480 },
        ] : undefined,
        eager_async: true,
        transformation: resourceType === 'video' ? [
          { quality: 'auto', fetch_format: 'mp4' },
        ] : undefined,
      });

      return reply.send({
        success: true,
        media: {
          publicId: result.public_id,
          url: result.secure_url,
          thumbnailUrl: result.eager?.[1]?.secure_url || result.secure_url,
          format: result.format,
          duration: result.duration,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
        },
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ 
        error: 'Erreur lors de l\'upload',
        details: error.message 
      });
    }
  });

  fastify.get('/files/:filename', async (request: FastifyRequest, reply: FastifyReply) => {
    const { filename } = request.params as { filename: string };
    const safeFilename = path.basename(filename);
    const filePath = path.join(localUploadDir, safeFilename);

    try {
      const stat = await fs.stat(filePath);
      const contentType = contentTypeFromFilename(safeFilename);
      const range = request.headers.range;

      reply
        .header('Accept-Ranges', 'bytes')
        .header('Content-Type', contentType)
        .header('Content-Disposition', `inline; filename="${safeFilename}"`);

      if (range) {
        const [startRaw, endRaw] = range.replace(/bytes=/, '').split('-');
        const start = Number.parseInt(startRaw, 10);
        const end = endRaw ? Number.parseInt(endRaw, 10) : stat.size - 1;

        if (Number.isNaN(start) || Number.isNaN(end) || start >= stat.size || end >= stat.size) {
          return reply
            .header('Content-Range', `bytes */${stat.size}`)
            .status(416)
            .send();
        }

        return reply
          .header('Content-Range', `bytes ${start}-${end}/${stat.size}`)
          .header('Content-Length', end - start + 1)
          .status(206)
          .send(createReadStream(filePath, { start, end }));
      }

      return reply
        .header('Content-Length', stat.size)
        .send(createReadStream(filePath));
    } catch {
      return reply.status(404).send({ error: 'Fichier introuvable' });
    }
  });

  fastify.get('/lessons/:lessonId/document', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { lessonId } = request.params as { lessonId: string };
      const access = await requireLessonMediaAccess(fastify, request, reply, lessonId);
      if (!access) return;

      const lesson = access.lesson;
      if (lesson.type !== 'pdf' && lesson.type !== 'image') {
        return reply.status(400).send({ error: 'Document indisponible pour cette lecon' });
      }

      if (!lesson.content_url) {
        return reply.status(404).send({ error: 'Fichier introuvable' });
      }

      const urlPathname = (() => {
        try {
          return new URL(lesson.content_url).pathname;
        } catch {
          return 'document.pdf';
        }
      })();
      const safeName = path.basename(lesson.media_public_id || urlPathname || 'document.pdf');
      const localPath = lesson.media_public_id
        ? path.join(localUploadDir, path.basename(lesson.media_public_id))
        : null;

      if (localPath) {
        try {
          const stat = await fs.stat(localPath);
          return reply
            .header('Content-Type', contentTypeFromFilename(safeName))
            .header('Content-Disposition', `inline; filename="${safeName}"`)
            .header('Content-Length', stat.size)
            .send(createReadStream(localPath));
        } catch {
          // Continue with Cloudinary/API fallback.
        }
      }

      const cloudinaryRaw = lesson.media_public_id
        ? await fetchCloudinaryRawBuffer(lesson.media_public_id)
        : null;

      if (cloudinaryRaw) {
        return reply
          .header('Content-Type', cloudinaryRaw.contentType.includes('pdf') ? cloudinaryRaw.contentType : 'application/pdf')
          .header('Content-Disposition', `inline; filename="${cloudinaryRaw.filename || safeName}.pdf"`)
          .header('Content-Length', cloudinaryRaw.buffer.length)
          .send(cloudinaryRaw.buffer);
      }

      const remoteResponse = await fetch(lesson.content_url);
      if (!remoteResponse.ok) {
        return reply.status(404).send({ error: 'Fichier distant introuvable' });
      }

      const arrayBuffer = await remoteResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const remoteContentType = remoteResponse.headers.get('content-type') || contentTypeFromFilename(safeName);

      return reply
        .header('Content-Type', remoteContentType.includes('pdf') ? remoteContentType : 'application/pdf')
        .header('Content-Disposition', `inline; filename="${safeName}.pdf"`)
        .header('Content-Length', buffer.length)
        .send(buffer);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Ouverture du document impossible' });
    }
  });

  fastify.post('/delete', {
    preHandler: [requireCreatorOrAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = deleteMediaSchema.parse(request.body);

      if (!hasCloudinaryConfig()) {
        const safeFilename = path.basename(data.publicId);
        await fs.unlink(path.join(localUploadDir, safeFilename)).catch(() => undefined);
        return reply.send({ success: true, message: 'Fichier supprime' });
      }

      const result = await cloudinary.uploader.destroy(data.publicId, {
        resource_type: data.resourceType,
        invalidate: true,
      });

      return reply.send({
        success: result.result === 'ok' || result.result === 'not found',
        message: result.result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Donnees invalides', details: error.errors });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la suppression' });
    }
  });

  fastify.post('/playback-url', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = playbackUrlSchema.parse(request.body);
      const user = await requireMediaAccess(fastify, request, reply, data.publicId);
      if (!user) return;

      const deliveryType = process.env.CLOUDINARY_VIDEO_DELIVERY_TYPE === 'authenticated' ? 'authenticated' : 'upload';
      const url = cloudinary.url(data.publicId, {
        resource_type: 'video',
        type: deliveryType,
        secure: true,
        sign_url: deliveryType === 'authenticated',
        transformation: [
          { quality: data.quality, fetch_format: data.format },
        ],
      });

      return reply.send({
        url,
        thumbnailUrl: getCloudinaryThumbnailUrl(data.publicId),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Donnees invalides', details: error.errors });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la generation URL' });
    }
  });

  fastify.post('/upload/chunked', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorisé' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { chunks, filename, mimetype } = request.body as any;
      
      if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
        return reply.status(400).send({ error: 'Aucun chunk reçu' });
      }

      const buffer = Buffer.concat(chunks.map((c: string) => Buffer.from(c, 'base64')));
      const dataUri = `data:${mimetype};base64,${buffer.toString('base64')}`;

      const result: any = await cloudinary.uploader.upload_large(dataUri, {
        resource_type: 'video',
        folder: 'savoir-app',
        chunk_size: 6000000,
      });

      return reply.send({
        success: true,
        media: {
          publicId: result.public_id,
          url: result.secure_url,
          thumbnailUrl: result.secure_url,
          format: result.format,
          duration: result.duration,
          bytes: result.bytes,
        },
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ 
        error: 'Erreur lors de l\'upload chunké',
        details: error.message 
      });
    }
  });

  fastify.delete('/delete/:publicId', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorisé' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { publicId } = request.params as { publicId: string };
      
      const result = await cloudinary.uploader.destroy(publicId);
      
      return reply.send({
        success: result.result === 'ok',
        message: result.result === 'ok' ? 'Fichier supprimé' : 'Erreur lors de la suppression',
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la suppression' });
    }
  });

  fastify.get('/signed-url/:publicId', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorisé' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { publicId } = request.params as { publicId: string };
      const { quality = 'auto', format = 'mp4' } = request.query as any;

      const timestamp = Math.round(new Date().getTime() / 1000);
      const folder = 'savoir-app';
      const source = `${publicId}`;
      
      const signature = crypto
        .createHash('sha256')
        .update(`folder=${folder}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`)
        .digest('hex');

      const signedUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/v${timestamp}/${folder}/${publicId}?quality=${quality}&fetch_format=${format}&signature=${signature}&api_key=${process.env.CLOUDINARY_API_KEY}`;

      return reply.send({ url: signedUrl });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la génération de l\'URL' });
    }
  });

  fastify.post('/generate-watermark', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorisé' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { publicId, watermarkText, userId } = request.body as any;

      if (!publicId || !watermarkText) {
        return reply.status(400).send({ error: 'Paramètres manquants' });
      }

      const result = await cloudinary.uploader.upload(
        `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/v1/savoir-app/${publicId}`,
        {
          resource_type: 'video',
          transformation: [
            {
              overlay: {
                font_family: 'Arial',
                font_size: 24,
                font_color: 'white',
                text: watermarkText,
              },
              gravity: 'south',
              y: 30,
            },
            {
              overlay: {
                font_family: 'Arial',
                font_size: 16,
                font_color: 'white',
                text: `ID: ${userId}`,
              },
              gravity: 'north',
              y: 20,
            },
          ],
          eager: [{ quality: 'auto', fetch_format: 'mp4' }],
          eager_async: true,
        }
      );

      return reply.send({
        success: true,
        watermarkedUrl: result.secure_url,
        publicId: result.public_id,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors du watermarking' });
    }
  });

  fastify.get('/video-stream/:publicId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { publicId } = request.params as { publicId: string };
      const range = request.headers.range;
      
      const result = await cloudinary.api.resource(publicId, {
        resource_type: 'video',
        image_metadata: true,
      });

      if (!range) {
        return reply
          .header('Content-Length', result.bytes)
          .header('Content-Type', 'video/mp4')
          .send(await fetch(result.secure_url));
      }

      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : result.bytes - 1;
      const chunksize = end - start + 1;

      return reply
        .header('Content-Range', `bytes ${start}-${end}/${result.bytes}`)
        .header('Accept-Ranges', 'bytes')
        .header('Content-Length', chunksize)
        .header('Content-Type', 'video/mp4')
        .status(206);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors du streaming' });
    }
  });
}
