import { useAsync } from '@/hooks/useAsync'
import { progressService } from '@/services/progressService'
import { AsyncView } from '@/components/ui/AsyncView'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Link } from 'react-router-dom'

const actionLabel = { review: 'Review', practice: 'Practice', quiz: 'Take quiz', read: 'Read' } as const
const actionTo = { review: '/tutor', practice: '/tutor', quiz: '/quizzes', read: '/materials' } as const
const difficultyTone = { easy: 'emerald', medium: 'gold', hard: 'crimson' } as const

export function RecommendationsPage() {
  const recommendations = useAsync(() => progressService.getRecommendations(), [])

  return (
    <div>
      <PageHeader title="Recommended For You" description="Lambert AI's suggestions based on your recent activity and quiz performance." />
      <AsyncView
        status={recommendations.status}
        data={recommendations.data}
        errorMessage={recommendations.errorMessage}
        pendingEndpoint={recommendations.pendingEndpoint}
        onRetry={recommendations.reload}
        emptyTitle="No recommendations yet"
        emptyDescription="Study a little and take a quiz — Lambert AI will start suggesting what to focus on next."
      >
        {(items) => (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((r) => (
              <Card key={r.id} className="flex h-full flex-col">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="font-semibold text-ink-950">{r.title}</p>
                  <Badge tone={difficultyTone[r.difficulty]}>{r.difficulty}</Badge>
                </div>
                <p className="text-sm text-ink-500">{r.reason}</p>
                <p className="mt-2 text-xs text-ink-500">{r.subjectName} · ~{r.estimatedMinutes} min</p>
                <Link to={actionTo[r.actionType]} className="mt-4">
                  <Button size="sm" variant="outline" fullWidth>{actionLabel[r.actionType]}</Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </AsyncView>
    </div>
  )
}
