import { apiClient, BACKEND_READY, BackendNotReadyError } from './apiClient'
import type { StudyPlan, StudySession } from '@/types'

/**
 * Expected backend contract:
 *  GET   /study-plans/active         -> StudyPlan
 *  POST  /study-plans                -> StudyPlan
 *  POST  /study-plans/generate       -> StudyPlan (AI-generated)
 *  PATCH /study-sessions/:id         -> StudySession (reschedule/complete/skip)
 *  DELETE /study-sessions/:id        -> void
 */
export const studyPlanService = {
  async getActivePlan(): Promise<StudyPlan> {
    if (!BACKEND_READY) throw new BackendNotReadyError('GET /study-plans/active')
    const { data } = await apiClient.get<StudyPlan>('/study-plans/active')
    return data
  },

  async createPlan(payload: Partial<StudyPlan>): Promise<StudyPlan> {
    if (!BACKEND_READY) throw new BackendNotReadyError('POST /study-plans')
    const { data } = await apiClient.post<StudyPlan>('/study-plans', payload)
    return data
  },

  async generatePlan(examDate?: string, weeklyHoursTarget?: number): Promise<StudyPlan> {
    if (!BACKEND_READY) throw new BackendNotReadyError('POST /study-plans/generate')
    const { data } = await apiClient.post<StudyPlan>('/study-plans/generate', { examDate, weeklyHoursTarget })
    return data
  },

  async updateSession(id: string, payload: Partial<StudySession>): Promise<StudySession> {
    if (!BACKEND_READY) throw new BackendNotReadyError(`PATCH /study-sessions/${id}`)
    const { data } = await apiClient.patch<StudySession>(`/study-sessions/${id}`, payload)
    return data
  },

  async deleteSession(id: string): Promise<void> {
    if (!BACKEND_READY) throw new BackendNotReadyError(`DELETE /study-sessions/${id}`)
    await apiClient.delete(`/study-sessions/${id}`)
  },
}
