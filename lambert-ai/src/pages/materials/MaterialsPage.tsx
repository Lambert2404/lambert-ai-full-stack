import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { documentService } from '@/services/documentService'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { AsyncView } from '@/components/ui/AsyncView'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Icon } from '@/components/layout/Logo'
import { isBackendPending } from '@/services/apiClient'
import type { DocumentStatus, StudyMaterial } from '@/types'

const statusTone: Record<DocumentStatus, 'neutral' | 'gold' | 'emerald' | 'crimson'> = {
  uploading: 'gold',
  processing: 'gold',
  indexing: 'gold',
  ready: 'emerald',
  failed: 'crimson',
}

interface InFlightUpload {
  id: string
  fileName: string
  sizeBytes: number
  progress: number
  status: DocumentStatus
  errorMessage?: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MaterialsPage() {
  const materials = useAsync(() => documentService.listMaterials(), [])
  const [uploads, setUploads] = useState<InFlightUpload[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const startUpload = (file: File) => {
    const id = crypto.randomUUID()
    setUploads((prev) => [...prev, { id, fileName: file.name, sizeBytes: file.size, progress: 0, status: 'uploading' }])

    documentService
      .uploadMaterial(file, undefined, (pct) => {
        setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, progress: pct } : u)))
      })
      .then(() => {
        setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status: 'ready', progress: 100 } : u)))
        materials.reload()
      })
      .catch((err) => {
        const message = isBackendPending(err)
          ? "Upload is ready for the backend, but no server is connected in this preview yet."
          : "Lambert AI couldn't process this file. Please try again."
        setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status: 'failed', errorMessage: message } : u)))
      })
  }

  const retry = (upload: InFlightUpload) => {
    setUploads((prev) => prev.filter((u) => u.id !== upload.id))
    inputRef.current?.click()
  }

  return (
    <div>
      <PageHeader
        title="My Materials"
        description="Upload your notes and past coursework so Lambert AI can answer questions directly from them."
        action={
          <>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) startUpload(file)
                e.target.value = ''
              }}
            />
            <Button onClick={() => inputRef.current?.click()} icon={<Icon path="M12 16V4m0 0 4 4m-4-4-4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" className="h-4 w-4" />}>
              Upload material
            </Button>
          </>
        }
      />

      {uploads.length > 0 && (
        <div className="mb-6 flex flex-col gap-3">
          {uploads.map((u) => (
            <Card key={u.id}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-950">{u.fileName}</p>
                  <p className="text-xs text-ink-500">{formatSize(u.sizeBytes)}</p>
                </div>
                <Badge tone={statusTone[u.status]}>{u.status}</Badge>
              </div>
              {u.status === 'uploading' && <ProgressBar value={u.progress} showValue={false} />}
              {u.status === 'failed' && (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-sm text-crimson-600">{u.errorMessage}</p>
                  <Button size="sm" variant="outline" onClick={() => retry(u)}>Retry</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <AsyncView
        status={materials.status}
        data={materials.data}
        errorMessage={materials.errorMessage}
        pendingEndpoint={materials.pendingEndpoint}
        onRetry={materials.reload}
        emptyTitle="No materials yet"
        emptyDescription="Upload a PDF, Word document, or text file to get started."
      >
        {(items: StudyMaterial[]) => (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((m) => (
              <Link key={m.id} to={`/materials/${m.id}`}>
                <Card className="h-full hover:border-ink-900/30">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="line-clamp-2 font-medium text-ink-950">{m.name}</p>
                    <Badge tone={statusTone[m.status]}>{m.status}</Badge>
                  </div>
                  <p className="text-xs text-ink-500">
                    {m.fileType.toUpperCase()} · {formatSize(m.sizeBytes)}
                    {m.pages ? ` · ${m.pages} pages` : ''}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </AsyncView>
    </div>
  )
}
