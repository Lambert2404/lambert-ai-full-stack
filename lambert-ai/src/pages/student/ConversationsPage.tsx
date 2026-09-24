import { Link } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { conversationService } from '@/services/conversationService'
import { AsyncView } from '@/components/ui/AsyncView'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { aiModes } from '@/pages/tutor/aiModeConfig'

export function ConversationsPage() {
  const conversations = useAsync(() => conversationService.list(), [])

  return (
    <div>
      <PageHeader
        title="Conversations"
        description="Every conversation you've had with Lambert AI."
        action={<Link to="/tutor"><Button size="sm">New conversation</Button></Link>}
      />
      <AsyncView
        status={conversations.status}
        data={conversations.data}
        errorMessage={conversations.errorMessage}
        pendingEndpoint={conversations.pendingEndpoint}
        onRetry={conversations.reload}
        emptyTitle="No conversations yet"
        emptyDescription="Ask Lambert AI a question to start your first conversation."
      >
        {(items) => (
          <div className="flex flex-col gap-2">
            {items.map((c) => (
              <Link key={c.id} to={`/tutor/${c.id}`}>
                <Card className="flex items-center justify-between gap-3 hover:border-ink-900/30">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-950">{c.title}</p>
                    {c.lastMessagePreview && <p className="truncate text-sm text-ink-500">{c.lastMessagePreview}</p>}
                  </div>
                  <Badge tone="neutral">{aiModes.find((m) => m.id === c.mode)?.label ?? c.mode}</Badge>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </AsyncView>
    </div>
  )
}
