import type { FastifyInstance } from 'fastify';
import { authenticate } from '../lib/auth.js';
import { replyOk } from '../lib/envelope.js';
import {
  getProgressSummary,
  getSubjectProgress,
  getStudyTime,
  getWeakTopics,
  getRecommendations,
  getGamification,
  dismissRecommendation,
} from '../services/progress.js';

export async function progressRoutes(app: FastifyInstance) {
  app.get('/api/progress/summary', { preHandler: authenticate }, async (request, reply) => {
    return replyOk(reply, await getProgressSummary(request.user!));
  });

  app.get('/api/progress/subjects', { preHandler: authenticate }, async (request, reply) => {
    return replyOk(reply, await getSubjectProgress(request.user!));
  });

  app.get('/api/progress/study-time', { preHandler: authenticate }, async (request, reply) => {
    return replyOk(reply, await getStudyTime(request.user!));
  });

  app.get('/api/progress/activity', { preHandler: authenticate }, async (request, reply) => {
    return replyOk(reply, await getStudyTime(request.user!, 14));
  });

  app.get('/api/progress/weak-topics', { preHandler: authenticate }, async (request, reply) => {
    return replyOk(reply, await getWeakTopics(request.user!));
  });

  app.get('/api/recommendations', { preHandler: authenticate }, async (request, reply) => {
    return replyOk(reply, await getRecommendations(request.user!));
  });

  app.post('/api/recommendations/:id/dismiss', { preHandler: authenticate }, async (request, reply) => {
    await dismissRecommendation(request.user!.id, (request.params as { id: string }).id);
    return replyOk(reply, null, 'Recommendation dismissed');
  });

  app.get('/api/gamification/summary', { preHandler: authenticate }, async (request, reply) => {
    return replyOk(reply, await getGamification(request.user!));
  });

  app.get('/api/progress', { preHandler: authenticate }, async (request, reply) => {
    const [summary, subjects, studyTime, weakTopics, recommendations] = await Promise.all([
      getProgressSummary(request.user!),
      getSubjectProgress(request.user!),
      getStudyTime(request.user!),
      getWeakTopics(request.user!),
      getRecommendations(request.user!),
    ]);
    return replyOk(reply, { summary, subjects, studyTime, weakTopics, recommendations });
  });
}