import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import type { GenerateQuizPayload } from '@/services/quizService'
import { quizService } from '@/services/quizService'
import { isBackendPending } from '@/services/apiClient'
import { useNavigate } from 'react-router-dom'

export function GenerateQuizModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const [form, setForm] = useState<GenerateQuizPayload>({
    subjectId: '',
    difficulty: 'medium',
    questionCount: 10,
    questionType: 'mcq',
    language: 'en',
    timed: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const quiz = await quizService.generate(form)
      onClose()
      navigate(`/quizzes/${quiz.id}`)
    } catch (err) {
      setError(
        isBackendPending(err)
          ? "Quiz generation is ready for the backend, but no server is connected in this preview yet."
          : (err as { message?: string })?.message ?? "Lambert AI couldn't generate that quiz. Please try again."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Generate a quiz" description="Tell Lambert AI what to practice." size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Subject ID"
          required
          hint="Temporary manual entry until the subject picker is connected."
          value={form.subjectId}
          onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700">
            Difficulty
            <select
              value={form.difficulty}
              onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as GenerateQuizPayload['difficulty'] }))}
              className="rounded-md border border-ink-300/40 px-3 py-2.5 text-sm"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700">
            Question type
            <select
              value={form.questionType}
              onChange={(e) => setForm((f) => ({ ...f, questionType: e.target.value as GenerateQuizPayload['questionType'] }))}
              className="rounded-md border border-ink-300/40 px-3 py-2.5 text-sm"
            >
              <option value="mcq">Multiple choice</option>
              <option value="true_false">True / False</option>
              <option value="short_answer">Short answer</option>
              <option value="mixed">Mixed</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Number of questions"
            type="number"
            min={1}
            max={50}
            value={form.questionCount}
            onChange={(e) => setForm((f) => ({ ...f, questionCount: Number(e.target.value) }))}
          />
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700">
            Language
            <select
              value={form.language}
              onChange={(e) => setForm((f) => ({ ...f, language: e.target.value as GenerateQuizPayload['language'] }))}
              className="rounded-md border border-ink-300/40 px-3 py-2.5 text-sm"
            >
              <option value="en">English</option>
              <option value="sw">Kiswahili</option>
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={form.timed}
            onChange={(e) => setForm((f) => ({ ...f, timed: e.target.checked }))}
          />
          Timed quiz
        </label>
        {form.timed && (
          <Input
            label="Duration (minutes)"
            type="number"
            min={1}
            value={form.durationMinutes ?? 15}
            onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
          />
        )}
        {error && <Alert tone="error" title={error} />}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Generate quiz</Button>
        </div>
      </form>
    </Modal>
  )
}
