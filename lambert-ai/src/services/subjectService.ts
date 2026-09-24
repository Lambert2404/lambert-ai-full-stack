import { apiClient, BACKEND_READY, BackendNotReadyError } from './apiClient'
import type { Subject, Topic } from '@/types'

/**
 * Expected backend contract:
 *  GET /subjects                 -> Subject[]
 *  GET /subjects/:id             -> Subject
 *  GET /subjects/:id/topics      -> Topic[]
 *  GET /topics/:id               -> Topic
 */
export const subjectService = {
  async list(): Promise<Subject[]> {
    if (!BACKEND_READY) throw new BackendNotReadyError('GET /subjects')
    const { data } = await apiClient.get<Subject[]>('/subjects')
    return data
  },

  async getById(id: string): Promise<Subject> {
    if (!BACKEND_READY) throw new BackendNotReadyError(`GET /subjects/${id}`)
    const { data } = await apiClient.get<Subject>(`/subjects/${id}`)
    return data
  },

  async listTopics(subjectId: string): Promise<Topic[]> {
    if (!BACKEND_READY) throw new BackendNotReadyError(`GET /subjects/${subjectId}/topics`)
    const { data } = await apiClient.get<Topic[]>(`/subjects/${subjectId}/topics`)
    return data
  },

  async getTopic(topicId: string): Promise<Topic> {
    if (!BACKEND_READY) throw new BackendNotReadyError(`GET /topics/${topicId}`)
    const { data } = await apiClient.get<Topic>(`/topics/${topicId}`)
    return data
  },
}
