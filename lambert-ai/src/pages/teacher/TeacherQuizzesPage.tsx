import { useAsync } from '@/hooks/useAsync'
import { quizService } from '@/services/quizService'
import { AsyncView } from '@/components/ui/AsyncView'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'

export function TeacherQuizzesPage() {
  const quizzes = useAsync(() => quizService.list(), [])

  return (
    <div>
      <PageHeader
        title="My quizzes"
        description="Quizzes and question banks you've created for your students."
        action={<Button size="sm">Create quiz</Button>}
      />
      <AsyncView
        status={quizzes.status}
        data={quizzes.data}
        errorMessage={quizzes.errorMessage}
        pendingEndpoint={quizzes.pendingEndpoint}
        onRetry={quizzes.reload}
        emptyTitle="You haven't created any quizzes yet"
      >
        {(items) => (
          <Table
            rowKey={(r) => r.id}
            rows={items}
            columns={[
              { key: 'title', header: 'Title', render: (r) => r.title },
              { key: 'questions', header: 'Questions', render: (r) => r.questionCount },
              { key: 'difficulty', header: 'Difficulty', render: (r) => <Badge tone="gold">{r.difficulty}</Badge> },
            ]}
          />
        )}
      </AsyncView>
    </div>
  )
}
