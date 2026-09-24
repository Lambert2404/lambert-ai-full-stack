import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../lib/auth.js';
import { replyOk } from '../lib/envelope.js';
import { publicUser } from './auth.js';

const profileSchema = z.object({
  educationLevel: z.string().trim().max(120).optional().nullable(),
  institution: z.string().trim().max(160).optional().nullable(),
  program: z.string().trim().max(160).optional().nullable(),
  preferredLanguage: z.enum(['en', 'sw']).optional(),
  learningGoals: z.string().trim().max(1000).optional().nullable(),
  subjects: z.array(z.string()).max(50).optional(),
});

export async function userRoutes(app: FastifyInstance) {
  app.get('/api/users/me', { preHandler: authenticate }, async (request, reply) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: request.user!.id },
      include: { profile: true, userSubjects: { include: { subject: true } } },
    });
    const profile = user.profile;
    return replyOk(reply, {
      ...publicUser(user),
      profile: {
        userId: user.id,
        educationLevel: profile?.educationLevel ?? undefined,
        institution: profile?.institution ?? undefined,
        program: profile?.program ?? undefined,
        preferredLanguage: profile?.preferredLanguage ?? 'en',
        learningGoals: profile?.learningGoals ?? undefined,
        subjects: user.userSubjects.map((us) => us.subject.name),
      },
    });
  });

  app.patch('/api/users/me/profile', { preHandler: authenticate }, async (request, reply) => {
    const parsed = profileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        data: null,
        message: 'Invalid profile data',
        error: { code: 'VALIDATION_ERROR' },
      });
    }
    const d = parsed.data;

    const existing = await prisma.profile.findUnique({ where: { userId: request.user!.id } });
    const profile = await prisma.profile.upsert({
      where: { userId: request.user!.id },
      update: {
        ...(d.educationLevel !== undefined ? { educationLevel: d.educationLevel } : {}),
        ...(d.institution !== undefined ? { institution: d.institution } : {}),
        ...(d.program !== undefined ? { program: d.program } : {}),
        ...(d.preferredLanguage !== undefined ? { preferredLanguage: d.preferredLanguage } : {}),
        ...(d.learningGoals !== undefined ? { learningGoals: d.learningGoals } : {}),
      },
      create: {
        userId: request.user!.id,
        preferredLanguage: d.preferredLanguage ?? 'en',
        ...(d.educationLevel ? { educationLevel: d.educationLevel } : {}),
        ...(d.institution ? { institution: d.institution } : {}),
        ...(d.program ? { program: d.program } : {}),
        ...(d.learningGoals ? { learningGoals: d.learningGoals } : {}),
      },
    });

    if (d.subjects) {
      const subjects = await prisma.subject.findMany({ where: { id: { in: d.subjects } } });
      await prisma.$transaction([
        prisma.userSubject.deleteMany({ where: { userId: request.user!.id } }),
        prisma.userSubject.createMany({
          data: subjects.map((s) => ({ userId: request.user!.id, subjectId: s.id })) as never,
        }),
      ]);
    }

    void existing; // upsert handled both paths
    const subjects = d.subjects
      ? (await prisma.subject.findMany({ where: { userSubjects: { some: { userId: request.user!.id } } } })).map((s) => s.name)
      : [];

    return replyOk(reply, {
      userId: request.user!.id,
      educationLevel: profile.educationLevel ?? undefined,
      institution: profile.institution ?? undefined,
      program: profile.program ?? undefined,
      preferredLanguage: profile.preferredLanguage,
      learningGoals: profile.learningGoals ?? undefined,
      subjects,
    });
  });
}