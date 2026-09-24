import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { quizService } from '@/services/quizService'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { AsyncView } from '@/components/ui/AsyncView'
import { GenerateQuizModal } from './GenerateQuizModal'

const difficultyTone = { easy: 'emerald', medium: 'gold', hard: 'crimson' } as const

export function QuizLibraryPage() {
  const [tab, setTab] = useState<'library' | 'history'>('library')
  const [modalOpen, setModalOpen] = useState(false)

  const quizzes = useAsync(() => quizService.list(), [])
  const attempts = useAsync(() => quizService.listAttempts(), [])

  return (
    <div>
      <PageHeader
        title="Quiz Center"
        description="Practice with AI-generated quizzes and review your history."
        action={<Button onClick={() => setModalOpen(true)}>Generate quiz</Button>}
      />

      <Tabs
        items={[
          { id: 'library', label: 'Quiz library', count: quizzes.data?.length },
          { id: 'history', label: 'Quiz history', count: attempts.data?.length },
        ]}
        activeId={tab}
        onChange={(id) => setTab(id as 'library' | 'history')}
        className="mb-6"
      />

      {tab === 'library' ? (
        <AsyncView
          status={quizzes.status}
          data={quizzes.data}
          errorMessage={quizzes.errorMessage}
          pendingEndpoint={quizzes.pendingEndpoint}
          onRetry={quizzes.reload}
          emptyTitle="No quizzes yet"
          emptyDescription="Generate your first quiz to start practicing."
        >
          {(items) => (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((q) => (
                <Link key={q.id} to={`/quizzes/${q.id}`}>
                  <Card className="h-full transition-colors hover:border-ink-900/30">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <p className="font-semibold text-ink-950">{q.title}</p>
                      <Badge tone={difficultyTone[q.difficulty]}>{q.difficulty}</Badge>
                    </div>
                    <p className="text-sm text-ink-500">
                      {q.questionCount} questions · {q.timed ? `${q.durationMinutes} min` : 'Untimed'}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </AsyncView>
      ) : (
        <AsyncView
          status={attempts.status}
          data={attempts.data}
          errorMessage={attempts.errorMessage}
          pendingEndpoint={attempts.pendingEndpoint}
          onRetry={attempts.reload}
          emptyTitle="No quiz attempts yet"
          emptyDescription="Your completed quizzes will appear here with your scores."
        >
          {(items) => (
            <div className="flex flex-col gap-3">
              {items.map((a) => (
                <Link key={a.id} to={`/quiz/${a.id}`}>
                  <Card className="flex items-center justify-between hover:border-ink-900/30">
                    <div>
                      <p className="font-medium text-ink-950">Attempt {a.id.slice(0, 8)}</p>
                      <p className="text-sm text-ink-500">
                        {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : 'In progress'}
                      </p>
                    </div>
                    {a.scorePercent !== undefined && (
                      <Badge tone={a.scorePercent >= 70 ? 'emerald' : a.scorePercent >= 50 ? 'gold' : 'crimson'}>
                        {a.scorePercent}%
                      </Badge>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </AsyncView>
      )}

      <GenerateQuizModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
