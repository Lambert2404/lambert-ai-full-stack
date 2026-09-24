import { useAsync } from '@/hooks/useAsync'
import { documentService } from '@/services/documentService'
import { AsyncView } from '@/components/ui/AsyncView'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'

export function TeacherMaterialsPage() {
  const materials = useAsync(() => documentService.listMaterials(), [])

  return (
    <div>
      <PageHeader
        title="My materials"
        description="Study materials you've published for your students."
        action={<Button size="sm">Add material</Button>}
      />
      <AsyncView
        status={materials.status}
        data={materials.data}
        errorMessage={materials.errorMessage}
        pendingEndpoint={materials.pendingEndpoint}
        onRetry={materials.reload}
        emptyTitle="You haven't published any materials yet"
      >
        {(items) => (
          <Table
            rowKey={(r) => r.id}
            rows={items}
            columns={[
              { key: 'name', header: 'Name', render: (r) => r.name },
              { key: 'type', header: 'Type', render: (r) => r.fileType.toUpperCase() },
              { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'ready' ? 'emerald' : 'gold'}>{r.status}</Badge> },
            ]}
          />
        )}
      </AsyncView>
    </div>
  )
}
