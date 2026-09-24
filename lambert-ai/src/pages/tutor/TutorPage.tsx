import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { AiMode, AiProviderId, Message } from '@/types'
import { conversationService } from '@/services/conversationService'
import { isBackendPending } from '@/services/apiClient'
import { useAsync } from '@/hooks/useAsync'
import { AsyncView } from '@/components/ui/AsyncView'
import { ConversationSidebar } from './ConversationSidebar'
import { Composer } from './Composer'
import { MessageBubble } from './MessageBubble'
import { Icon, Logo } from '@/components/layout/Logo'
import { useToast } from '@/contexts/ToastContext'

const availableProviders: AiProviderId[] = ['lambert_auto', 'openai', 'microsoft', 'google_gemini', 'anthropic_claude', 'openrouter']

export function TutorPage() {
  const { conversationId } = useParams<{ conversationId?: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [mode, setMode] = useState<AiMode>('tutor')
  const [providerId, setProviderId] = useState<AiProviderId>('lambert_auto')
  const [messages, setMessages] = useState<Message[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [mobileListOpen, setMobileListOpen] = useState(false)

  const messagesAsync = useAsync(
    () => (conversationId ? conversationService.getMessages(conversationId) : Promise.resolve([])),
    [conversationId]
  )

  useEffect(() => {
    if (messagesAsync.status === 'success' || messagesAsync.status === 'empty') {
      setMessages(messagesAsync.data ?? [])
    }
  }, [messagesAsync.status, messagesAsync.data])

  const handleNewConversation = () => {
    navigate('/tutor')
    setMessages([])
  }

  const handleSend = async (text: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      conversationId: conversationId ?? 'draft',
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }
    const pendingMessage: Message = {
      id: crypto.randomUUID(),
      conversationId: conversationId ?? 'draft',
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      pending: true,
    }
    setMessages((prev) => [...prev, userMessage, pendingMessage])
    setIsGenerating(true)

    try {
      let activeConversationId = conversationId
      if (!activeConversationId) {
        const created = await conversationService.create(mode)
        activeConversationId = created.id
        navigate(`/tutor/${created.id}`, { replace: true })
      }
      const response = await conversationService.sendMessage({
        conversationId: activeConversationId,
        content: text,
        mode,
        providerId,
      })
      setMessages((prev) => prev.map((m) => (m.id === pendingMessage.id ? response : m)))
    } catch (err) {
      const message = isBackendPending(err)
        ? "This chat is ready to talk to the real Lambert AI backend — it just isn't connected in this preview yet."
        : (err as { message?: string })?.message ?? "Lambert AI couldn't process your request right now. Please try again."
      setMessages((prev) => prev.map((m) => (m.id === pendingMessage.id ? { ...m, pending: false, error: message } : m)))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAttach = async (file: File) => {
    showToast(`Attached ${file.name} — Lambert AI will read it once the document service is connected.`, 'info')
  }

  const handleStop = async () => {
    if (conversationId) await conversationService.stopGeneration(conversationId).catch(() => {})
    setIsGenerating(false)
  }

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100vh-4rem)] md:-mx-8 md:-my-8">
      {/* Desktop conversation list */}
      <div className="hidden w-72 shrink-0 border-r border-ink-300/20 lg:block">
        <ConversationSidebar activeId={conversationId} onNewConversation={handleNewConversation} />
      </div>

      {/* Mobile drawer */}
      {mobileListOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/50" onClick={() => setMobileListOpen(false)} aria-hidden="true" />
          <div className="relative z-10 h-full w-72">
            <ConversationSidebar
              activeId={conversationId}
              onNewConversation={() => {
                handleNewConversation()
                setMobileListOpen(false)
              }}
              onClose={() => setMobileListOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-ink-300/20 px-4 py-2.5 lg:hidden">
          <button aria-label="Conversations" onClick={() => setMobileListOpen(true)} className="rounded-md p-2 text-ink-700 hover:bg-paper-100">
            <Icon path="M4 4h16v11H7l-3 3z" />
          </button>
          <span className="text-sm font-medium text-ink-700">Conversations</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          {conversationId ? (
            <AsyncView
              status={messagesAsync.status}
              data={messages.length > 0 ? messages : messagesAsync.data}
              errorMessage={messagesAsync.errorMessage}
              pendingEndpoint={messagesAsync.pendingEndpoint}
              onRetry={messagesAsync.reload}
              emptyTitle="Say hello to start this conversation"
            >
              {() => (
                <div className="mx-auto flex max-w-3xl flex-col gap-4">
                  {messages.map((m) => (
                    <MessageBubble key={m.id} message={m} />
                  ))}
                </div>
              )}
            </AsyncView>
          ) : messages.length > 0 ? (
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <Logo withWordmark={false} className="scale-150" />
              <h2 className="text-xl">What would you like to learn today?</h2>
              <p className="max-w-sm text-sm text-ink-500">
                Ask a question, paste a problem, or attach a document — Lambert AI will meet you at your level.
              </p>
            </div>
          )}
        </div>

        <div className="mx-auto w-full max-w-3xl">
          <Composer
            mode={mode}
            onModeChange={setMode}
            providerId={providerId}
            onProviderChange={setProviderId}
            availableProviders={availableProviders}
            onSend={handleSend}
            onAttach={handleAttach}
            isGenerating={isGenerating}
            onStop={handleStop}
          />
        </div>
      </div>
    </div>
  )
}
