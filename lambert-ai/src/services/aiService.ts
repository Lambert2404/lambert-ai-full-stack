import { apiClient, BACKEND_READY, BackendNotReadyError } from './apiClient'
import type { AiProvider } from '@/types'

/**
 * Expected backend contract:
 *  GET /ai/providers -> AiProvider[]   (frontend never receives keys/secrets,
 *                                        only id/label/enabled/isDefault)
 */
export const aiService = {
  async listProviders(): Promise<AiProvider[]> {
    if (!BACKEND_READY) throw new BackendNotReadyError('GET /ai/providers')
    const { data } = await apiClient.get<AiProvider[]>('/ai/providers')
    return data
  },
}
