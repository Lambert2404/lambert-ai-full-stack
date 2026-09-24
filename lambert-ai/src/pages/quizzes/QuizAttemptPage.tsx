import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { quizService } from '@/services/quizService'
import { AsyncView } from '@/components/ui/AsyncView'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
import type { QuizAttempt, QuizAttemptAnswer, QuizQuestion } from '@/types'
import { isBackendPending } from '@/services/apiClient'

export function QuizAttemptPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const attempt = useAsync(() => quizService.getAttempt(attemptId!), [attemptId])

  return (
    <AsyncView
      status={attempt.status}
      data={attempt.data}
      errorMessage={attempt.errorMessage}
      pendingEndpoint={attempt.pendingEndpoint}
      onRetry={attempt.reload}
      emptyTitle="Attempt not found"
    >
      {(a) => <QuizRunner attempt={a} />}
    </AsyncView>
  )
}

function QuizRunner({ attempt }: { attempt: QuizAttempt }) {
  const questions = useAsync(() => quizService.getQuestions(attempt.quizId), [attempt.quizId])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<QuizAttempt | null>(attempt.submittedAt ? attempt : null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <AsyncView
      status={questions.status}
      data={questions.data}
      errorMessage={questions.errorMessage}
      pendingEndpoint={questions.pendingEndpoint}
      onRetry={questions.reload}
      emptyTitle="No questions in this quiz"
    >
      {(qs) => {
        if (result) return <QuizResults result={result} questions={qs} />

        const current = qs[index]
        const total = qs.length

        const submit = async () => {
          setSubmitting(true)
          setError(null)
          const payload: QuizAttemptAnswer[] = qs.map((q) => ({
            questionId: q.id,
            selectedOptionId: answers[q.id],
          }))
          try {
            const submitted = await quizService.submitAttempt(attempt.id, payload)
            setResult(submitted)
          } catch (err) {
            setError(
              isBackendPending(err)
                ? 'Submitting is ready for the backend, but no server is connected in this preview yet.'
                : "Lambert AI couldn't submit your answers. Please try again."
            )
          } finally {
            setSubmitting(false)
          }
        }

        return (
          <div className="mx-auto max-w-2xl">
            <ProgressBar value={((index + 1) / total) * 100} label={`Question ${index + 1} of ${total}`} className="mb-6" />
            <Card>
              <p className="mb-4 font-medium text-ink-950">{current.prompt}</p>
              <div className="flex flex-col gap-2">
                {current.options?.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-md border px-3.5 py-3 text-sm ${
                      answers[current.id] === opt.id ? 'border-ink-900 bg-paper-100' : 'border-ink-300/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name={current.id}
                      checked={answers[current.id] === opt.id}
                      onChange={() => setAnswers((a) => ({ ...a, [current.id]: opt.id }))}
                    />
                    {opt.text}
                  </label>
                ))}
              </div>
            </Card>
            {error && <Alert tone="error" title={error} />}
            <div className="mt-5 flex justify-between">
              <Button variant="outline" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
                Previous
              </Button>
              {index < total - 1 ? (
                <Button onClick={() => setIndex((i) => i + 1)}>Next</Button>
              ) : (
                <Button onClick={submit} loading={submitting}>Submit quiz</Button>
              )}
            </div>
          </div>
        )
      }}
    </AsyncView>
  )
}

function QuizResults({ result, questions }: { result: QuizAttempt; questions: QuizQuestion[] }) {
  return (
    <div className="mx-auto max-w-2xl">
      <Card className="mb-6 text-center">
        <p className="text-sm text-ink-500">Your score</p>
        <p className="mt-1 font-serif text-4xl font-semibold text-ink-950">{result.scorePercent ?? 0}%</p>
        <div className="mt-4 flex justify-center gap-4 text-sm">
          <span className="text-emerald-700">{result.correctCount ?? 0} correct</span>
          <span className="text-crimson-600">{result.incorrectCount ?? 0} incorrect</span>
          {result.timeSpentSeconds !== undefined && (
            <span className="text-ink-500">{Math.round(result.timeSpentSeconds / 60)} min</span>
          )}
        </div>
      </Card>

      {result.topicBreakdown && result.topicBreakdown.length > 0 && (
        <Card className="mb-6">
          <h3 className="mb-4 text-base font-semibold text-ink-950">Topic performance</h3>
          <div className="flex flex-col gap-3">
            {result.topicBreakdown.map((t) => (
              <ProgressBar key={t.topicId} value={t.correctPercent} label={t.topicName} />
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h3 className="mb-4 text-base font-semibold text-ink-950">Review</h3>
        <div className="flex flex-col divide-y divide-ink-300/20">
          {questions.map((q) => {
            const answer = result.answers.find((a) => a.questionId === q.id)
            return (
              <div key={q.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-ink-900">{q.prompt}</p>
                  <Badge tone={answer?.isCorrect ? 'emerald' : 'crimson'}>{answer?.isCorrect ? 'Correct' : 'Incorrect'}</Badge>
                </div>
                {q.explanation && <p className="mt-1 text-sm text-ink-500">{q.explanation}</p>}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
