import { apiClient, BACKEND_READY, BackendNotReadyError } from './apiClient'
import type { AdminMetrics, AiModelConfig, User } from '@/types'

/**
 * Expected backend contract:
 *  GET   /admin/metrics                 -> AdminMetrics
 *  GET   /admin/users                   -> Paginated<User>
 *  GET   /admin/ai-models               -> AiModelConfig[]
 *  PATCH /admin/ai-models/:id           -> AiModelConfig (enable/disable/set default/fallback)
 *  Admin subject/topic/material/quiz CRUD mirrors the student-facing read
 *  endpoints with POST/PATCH/DELETE variants under /admin/*.
 */
export const adminService = {
  async getMetrics(): Promise<AdminMetrics> {
    if (!BACKEND_READY) throw new BackendNotReadyError('GET /admin/metrics')
    const { data } = await apiClient.get<AdminMetrics>('/admin/metrics')
    return data
  },

  async listUsers(): Promise<User[]> {
    if (!BACKEND_READY) throw new BackendNotReadyError('GET /admin/users')
    const { data } = await apiClient.get<User[]>('/admin/users')
    return data
  },

  async listAiModels(): Promise<AiModelConfig[]> {
    if (!BACKEND_READY) throw new BackendNotReadyError('GET /admin/ai-models')
    const { data } = await apiClient.get<AiModelConfig[]>('/admin/ai-models')
    return data
  },

  async updateAiModel(id: string, payload: Partial<AiModelConfig>): Promise<AiModelConfig> {
    if (!BACKEND_READY) throw new BackendNotReadyError(`PATCH /admin/ai-models/${id}`)
    const { data } = await apiClient.patch<AiModelConfig>(`/admin/ai-models/${id}`, payload)
    return data
  },
}
