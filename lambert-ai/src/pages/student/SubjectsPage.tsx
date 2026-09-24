import { Link } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { subjectService } from '@/services/subjectService'
import { AsyncView } from '@/components/ui/AsyncView'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'

export function SubjectsPage() {
  const subjects = useAsync(() => subjectService.list(), [])

  return (
    <div>
      <PageHeader title="Subjects" description="Browse every subject Lambert AI can help you study." />
      <AsyncView
        status={subjects.status}
        data={subjects.data}
        errorMessage={subjects.errorMessage}
        pendingEndpoint={subjects.pendingEndpoint}
        onRetry={subjects.reload}
        emptyTitle="No subjects available yet"
      >
        {(items) => (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((s) => (
              <Link key={s.id} to={`/subjects/${s.id}`}>
                <Card className="h-full hover:border-ink-900/30">
                  <p className="font-semibold text-ink-950">{s.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-500">{s.description}</p>
                  <p className="mt-3 text-xs text-ink-500">{s.topicCount} topics</p>
                  {s.progressPercent !== undefined && (
                    <ProgressBar value={s.progressPercent} showValue={false} className="mt-3" />
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </AsyncView>
    </div>
  )
}
