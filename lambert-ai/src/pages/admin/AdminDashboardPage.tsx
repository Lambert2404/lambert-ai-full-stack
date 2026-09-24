import { useAsync } from '@/hooks/useAsync'
import { adminService } from '@/services/adminService'
import { AsyncView } from '@/components/ui/AsyncView'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'

const metricLabels: { key: keyof import('@/types').AdminMetrics; label: string }[] = [
  { key: 'students', label: 'Students' },
  { key: 'activeUsers', label: 'Active users' },
  { key: 'aiRequests', label: 'AI requests' },
  { key: 'quizAttempts', label: 'Quiz attempts' },
  { key: 'documents', label: 'Documents' },
  { key: 'errorsLast24h', label: 'Errors (24h)' },
]

export function AdminDashboardPage() {
  const metrics = useAsync(() => adminService.getMetrics(), [], (d) => !d)

  return (
    <div>
      <PageHeader title="Admin overview" description="Platform-wide activity and health." />
      <AsyncView
        status={metrics.status}
        data={metrics.data}
        errorMessage={metrics.errorMessage}
        pendingEndpoint={metrics.pendingEndpoint}
        onRetry={metrics.reload}
        emptyTitle="No metrics available yet"
      >
        {(m) => (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {metricLabels.map((ml) => (
              <Card key={ml.key} className="p-4">
                <p className="text-xs font-medium text-ink-500">{ml.label}</p>
                <p className="mt-1 font-serif text-2xl font-semibold text-ink-950">{m[ml.key]}</p>
              </Card>
            ))}
          </div>
        )}
      </AsyncView>
    </div>
  )
}
