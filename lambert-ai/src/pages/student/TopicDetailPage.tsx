import { Link, useParams } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { subjectService } from '@/services/subjectService'
import { AsyncView } from '@/components/ui/AsyncView'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'

export function TopicDetailPage() {
  const { topicId } = useParams<{ topicId: string }>()
  const topic = useAsync(() => subjectService.getTopic(topicId!), [topicId])

  return (
    <AsyncView
      status={topic.status}
      data={topic.data}
      errorMessage={topic.errorMessage}
      pendingEndpoint={topic.pendingEndpoint}
      onRetry={topic.reload}
      emptyTitle="Topic not found"
    >
      {(t) => (
        <div>
          <PageHeader title={t.name} description={t.description} />
          <Card className="max-w-lg">
            {t.masteryPercent !== undefined && (
              <ProgressBar value={t.masteryPercent} label="Your mastery" tone="emerald" className="mb-5" />
            )}
            <div className="flex flex-wrap gap-2">
              <Link to="/tutor">
                <Button size="sm">Ask Lambert about this topic</Button>
              </Link>
              <Link to="/quizzes">
                <Button size="sm" variant="outline">Practice with a quiz</Button>
              </Link>
            </div>
          </Card>
        </div>
      )}
    </AsyncView>
  )
}
