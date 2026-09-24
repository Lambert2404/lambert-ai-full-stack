import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Conversation } from '@/types'
import { useAsync } from '@/hooks/useAsync'
import { conversationService } from '@/services/conversationService'
import { AsyncView } from '@/components/ui/AsyncView'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Dropdown } from '@/components/ui/Dropdown'
import { Icon } from '@/components/layout/Logo'
import { cn } from '@/lib/cn'
import { useToast } from '@/contexts/ToastContext'

export function ConversationSidebar({
  activeId,
  onNewConversation,
  onClose,
}: {
  activeId?: string
  onNewConversation: () => void
  onClose?: () => void
}) {
  const [query, setQuery] = useState('')
  const { status, data, errorMessage, pendingEndpoint, reload } = useAsync(() => conversationService.list(), [])
  const navigate = useNavigate()
  const { showToast } = useToast()

  const filtered = (data ?? []).filter((c) => c.title.toLowerCase().includes(query.toLowerCase()))

  const handleAction = async (action: () => Promise<unknown>, successMessage: string) => {
    try {
      await action()
      showToast(successMessage, 'success')
      reload()
    } catch {
      showToast('Lambert AI could not complete that action. Please try again.', 'error')
    }
  }

  return (
    <div className="flex h-full w-full flex-col bg-paper-0">
      <div className="flex items-center justify-between gap-2 border-b border-ink-300/20 p-3">
        <Button size="sm" fullWidth onClick={onNewConversation} icon={<Icon path="M12 5v14M5 12h14" className="h-4 w-4" />}>
          New conversation
        </Button>
        {onClose && (
          <button aria-label="Close" onClick={onClose} className="shrink-0 rounded-md p-2 text-ink-500 hover:bg-paper-100 lg:hidden">
            <Icon path="M6 6l12 12M18 6 6 18" />
          </button>
        )}
      </div>
      <div className="border-b border-ink-300/20 p-3">
        <Input placeholder="Search conversations" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <AsyncView
          status={status}
          data={filtered}
          errorMessage={errorMessage}
          pendingEndpoint={pendingEndpoint}
          onRetry={reload}
          emptyTitle="No conversations yet"
          emptyDescription="Start a new conversation to see it here."
        >
          {(items) => (
            <ul className="flex flex-col gap-0.5">
              {items.map((c: Conversation) => (
                <li key={c.id} className="group relative">
                  <button
                    onClick={() => navigate(`/tutor/${c.id}`)}
                    className={cn(
                      'flex w-full flex-col gap-0.5 rounded-md px-3 py-2.5 pr-9 text-left text-sm',
                      activeId === c.id ? 'bg-paper-100' : 'hover:bg-paper-100'
                    )}
                  >
                    <span className="flex items-center gap-1.5 truncate font-medium text-ink-900">
                      {c.bookmarked && <Icon path="M6 2h12v20l-6-4-6 4z" className="h-3.5 w-3.5 shrink-0 text-gold-600" />}
                      <span className="truncate">{c.title}</span>
                    </span>
                    {c.lastMessagePreview && <span className="line-clamp-1 text-xs text-ink-500">{c.lastMessagePreview}</span>}
                  </button>
                  <div className="absolute right-1 top-1.5 opacity-0 group-hover:opacity-100">
                    <Dropdown
                      trigger={<Icon path="M12 6h.01M12 12h.01M12 18h.01" className="h-4 w-4 text-ink-500" />}
                      items={[
                        {
                          label: c.bookmarked ? 'Remove bookmark' : 'Bookmark',
                          onSelect: () => handleAction(() => conversationService.setBookmarked(c.id, !c.bookmarked), 'Updated'),
                        },
                        {
                          label: 'Rename',
                          onSelect: () => {
                            const title = window.prompt('Rename conversation', c.title)
                            if (title) handleAction(() => conversationService.rename(c.id, title), 'Renamed')
                          },
                        },
                        {
                          label: 'Delete',
                          destructive: true,
                          onSelect: () => handleAction(() => conversationService.remove(c.id), 'Deleted'),
                        },
                      ]}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AsyncView>
      </div>
    </div>
  )
}
