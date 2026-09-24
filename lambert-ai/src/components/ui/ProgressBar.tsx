import { cn } from '@/lib/cn'

interface ProgressBarProps {
  value: number // 0-100
  label?: string
  tone?: 'ink' | 'gold' | 'emerald'
  showValue?: boolean
  className?: string
}

const toneClasses = {
  ink: 'bg-ink-900',
  gold: 'bg-gold-500',
  emerald: 'bg-emerald-600',
}

export function ProgressBar({ value, label, tone = 'ink', showValue = true, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          {label && <span className="text-ink-700">{label}</span>}
          {showValue && <span className="font-medium text-ink-900">{Math.round(clamped)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-paper-100"
      >
        <div
          className={cn('h-full rounded-full transition-all duration-300', toneClasses[tone])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
