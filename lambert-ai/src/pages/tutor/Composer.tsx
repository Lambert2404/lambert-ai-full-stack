import { useRef, useState } from 'react'
import type { AiMode, AiProviderId } from '@/types'
import { aiModes, aiProviderLabels } from './aiModeConfig'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/layout/Logo'
import { cn } from '@/lib/cn'
import { useVoiceInput } from '@/hooks/useVoiceInput'

interface ComposerProps {
  mode: AiMode
  onModeChange: (m: AiMode) => void
  providerId: AiProviderId
  onProviderChange: (p: AiProviderId) => void
  availableProviders: AiProviderId[]
  onSend: (text: string) => void
  onAttach: (file: File) => void
  isGenerating: boolean
  onStop: () => void
}

export function Composer({
  mode,
  onModeChange,
  providerId,
  onProviderChange,
  availableProviders,
  onSend,
  onAttach,
  isGenerating,
  onStop,
}: ComposerProps) {
  const [text, setText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const voice = useVoiceInput({ onResult: (t) => setText((prev) => (prev ? `${prev} ${t}` : t)) })

  const handleSend = () => {
    if (!text.trim() || isGenerating) return
    onSend(text.trim())
    setText('')
  }

  return (
    <div className="border-t border-ink-300/25 bg-paper-0 px-3 py-3 sm:px-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <select
          value={mode}
          onChange={(e) => onModeChange(e.target.value as AiMode)}
          aria-label="AI mode"
          className="rounded-md border border-ink-300/40 bg-paper-0 px-2.5 py-1.5 text-xs font-medium text-ink-700"
        >
          {aiModes.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
        <select
          value={providerId}
          onChange={(e) => onProviderChange(e.target.value as AiProviderId)}
          aria-label="AI provider"
          className="rounded-md border border-ink-300/40 bg-paper-0 px-2.5 py-1.5 text-xs font-medium text-ink-700"
        >
          {availableProviders.map((p) => (
            <option key={p} value={p}>{aiProviderLabels[p]}</option>
          ))}
        </select>
        {voice.permissionDenied && (
          <span className="text-xs text-crimson-600">Microphone access was denied in your browser settings.</span>
        )}
      </div>

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onAttach(file)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          aria-label="Attach document"
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 rounded-md p-2.5 text-ink-500 hover:bg-paper-100"
        >
          <Icon path="M21 12.5 12.5 21a5 5 0 0 1-7-7L14 5.5a3.5 3.5 0 0 1 5 5L10.5 19a2 2 0 0 1-3-3L15 8.5" />
        </button>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          rows={1}
          placeholder="Ask Lambert anything…"
          aria-label="Message"
          className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-md border border-ink-300/40 bg-paper-0 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40"
        />

        <button
          type="button"
          aria-label={voice.isListening ? 'Stop listening' : 'Start voice input'}
          onClick={voice.toggle}
          className={cn(
            'shrink-0 rounded-md p-2.5 hover:bg-paper-100',
            voice.isListening ? 'text-crimson-600' : 'text-ink-500'
          )}
        >
          <Icon path="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zM19 11a7 7 0 0 1-14 0M12 18v3" />
        </button>

        {isGenerating ? (
          <Button variant="danger" onClick={onStop}>Stop</Button>
        ) : (
          <Button onClick={handleSend} disabled={!text.trim()}>Send</Button>
        )}
      </div>
      {voice.isListening && <p className="mt-1.5 text-xs text-crimson-600">Listening…</p>}
      {voice.isSpeaking && <p className="mt-1.5 text-xs text-sky-600">Speaking…</p>}
    </div>
  )
}
