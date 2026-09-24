// ============================================================================
// LAMBERT AI — Shared frontend types
// These types describe the EXPECTED backend contract. The backend (built
// separately via OpenCode) is the source of truth; keep this file in sync
// with the published API docs as they land.
// ============================================================================

export type Language = 'en' | 'sw'

export type UserRole = 'student' | 'teacher' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl?: string
  createdAt: string
}

export interface StudentProfile {
  userId: string
  educationLevel?: string
  institution?: string
  program?: string
  preferredLanguage: Language
  subjects: string[]
  learningGoals?: string
}

export interface AuthSession {
  user: User
  accessToken: string
  expiresAt: string
}

// ---- Subjects / Topics ----------------------------------------------------

export interface Subject {
  id: string
  name: string
  slug: string
  description: string
  iconKey: string
  topicCount: number
  progressPercent?: number
}

export interface Topic {
  id: string
  subjectId: string
  name: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  masteryPercent?: number
}

// ---- AI Tutor ---------------------------------------------------------

export type AiMode =
  | 'tutor'
  | 'exam'
  | 'homework_helper'
  | 'quiz_me'
  | 'explain_simply'
  | 'deep_learning'
  | 'revision'
  | 'document_tutor'
  | 'engineering_tutor'

export type AiProviderId = 'lambert_auto' | 'openai' | 'microsoft' | 'google_gemini' | 'anthropic_claude' | 'openrouter'

export interface AiProvider {
  id: AiProviderId
  label: string
  enabled: boolean
  isDefault: boolean
}

export interface Conversation {
  id: string
  title: string
  mode: AiMode
  subjectId?: string
  bookmarked: boolean
  updatedAt: string
  createdAt: string
  lastMessagePreview?: string
}

export type MessageRole = 'user' | 'assistant' | 'system'

export interface MessageSource {
  documentId: string
  documentName: string
  pageNumber?: number
  snippet: string
}

export interface Message {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  createdAt: string
  sources?: MessageSource[]
  pending?: boolean
  error?: string
}

// ---- Documents / Materials ----------------------------------------------

export type DocumentStatus = 'uploading' | 'processing' | 'indexing' | 'ready' | 'failed'

export interface StudyMaterial {
  id: string
  name: string
  subjectId?: string
  fileType: 'pdf' | 'docx' | 'txt'
  sizeBytes: number
  pages?: number
  status: DocumentStatus
  uploadedAt: string
  uploadProgressPercent?: number
  errorMessage?: string
}

// ---- Past papers ----------------------------------------------------------

export type QuestionDifficulty = 'easy' | 'medium' | 'hard'

export interface PastPaperQuestion {
  id: string
  text: string
  year: number
  subjectId: string
  topicId?: string
  difficulty: QuestionDifficulty
  questionType: 'mcq' | 'short_answer' | 'essay' | 'calculation'
}

export interface PastPaper {
  id: string
  name: string
  subjectId: string
  year: number
  status: DocumentStatus
  questionCount?: number
  uploadedAt: string
}

// ---- Quizzes ----------------------------------------------------------

export interface QuizQuestionOption {
  id: string
  text: string
}

export interface QuizQuestion {
  id: string
  prompt: string
  type: 'mcq' | 'true_false' | 'short_answer'
  options?: QuizQuestionOption[]
  correctOptionId?: string
  explanation?: string
  difficulty: QuestionDifficulty
  topicId?: string
}

export interface Quiz {
  id: string
  title: string
  subjectId: string
  topicId?: string
  difficulty: QuestionDifficulty
  language: Language
  timed: boolean
  durationMinutes?: number
  questionCount: number
  createdAt: string
}

export interface QuizAttemptAnswer {
  questionId: string
  selectedOptionId?: string
  textAnswer?: string
  isCorrect?: boolean
}

export interface QuizAttempt {
  id: string
  quizId: string
  startedAt: string
  submittedAt?: string
  scorePercent?: number
  correctCount?: number
  incorrectCount?: number
  timeSpentSeconds?: number
  answers: QuizAttemptAnswer[]
  topicBreakdown?: { topicId: string; topicName: string; correctPercent: number }[]
}

// ---- Study planner ----------------------------------------------------

export interface StudySession {
  id: string
  title: string
  subjectId?: string
  topicId?: string
  date: string
  startTime?: string
  durationMinutes: number
  status: 'pending' | 'completed' | 'skipped'
}

export interface StudyPlan {
  id: string
  title: string
  examDate?: string
  createdBy: 'ai' | 'user'
  weeklyHoursTarget?: number
  sessions: StudySession[]
}

// ---- Progress / Analytics ----------------------------------------------

export interface ProgressSummary {
  streakDays: number
  studyMinutesToday: number
  quizAverage: number
  completedTopics: number
  totalTopics: number
}

export interface SubjectProgress {
  subjectId: string
  subjectName: string
  progressPercent: number
  quizAverage: number
}

export interface StudyTimePoint {
  date: string
  minutes: number
}

export interface WeakTopic {
  topicId: string
  topicName: string
  subjectName: string
  masteryPercent: number
}

// ---- Recommendations ----------------------------------------------------

export interface Recommendation {
  id: string
  title: string
  reason: string
  subjectId: string
  subjectName: string
  topicId?: string
  difficulty: QuestionDifficulty
  estimatedMinutes: number
  actionType: 'review' | 'practice' | 'quiz' | 'read'
}

// ---- Notifications ----------------------------------------------------

export type NotificationType =
  | 'study_reminder'
  | 'quiz_result'
  | 'study_plan'
  | 'new_material'
  | 'achievement'
  | 'system'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  archived: boolean
  createdAt: string
}

// ---- Gamification ----------------------------------------------------

export interface Achievement {
  id: string
  title: string
  description: string
  iconKey: string
  unlockedAt?: string
}

export interface GamificationSummary {
  xp: number
  level: number
  streakDays: number
  achievements: Achievement[]
}

// ---- Admin ----------------------------------------------------

export interface AdminMetrics {
  students: number
  activeUsers: number
  aiRequests: number
  quizAttempts: number
  documents: number
  errorsLast24h: number
}

export interface AiModelConfig {
  id: string
  providerId: AiProviderId
  modelName: string
  status: 'online' | 'degraded' | 'offline'
  isDefault: boolean
  isFallback: boolean
  avgLatencyMs?: number
  errorRatePercent?: number
  requestsToday?: number
}

// ---- Generic API envelope ----------------------------------------------

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export interface ApiError {
  code: string
  message: string
  status: number
}
