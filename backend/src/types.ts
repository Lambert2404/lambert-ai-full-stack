/** Shared API-layer types used by routes and services. */

export type Language = 'en' | 'sw';
export type UserRole = 'student' | 'teacher' | 'admin';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type AiMode =
  | 'tutor'
  | 'exam'
  | 'homework_helper'
  | 'quiz_me'
  | 'explain_simply'
  | 'deep_learning'
  | 'revision'
  | 'document_tutor'
  | 'engineering_tutor';
export type AiProviderId = 'lambert_auto' | 'openai' | 'microsoft' | 'google_gemini' | 'anthropic_claude' | 'openrouter';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}