import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '@/types'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/layout/Logo'

// react-markdown renders only the Markdown AST into React elements — no raw
// HTML plugin is registered, so AI output can never inject arbitrary HTML/JS.
export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[85%] sm:max-w-[75%]', isUser && 'flex flex-col items-end')}>
        <div
          className={cn(
            'rounded-lg px-4 py-3 text-sm leading-relaxed',
            isUser ? 'rounded-tr-sm bg-ink-900 text-white' : 'rounded-tl-sm border border-ink-300/25 bg-paper-0 text-ink-900'
          )}
        >
          {message.pending ? (
            <span className="flex items-center gap-1.5 text-ink-500">
              <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
            </span>
          ) : message.error ? (
            <span className="text-crimson-600">{message.error}</span>
          ) : (
            <div className="prose-chat">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {message.sources.map((s, i) => (
              <div key={i} className="flex items-start gap-1.5 rounded-md bg-paper-100 px-2.5 py-1.5 text-xs text-ink-500">
                <Icon path="M6 2h9l5 5v15H6z" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <span className="font-medium text-ink-700">{s.documentName}</span>
                  {s.pageNumber && ` · p.${s.pageNumber}`} — {s.snippet}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Dot({ delay = '0ms' }: { delay?: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-300"
      style={{ animationDelay: delay }}
    />
  )
}
