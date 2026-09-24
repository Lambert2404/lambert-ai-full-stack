import { createContext, useCallback, useContext, useState } from 'react'
import { cn } from '@/lib/cn'
import type { AlertTone } from '@/components/ui/Alert'

interface Toast {
  id: string
  tone: AlertTone
  message: string
}

interface ToastContextValue {
  showToast: (message: string, tone?: AlertTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, tone: AlertTone = 'info') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, tone }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'rounded-md border px-4 py-3 text-sm shadow-lg',
              t.tone === 'error' && 'bg-crimson-600 text-white border-crimson-600',
              t.tone === 'success' && 'bg-emerald-700 text-white border-emerald-700',
              t.tone === 'warning' && 'bg-gold-500 text-ink-950 border-gold-500',
              t.tone === 'info' && 'bg-ink-950 text-white border-ink-950'
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
