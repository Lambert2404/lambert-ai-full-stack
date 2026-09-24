import { useNavigate, useParams } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { quizService } from '@/services/quizService'
import { AsyncView } from '@/components/ui/AsyncView'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/contexts/ToastContext'
import { isBackendPending } from '@/services/apiClient'

export function QuizDetailPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const quiz = useAsync(() => quizService.getById(quizId!), [quizId])

  const handleStart = async () => {
    try {
      const attempt = await quizService.startAttempt(quizId!)
      navigate(`/quiz/${attempt.id}`)
    } catch (err) {
      showToast(
        isBackendPending(err)
          ? "Starting an attempt is ready for the backend, but no server is connected yet."
          : "Lambert AI couldn't start this quiz. Please try again.",
        'error'
      )
    }
  }

  return (
    <AsyncView
      status={quiz.status}
      data={quiz.data}
      errorMessage={quiz.errorMessage}
      pendingEndpoint={quiz.pendingEndpoint}
      onRetry={quiz.reload}
      emptyTitle="Quiz not found"
    >
      {(q) => (
        <div>
          <PageHeader title={q.title} />
          <Card className="max-w-lg">
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge tone="gold">{q.difficulty}</Badge>
              <Badge tone="neutral">{q.questionCount} questions</Badge>
              <Badge tone="neutral">{q.timed ? `${q.durationMinutes} min timed` : 'Untimed'}</Badge>
              <Badge tone="neutral">{q.language === 'en' ? 'English' : 'Kiswahili'}</Badge>
            </div>
            <Button onClick={handleStart} fullWidth>Start quiz</Button>
          </Card>
        </div>
      )}
    </AsyncView>
  )
}
