import { apiClient, BACKEND_READY, BackendNotReadyError } from './apiClient'
import type {
  ProgressSummary,
  Recommendation,
  StudyTimePoint,
  SubjectProgress,
  WeakTopic,
  GamificationSummary,
} from '@/types'

/**
 * Expected backend contract:
 *  GET /progress/summary          -> ProgressSummary
 *  GET /progress/subjects         -> SubjectProgress[]
 *  GET /progress/study-time       -> StudyTimePoint[]
 *  GET /progress/weak-topics      -> WeakTopic[]
 *  GET /recommendations           -> Recommendation[]
 *  GET /gamification/summary      -> GamificationSummary
 */
export const progressService = {
  async getSummary(): Promise<ProgressSummary> {
    if (!BACKEND_READY) throw new BackendNotReadyError('GET /progress/summary')
    const { data } = await apiClient.get<ProgressSummary>('/progress/summary')
    return data
  },

  async getSubjectProgress(): Promise<SubjectProgress[]> {
    if (!BACKEND_READY) throw new BackendNotReadyError('GET /progress/subjects')
    const { data } = await apiClient.get<SubjectProgress[]>('/progress/subjects')
    return data
  },

  async getStudyTime(): Promise<StudyTimePoint[]> {
    if (!BACKEND_READY) throw new BackendNotReadyError('GET /progress/study-time')
    const { data } = await apiClient.get<StudyTimePoint[]>('/progress/study-time')
    return data
  },

  async getWeakTopics(): Promise<WeakTopic[]> {
    if (!BACKEND_READY) throw new BackendNotReadyError('GET /progress/weak-topics')
    const { data } = await apiClient.get<WeakTopic[]>('/progress/weak-topics')
    return data
  },

  async getRecommendations(): Promise<Recommendation[]> {
    if (!BACKEND_READY) throw new BackendNotReadyError('GET /recommendations')
    const { data } = await apiClient.get<Recommendation[]>('/recommendations')
    return data
  },

  async getGamificationSummary(): Promise<GamificationSummary> {
    if (!BACKEND_READY) throw new BackendNotReadyError('GET /gamification/summary')
    const { data } = await apiClient.get<GamificationSummary>('/gamification/summary')
    return data
  },
}
