import { apiClient, BACKEND_READY, BackendNotReadyError } from './apiClient'
import type { Language, Quiz, QuizAttempt, QuizAttemptAnswer, QuizQuestion, QuestionDifficulty } from '@/types'

export interface GenerateQuizPayload {
  subjectId: string
  topicId?: string
  difficulty: QuestionDifficulty
  questionCount: number
  questionType: 'mcq' | 'true_false' | 'short_answer' | 'mixed'
  language: Language
  timed: boolean
  durationMinutes?: number
}

/**
 * Expected backend contract:
 *  GET  /quizzes                 -> Quiz[]
 *  GET  /quizzes/:id             -> Quiz
 *  GET  /quizzes/:id/questions   -> QuizQuestion[]
 *  POST /quizzes/generate        -> Quiz
 *  POST /quizzes/:id/attempts    -> QuizAttempt
 *  PATCH /quiz-attempts/:id      -> QuizAttempt (submit answers)
 *  GET  /quiz-attempts/:id       -> QuizAttempt
 *  GET  /quiz-attempts           -> QuizAttempt[] (history)
 */
export const quizService = {
  async list(): Promise<Quiz[]> {
    if (!BACKEND_READY) throw new BackendNotReadyError('GET /quizzes')
    const { data } = await apiClient.get<Quiz[]>('/quizzes')
    return data
  },

  async getById(id: string): Promise<Quiz> {
    if (!BACKEND_READY) throw new BackendNotReadyError(`GET /quizzes/${id}`)
    const { data } = await apiClient.get<Quiz>(`/quizzes/${id}`)
    return data
  },

  async getQuestions(id: string): Promise<QuizQuestion[]> {
    if (!BACKEND_READY) throw new BackendNotReadyError(`GET /quizzes/${id}/questions`)
    const { data } = await apiClient.get<QuizQuestion[]>(`/quizzes/${id}/questions`)
    return data
  },

  async generate(payload: GenerateQuizPayload): Promise<Quiz> {
    if (!BACKEND_READY) throw new BackendNotReadyError('POST /quizzes/generate')
    const { data } = await apiClient.post<Quiz>('/quizzes/generate', payload)
    return data
  },

  async startAttempt(quizId: string): Promise<QuizAttempt> {
    if (!BACKEND_READY) throw new BackendNotReadyError(`POST /quizzes/${quizId}/attempts`)
    const { data } = await apiClient.post<QuizAttempt>(`/quizzes/${quizId}/attempts`)
    return data
  },

  async submitAttempt(attemptId: string, answers: QuizAttemptAnswer[]): Promise<QuizAttempt> {
    if (!BACKEND_READY) throw new BackendNotReadyError(`PATCH /quiz-attempts/${attemptId}`)
    const { data } = await apiClient.patch<QuizAttempt>(`/quiz-attempts/${attemptId}`, { answers })
    return data
  },

  async getAttempt(attemptId: string): Promise<QuizAttempt> {
    if (!BACKEND_READY) throw new BackendNotReadyError(`GET /quiz-attempts/${attemptId}`)
    const { data } = await apiClient.get<QuizAttempt>(`/quiz-attempts/${attemptId}`)
    return data
  },

  async listAttempts(): Promise<QuizAttempt[]> {
    if (!BACKEND_READY) throw new BackendNotReadyError('GET /quiz-attempts')
    const { data } = await apiClient.get<QuizAttempt[]>('/quiz-attempts')
    return data
  },
}
