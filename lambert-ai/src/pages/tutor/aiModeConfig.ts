import type { AiMode, AiProviderId } from '@/types'

export const aiModes: { id: AiMode; label: string; description: string }[] = [
  { id: 'tutor', label: 'Tutor', description: 'Guided, conversational teaching' },
  { id: 'exam', label: 'Exam', description: 'Exam-style questions and marking' },
  { id: 'homework_helper', label: 'Homework Helper', description: 'Step-by-step problem solving' },
  { id: 'quiz_me', label: 'Quiz Me', description: 'Rapid-fire practice questions' },
  { id: 'explain_simply', label: 'Explain Simply', description: 'Plain-language explanations' },
  { id: 'deep_learning', label: 'Deep Learning', description: 'In-depth, first-principles detail' },
  { id: 'revision', label: 'Revision', description: 'Summaries for quick review' },
  { id: 'document_tutor', label: 'Document Tutor', description: 'Answers from your uploaded materials' },
  { id: 'engineering_tutor', label: 'Engineering Tutor', description: 'Environmental engineering specialist' },
]

export const aiProviderLabels: Record<AiProviderId, string> = {
  lambert_auto: 'LAMBERT Auto',
  openai: 'OpenAI',
  microsoft: 'Microsoft',
  google_gemini: 'Google Gemini',
  anthropic_claude: 'Anthropic Claude',
}
