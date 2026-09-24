import { apiClient, BACKEND_READY, BackendNotReadyError } from './apiClient'
import type { AppNotification } from '@/types'

/**
 * Expected backend contract:
 *  GET   /notifications           -> AppNotification[]
 *  PATCH /notifications/:id       -> AppNotification (read/archive)
 *  POST  /notifications/read-all  -> void
 */
export const notificationService = {
  async list(): Promise<AppNotification[]> {
    if (!BACKEND_READY) throw new BackendNotReadyError('GET /notifications')
    const { data } = await apiClient.get<AppNotification[]>('/notifications')
    return data
  },

  async markRead(id: string, read = true): Promise<AppNotification> {
    if (!BACKEND_READY) throw new BackendNotReadyError(`PATCH /notifications/${id}`)
    const { data } = await apiClient.patch<AppNotification>(`/notifications/${id}`, { read })
    return data
  },

  async archive(id: string): Promise<AppNotification> {
    if (!BACKEND_READY) throw new BackendNotReadyError(`PATCH /notifications/${id}`)
    const { data } = await apiClient.patch<AppNotification>(`/notifications/${id}`, { archived: true })
    return data
  },

  async markAllRead(): Promise<void> {
    if (!BACKEND_READY) throw new BackendNotReadyError('POST /notifications/read-all')
    await apiClient.post('/notifications/read-all')
  },
}
