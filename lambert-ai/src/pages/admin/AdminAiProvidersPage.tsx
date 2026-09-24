import { useAsync } from '@/hooks/useAsync'
import { adminService } from '@/services/adminService'
import { AsyncView } from '@/components/ui/AsyncView'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/contexts/ToastContext'
import { aiProviderLabels } from '@/pages/tutor/aiModeConfig'

const statusTone = { online: 'emerald', degraded: 'gold', offline: 'crimson' } as const

export function AdminAiProvidersPage() {
  const models = useAsync(() => adminService.listAiModels(), [])
  const { showToast } = useToast()

  const update = async (id: string, payload: Parameters<typeof adminService.updateAiModel>[1], label: string) => {
    try {
      await adminService.updateAiModel(id, payload)
      showToast(label, 'success')
      models.reload()
    } catch {
      showToast("Lambert AI couldn't update that provider. Please try again.", 'error')
    }
  }

  return (
    <div>
      <PageHeader
        title="AI Providers"
        description="Configure which AI providers power Lambert AI. API keys and credentials are managed on the backend and are never shown here."
      />
      <AsyncView
        status={models.status}
        data={models.data}
        errorMessage={models.errorMessage}
        pendingEndpoint={models.pendingEndpoint}
        onRetry={models.reload}
        emptyTitle="No AI providers configured yet"
      >
        {(items) => (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((m) => (
              <Card key={m.id}>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink-950">{aiProviderLabels[m.providerId]}</p>
                    <p className="text-xs text-ink-500">{m.modelName}</p>
                  </div>
                  <Badge tone={statusTone[m.status]}>{m.status}</Badge>
                </div>
                <dl className="mb-3 grid grid-cols-2 gap-y-1 text-xs text-ink-500">
                  <dt>Requests today</dt>
                  <dd className="text-right text-ink-900">{m.requestsToday ?? '—'}</dd>
                  <dt>Avg latency</dt>
                  <dd className="text-right text-ink-900">{m.avgLatencyMs ? `${m.avgLatencyMs}ms` : '—'}</dd>
                  <dt>Error rate</dt>
                  <dd className="text-right text-ink-900">{m.errorRatePercent !== undefined ? `${m.errorRatePercent}%` : '—'}</dd>
                </dl>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {m.isDefault && <Badge tone="gold">Default</Badge>}
                  {m.isFallback && <Badge tone="sky">Fallback</Badge>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => update(m.id, { status: m.status === 'offline' ? 'online' : 'offline' }, m.status === 'offline' ? 'Enabled' : 'Disabled')}
                  >
                    {m.status === 'offline' ? 'Enable' : 'Disable'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => update(m.id, { isDefault: true }, 'Set as default')} disabled={m.isDefault}>
                    Set default
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => update(m.id, { isFallback: true }, 'Set as fallback')} disabled={m.isFallback}>
                    Set fallback
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AsyncView>
    </div>
  )
}
