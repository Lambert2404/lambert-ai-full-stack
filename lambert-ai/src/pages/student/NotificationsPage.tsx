import { useAsync } from '@/hooks/useAsync'
import { notificationService } from '@/services/notificationService'
import { AsyncView } from '@/components/ui/AsyncView'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/contexts/ToastContext'
import type { NotificationType } from '@/types'

const typeTone: Record<NotificationType, 'gold' | 'emerald' | 'sky' | 'crimson' | 'neutral'> = {
  study_reminder: 'gold',
  quiz_result: 'emerald',
  study_plan: 'sky',
  new_material: 'sky',
  achievement: 'gold',
  system: 'neutral',
}

export function NotificationsPage() {
  const notifications = useAsync(() => notificationService.list(), [])
  const { showToast } = useToast()

  const markRead = async (id: string) => {
    try {
      await notificationService.markRead(id)
      notifications.reload()
    } catch {
      showToast("Lambert AI couldn't update that notification.", 'error')
    }
  }

  const archive = async (id: string) => {
    try {
      await notificationService.archive(id)
      notifications.reload()
    } catch {
      showToast("Lambert AI couldn't archive that notification.", 'error')
    }
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Study reminders, quiz results, and updates."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await notificationService.markAllRead()
                notifications.reload()
              } catch {
                showToast("Lambert AI couldn't mark all as read.", 'error')
              }
            }}
          >
            Mark all as read
          </Button>
        }
      />
      <AsyncView
        status={notifications.status}
        data={notifications.data?.filter((n) => !n.archived) ?? null}
        errorMessage={notifications.errorMessage}
        pendingEndpoint={notifications.pendingEndpoint}
        onRetry={notifications.reload}
        emptyTitle="You're all caught up"
      >
        {(items) => (
          <div className="flex flex-col gap-2">
            {items.map((n) => (
              <Card key={n.id} className={!n.read ? 'border-gold-500/40 bg-gold-100/30' : ''}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <Badge tone={typeTone[n.type]}>{n.type.replace('_', ' ')}</Badge>
                      {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-gold-600" aria-label="Unread" />}
                    </div>
                    <p className="text-sm font-medium text-ink-950">{n.title}</p>
                    <p className="text-sm text-ink-500">{n.body}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    {!n.read && (
                      <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>Mark read</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => archive(n.id)}>Archive</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AsyncView>
    </div>
  )
}
