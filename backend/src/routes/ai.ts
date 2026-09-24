import type { FastifyInstance } from 'fastify';
import { loadProviderDefs, invalidateProviderCache } from '../providers/registry.js';

export async function aiRoutes(app: FastifyInstance) {
  app.get('/api/ai/providers', { schema: { tags: ['AI'] } }, async (_request, reply) => {
    void invalidateProviderCache;
    const defs = await loadProviderDefs(true);
    const data = [
      {
        id: 'lambert_auto',
        label: 'Lambert Auto (smart router)',
        enabled: defs.some((d) => d.enabled),
        isDefault: true,
      },
      ...defs.map((d) => ({
        id: d.code,
        label: d.label,
        enabled: d.enabled,
        isDefault: d.isDefault,
      })),
    ];
    return reply.send({ success: true, data, message: null, error: null });
  });
}