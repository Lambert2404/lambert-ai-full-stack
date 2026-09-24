import { Link, useParams } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { subjectService } from '@/services/subjectService'
import { AsyncView } from '@/components/ui/AsyncView'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const difficultyTone = { beginner: 'emerald', intermediate: 'gold', advanced: 'crimson' } as const

export function SubjectDetailPage() {
  const { subjectId } = useParams<{ subjectId: string }>()
  const subject = useAsync(() => subjectService.getById(subjectId!), [subjectId])
  const topics = useAsync(() => subjectService.listTopics(subjectId!), [subjectId])

  return (
    <div>
      <AsyncView
        status={subject.status}
        data={subject.data}
        errorMessage={subject.errorMessage}
        pendingEndpoint={subject.pendingEndpoint}
        onRetry={subject.reload}
        emptyTitle="Subject not found"
      >
        {(s) => <PageHeader title={s.name} description={s.description} />}
      </AsyncView>

      <AsyncView
        status={topics.status}
        data={topics.data}
        errorMessage={topics.errorMessage}
        pendingEndpoint={topics.pendingEndpoint}
        onRetry={topics.reload}
        emptyTitle="No topics yet"
      >
        {(items) => (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((t) => (
              <Link key={t.id} to={`/topics/${t.id}`}>
                <Card className="hover:border-ink-900/30">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-ink-950">{t.name}</p>
                    <Badge tone={difficultyTone[t.difficulty]}>{t.difficulty}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-500">{t.description}</p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </AsyncView>
    </div>
  )
}
