import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const generateCertSchema = z.object({
  enrollmentId: z.string().uuid(),
});

export async function certificateRoutes(fastify: FastifyInstance) {
  fastify.post('/generate', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorisé' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { enrollmentId } = generateCertSchema.parse(request.body);
      const userId = (request.user as any).id;

      const enrollmentResult = await fastify.pg.query(
        `SELECT e.*, c.title as course_title, c.thumbnail_url, u.name as user_name, u.email as user_email, cr.business_name as creator_name
         FROM enrollments e
         JOIN courses c ON c.id = e.course_id
         JOIN users u ON u.id = e.user_id
         JOIN creators cr ON cr.id = c.creator_id
         WHERE e.id = $1 AND e.user_id = $2 AND e.status = 'paid'`,
        [enrollmentId, userId]
      );

      if (enrollmentResult.rows.length === 0) {
        return reply.status(404).send({ error: 'Inscription non trouvée ou non validée' });
      }

      const enrollment = enrollmentResult.rows[0];

      if (enrollment.progress_percent < 100) {
        return reply.status(400).send({ error: 'Cours non terminé à 100%' });
      }

      const existingCert = await fastify.pg.query(
        'SELECT * FROM certificates WHERE enrollment_id = $1',
        [enrollmentId]
      );

      if (existingCert.rows.length > 0) {
        return reply.send({ certificate: existingCert.rows[0] });
      }

      const certificateNumber = `CERT-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const verificationCode = crypto.randomBytes(16).toString('hex');

      const pdfDir = path.join(process.cwd(), 'certificates');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }

      const pdfPath = path.join(pdfDir, `${certificateNumber}.pdf`);
      
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const writeStream = fs.createWriteStream(pdfPath);
      doc.pipe(writeStream);

      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
        .lineWidth(3)
        .stroke('#6366f1');

      doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
        .lineWidth(1)
        .stroke('#a855f7');

      doc.font('Helvetica-Bold');
      doc.fontSize(14);
      doc.fillColor('#6366f1');
      doc.text('SAVOIR-APP', 50, 80, { align: 'center', width: doc.page.width - 100 });

      doc.fontSize(36);
      doc.fillColor('#0f172a');
      doc.text('CERTIFICAT', 50, 120, { align: 'center', width: doc.page.width - 100 });

      doc.fontSize(18);
      doc.fillColor('#64748b');
      doc.text('DE RÉUSSITE', 50, 170, { align: 'center', width: doc.page.width - 100 });

      doc.moveDown(2);

      doc.fontSize(16);
      doc.fillColor('#64748b');
      doc.text(' Ceci certifie que', 50, 230, { align: 'center', width: doc.page.width - 100 });

      doc.fontSize(28);
      doc.fillColor('#0f172a');
      doc.text(enrollment.user_name, 50, 270, { align: 'center', width: doc.page.width - 100 });

      doc.moveDown();
      doc.fontSize(16);
      doc.fillColor('#64748b');
      doc.text('a successfully complété avec succès le cours', 50, 320, { align: 'center', width: doc.page.width - 100 });

      doc.fontSize(24);
      doc.fillColor('#6366f1');
      doc.text(enrollment.course_title, 50, 360, { align: 'center', width: doc.page.width - 100 });

      doc.moveDown(2);

      const completionDate = new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      doc.fontSize(14);
      doc.fillColor('#64748b');
      doc.text(`Délivré le ${completionDate}`, 50, 420, { align: 'center', width: doc.page.width - 100 });

      doc.moveDown();

      doc.fontSize(12);
      doc.fillColor('#94a3b8');
      doc.text(`Numéro de certificat: ${certificateNumber}`, 50, 460, { align: 'center', width: doc.page.width - 100 });
      doc.text(`Code de vérification: ${verificationCode}`, 50, 480, { align: 'center', width: doc.page.width - 100 });

      doc.fontSize(10);
      doc.text('Vérifiez ce certificat sur savoir-app.com/verify', 50, 510, { align: 'center', width: doc.page.width - 100 });

      doc.end();

      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', () => resolve());
        writeStream.on('error', reject);
      });

      const certResult = await fastify.pg.query(
        `INSERT INTO certificates (enrollment_id, certificate_number, verification_code, pdf_url)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [enrollmentId, certificateNumber, verificationCode, `/certificates/${certificateNumber}.pdf`]
      );

      return reply.send({
        success: true,
        certificate: certResult.rows[0],
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Données invalides' });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la génération du certificat' });
    }
  });

  fastify.get('/verify/:code', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { code } = request.params as { code: string };

      const result = await fastify.pg.query(
        `SELECT cert.*, e.user_id, c.title as course_title, u.name as user_name
         FROM certificates cert
         JOIN enrollments e ON e.id = cert.enrollment_id
         JOIN courses c ON c.id = e.course_id
         JOIN users u ON u.id = e.user_id
         WHERE cert.verification_code = $1`,
        [code]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Certificat non trouvé' });
      }

      const cert = result.rows[0];

      return reply.send({
        valid: true,
        certificate: {
          number: cert.certificate_number,
          courseTitle: cert.course_title,
          userName: cert.user_name,
          issuedAt: cert.issued_at,
          verificationCode: cert.verification_code,
        },
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la vérification' });
    }
  });

  fastify.get('/download/:id', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Non autorisé' });
      }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request.user as any).id;

      const result = await fastify.pg.query(
        `SELECT cert.*, e.user_id
         FROM certificates cert
         JOIN enrollments e ON e.id = cert.enrollment_id
         WHERE cert.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Certificat non trouvé' });
      }

      const cert = result.rows[0];

      if (cert.user_id !== userId) {
        return reply.status(403).send({ error: 'Accès non autorisé' });
      }

      const pdfPath = path.join(process.cwd(), 'certificates', `${cert.certificate_number}.pdf`);

      if (!fs.existsSync(pdfPath)) {
        return reply.status(404).send({ error: 'Fichier PDF non trouvé' });
      }

      const pdfBuffer = fs.readFileSync(pdfPath);

      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${cert.certificate_number}.pdf"`)
        .send(pdfBuffer);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors du téléchargement' });
    }
  });

  fastify.get('/my', {
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

      const result = await fastify.pg.query(
        `SELECT cert.*, c.title as course_title, c.thumbnail_url
         FROM certificates cert
         JOIN enrollments e ON e.id = cert.enrollment_id
         JOIN courses c ON c.id = e.course_id
         WHERE e.user_id = $1
         ORDER BY cert.issued_at DESC`,
        [userId]
      );

      return reply.send({ certificates: result.rows });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération' });
    }
  });
}
