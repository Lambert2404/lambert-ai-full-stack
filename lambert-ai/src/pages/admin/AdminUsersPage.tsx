import { useAsync } from '@/hooks/useAsync'
import { adminService } from '@/services/adminService'
import { AsyncView } from '@/components/ui/AsyncView'
import { PageHeader } from '@/components/layout/PageHeader'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'

const roleTone = { student: 'neutral', teacher: 'sky', admin: 'gold' } as const

export function AdminUsersPage() {
  const users = useAsync(() => adminService.listUsers(), [])

  return (
    <div>
      <PageHeader title="Users" description="Everyone with an account on Lambert AI." />
      <AsyncView
        status={users.status}
        data={users.data}
        errorMessage={users.errorMessage}
        pendingEndpoint={users.pendingEndpoint}
        onRetry={users.reload}
        emptyTitle="No users found"
      >
        {(items) => (
          <Table
            rowKey={(r) => r.id}
            rows={items}
            columns={[
              { key: 'name', header: 'Name', render: (r) => r.name },
              { key: 'email', header: 'Email', render: (r) => r.email, hideOnMobile: true },
              { key: 'role', header: 'Role', render: (r) => <Badge tone={roleTone[r.role]}>{r.role}</Badge> },
              { key: 'joined', header: 'Joined', render: (r) => new Date(r.createdAt).toLocaleDateString() },
            ]}
          />
        )}
      </AsyncView>
    </div>
  )
}
