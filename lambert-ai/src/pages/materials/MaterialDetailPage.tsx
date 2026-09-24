import { useParams, useNavigate } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { documentService } from '@/services/documentService'
import { AsyncView } from '@/components/ui/AsyncView'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/contexts/ToastContext'

export function MaterialDetailPage() {
  const { materialId } = useParams<{ materialId: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const material = useAsync(() => documentService.getMaterial(materialId!), [materialId])

  return (
    <AsyncView
      status={material.status}
      data={material.data}
      errorMessage={material.errorMessage}
      pendingEndpoint={material.pendingEndpoint}
      onRetry={material.reload}
      emptyTitle="Material not found"
    >
      {(m) => (
        <div>
          <PageHeader title={m.name} />
          <Card className="max-w-lg">
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <dt className="text-ink-500">Status</dt>
              <dd><Badge tone={m.status === 'ready' ? 'emerald' : m.status === 'failed' ? 'crimson' : 'gold'}>{m.status}</Badge></dd>
              <dt className="text-ink-500">File type</dt>
              <dd className="text-ink-900">{m.fileType.toUpperCase()}</dd>
              <dt className="text-ink-500">Pages</dt>
              <dd className="text-ink-900">{m.pages ?? '—'}</dd>
              <dt className="text-ink-500">Uploaded</dt>
              <dd className="text-ink-900">{new Date(m.uploadedAt).toLocaleDateString()}</dd>
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => navigate('/tutor')} disabled={m.status !== 'ready'}>
                Ask Lambert
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await documentService.deleteMaterial(m.id)
                    showToast('Material deleted', 'success')
                    navigate('/materials')
                  } catch {
                    showToast("Lambert AI couldn't delete this file. Please try again.", 'error')
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </AsyncView>
  )
}
