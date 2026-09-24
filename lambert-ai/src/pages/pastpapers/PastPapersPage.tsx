import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { documentService } from '@/services/documentService'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
import { AsyncView } from '@/components/ui/AsyncView'
import { useToast } from '@/contexts/ToastContext'
import { isBackendPending } from '@/services/apiClient'

const statusTone = { uploading: 'gold', processing: 'gold', indexing: 'gold', ready: 'emerald', failed: 'crimson' } as const

export function PastPapersPage() {
  const papers = useAsync(() => documentService.listPastPapers(), [])
  const inputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()

  const handleFile = async (file: File) => {
    try {
      await documentService.uploadPastPaper(file, 'unassigned', new Date().getFullYear())
      showToast('Past paper uploaded — analysis will begin shortly.', 'success')
      papers.reload()
    } catch (err) {
      showToast(
        isBackendPending(err)
          ? 'Upload is ready for the backend, but no server is connected in this preview yet.'
          : "Lambert AI couldn't process this paper. Please try again.",
        'error'
      )
    }
  }

  return (
    <div>
      <PageHeader
        title="Past Paper Intelligence"
        description="Upload past papers to see how a subject has been examined — question topics, difficulty, and patterns across years."
        action={
          <>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ''
              }}
            />
            <Button onClick={() => inputRef.current?.click()}>Upload paper</Button>
          </>
        }
      />

      <Alert
        tone="info"
        title="Historical analysis, not prediction"
        description="Lambert AI surfaces patterns from past exams to guide revision. It does not predict future exam questions."
      />

      <div className="mt-6">
        <AsyncView
          status={papers.status}
          data={papers.data}
          errorMessage={papers.errorMessage}
          pendingEndpoint={papers.pendingEndpoint}
          onRetry={papers.reload}
          emptyTitle="No past papers yet"
          emptyDescription="Upload a past paper to get started."
        >
          {(items) => (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => (
                <Link key={p.id} to={`/past-papers/${p.id}`}>
                  <Card className="h-full hover:border-ink-900/30">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="font-medium text-ink-950">{p.name}</p>
                      <Badge tone={statusTone[p.status]}>{p.status}</Badge>
                    </div>
                    <p className="text-xs text-ink-500">
                      {p.year} {p.questionCount ? `· ${p.questionCount} questions detected` : ''}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </AsyncView>
      </div>
    </div>
  )
}
