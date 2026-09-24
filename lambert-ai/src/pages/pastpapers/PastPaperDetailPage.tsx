import { useParams } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { documentService } from '@/services/documentService'
import { AsyncView } from '@/components/ui/AsyncView'
import { PageHeader } from '@/components/layout/PageHeader'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import type { PastPaperQuestion } from '@/types'

const difficultyTone = { easy: 'emerald', medium: 'gold', hard: 'crimson' } as const

export function PastPaperDetailPage() {
  const { paperId } = useParams<{ paperId: string }>()
  const paper = useAsync(() => documentService.getPastPaper(paperId!), [paperId])
  const questions = useAsync(() => documentService.getPastPaperQuestions(paperId!), [paperId])

  return (
    <div>
      <AsyncView
        status={paper.status}
        data={paper.data}
        errorMessage={paper.errorMessage}
        pendingEndpoint={paper.pendingEndpoint}
        onRetry={paper.reload}
        emptyTitle="Paper not found"
      >
        {(p) => <PageHeader title={p.name} description={`${p.year} · ${p.status}`} />}
      </AsyncView>

      <AsyncView
        status={questions.status}
        data={questions.data}
        errorMessage={questions.errorMessage}
        pendingEndpoint={questions.pendingEndpoint}
        onRetry={questions.reload}
        emptyTitle="No questions detected yet"
        emptyDescription="Analysis may still be in progress."
      >
        {(items: PastPaperQuestion[]) => (
          <Table
            rowKey={(r) => r.id}
            rows={items}
            columns={[
              { key: 'text', header: 'Question', render: (r) => <span className="line-clamp-2">{r.text}</span> },
              { key: 'year', header: 'Year', render: (r) => r.year },
              { key: 'type', header: 'Type', render: (r) => r.questionType.replace('_', ' ') },
              { key: 'difficulty', header: 'Difficulty', render: (r) => <Badge tone={difficultyTone[r.difficulty]}>{r.difficulty}</Badge> },
            ]}
          />
        )}
      </AsyncView>
    </div>
  )
}
