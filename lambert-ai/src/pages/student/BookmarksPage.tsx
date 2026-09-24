import { Link } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { conversationService } from '@/services/conversationService'
import { AsyncView } from '@/components/ui/AsyncView'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/layout/Logo'

export function BookmarksPage() {
  const conversations = useAsync(() => conversationService.list(), [], (d) => d.filter((c) => c.bookmarked).length === 0)

  return (
    <div>
      <PageHeader title="Bookmarks" description="Conversations you've saved for later." />
      <AsyncView
        status={conversations.status}
        data={conversations.data?.filter((c) => c.bookmarked) ?? null}
        errorMessage={conversations.errorMessage}
        pendingEndpoint={conversations.pendingEndpoint}
        onRetry={conversations.reload}
        emptyTitle="No bookmarks yet"
        emptyDescription="Bookmark a conversation from the AI Tutor to find it here."
      >
        {(items) => (
          <div className="flex flex-col gap-3">
            {items.map((c) => (
              <Link key={c.id} to={`/tutor/${c.id}`}>
                <Card className="flex items-center gap-3 hover:border-ink-900/30">
                  <Icon path="M6 2h12v20l-6-4-6 4z" className="h-4 w-4 shrink-0 text-gold-600" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-950">{c.title}</p>
                    {c.lastMessagePreview && <p className="truncate text-sm text-ink-500">{c.lastMessagePreview}</p>}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </AsyncView>
    </div>
  )
}
