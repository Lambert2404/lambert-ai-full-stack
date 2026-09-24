import { cn } from '@/lib/cn'

export type AlertTone = 'info' | 'success' | 'warning' | 'error'

const toneClasses: Record<AlertTone, string> = {
  info: 'bg-sky-100 border-sky-600/20 text-sky-600',
  success: 'bg-emerald-100 border-emerald-600/20 text-emerald-700',
  warning: 'bg-gold-100 border-gold-600/20 text-gold-600',
  error: 'bg-crimson-100 border-crimson-600/20 text-crimson-600',
}

interface AlertProps {
  tone?: AlertTone
  title: string
  description?: string
  action?: React.ReactNode
}

export function Alert({ tone = 'info', title, description, action }: AlertProps) {
  return (
    <div role="alert" className={cn('rounded-md border px-4 py-3', toneClasses[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {description && <p className="mt-0.5 text-sm opacity-90">{description}</p>}
        </div>
        {action}
      </div>
    </div>
  )
}
